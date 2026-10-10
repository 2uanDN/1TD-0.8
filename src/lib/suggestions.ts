import { format, isValid, parseISO, subDays } from 'date-fns';
import { Action, Event, SuggestionWeights } from '../types';
import { getTimeBracket } from './time';

export const TOP_SUGGESTIONS_COUNT = 5;
export const COLD_START_MIN_EVENTS = 3;
export const RECENT_WINDOW_DAYS = 7;
const MAX_SEQUENCE_GAP_MINUTES = 360;

export interface SuggestionWeightMetaItem {
  key: keyof SuggestionWeights;
  code: string;
  label: string;
}

export const SUGGESTION_WEIGHT_META: SuggestionWeightMetaItem[] = [
  { key: 'w1', code: 'w1 · H(a, t)', label: 'Tần suất cùng khung 2 giờ' },
  { key: 'w2', code: 'w2 · D(a, t)', label: 'Tần suất cùng thứ trong tuần' },
  { key: 'w3', code: 'w3 · P(a)', label: 'Ưu tiên hành động đã ghim' },
  { key: 'w4', code: 'w4 · R(a, t)', label: 'Độ gần đây kể từ lần ghi cuối' },
];

export interface ScoredActionBreakdown {
  action: Action;
  score: number;
  hScore: number;
  dScore: number;
  pScore: number;
  rScore: number;
  isColdStart: boolean;
}

export interface ActionSequenceSuggestion {
  fromActionId: string;
  fromActionName: string;
  toAction: Action;
  count: number;
  probability: number;
  avgDelayMinutes: number;
}

export interface ActionHabitInsight {
  action: Action;
  totalCount: number;
  weeklyCount: number;
  typicalTimeHHmm: string;
  peakBracket: number;
  lastOccurredAt: string | null;
}

export interface TimeBracketStat {
  bracket: number;
  label: string;
  count: number;
  share: number;
  topActionName: string | null;
}

function parseEventDate(iso: string): Date | null {
  const parsed = parseISO(iso);
  if (isValid(parsed)) {
    return parsed;
  }
  const fallback = new Date(iso);
  return isValid(fallback) ? fallback : null;
}

function filterEventsInSevenDayWindow(events: Event[], now: Date): Event[] {
  const lowerBoundMs = subDays(now, RECENT_WINDOW_DAYS).getTime();
  return events.filter((event) => {
    const date = parseEventDate(event.occurred_at);
    return date !== null && date.getTime() >= lowerBoundMs;
  });
}

export function sortColdStartActions(activeActions: Action[]): Action[] {
  return [...activeActions].sort((a, b) => {
    if (a.is_pinned !== b.is_pinned) {
      return a.is_pinned ? -1 : 1;
    }
    return a.sort_order - b.sort_order;
  });
}

export function isColdStartEvents(events: Event[], now: Date = new Date()): boolean {
  return filterEventsInSevenDayWindow(events, now).length < COLD_START_MIN_EVENTS;
}

/**
 * Computes full S(a, t) breakdown for all active actions (SPEC.md § VIII.1).
 * In cold-start mode (< 3 events in last 7 days), skips scoring and orders by
 * pinned status then sort_order (DECISIONS.md #13).
 */
export function scoreActionsWithBreakdown(
  actions: Action[],
  events: Event[],
  weights: SuggestionWeights,
  now: Date = new Date()
): ScoredActionBreakdown[] {
  const activeActions = actions.filter((action) => action.archived_at === null);
  const recentEvents = filterEventsInSevenDayWindow(events, now);

  if (recentEvents.length < COLD_START_MIN_EVENTS) {
    return sortColdStartActions(activeActions).map((action) => ({
      action,
      score: 0,
      hScore: 0,
      dScore: 0,
      pScore: action.is_pinned ? 1 : 0,
      rScore: 0,
      isColdStart: true,
    }));
  }

  const targetBracket = getTimeBracket(now);
  const targetWeekday = now.getDay();

  const totalInBracket = recentEvents.filter(
    (event) => getTimeBracket(event.occurred_at) === targetBracket
  ).length;

  const totalOnWeekday = recentEvents.filter((event) => {
    const date = parseEventDate(event.occurred_at);
    return date !== null && date.getDay() === targetWeekday;
  }).length;

  return activeActions
    .map((action) => {
      const actionEvents = recentEvents.filter((event) => event.action_id === action.id);

      const countInBracket = actionEvents.filter(
        (event) => getTimeBracket(event.occurred_at) === targetBracket
      ).length;
      const hScore = totalInBracket > 0 ? countInBracket / totalInBracket : 0;

      const countOnWeekday = actionEvents.filter((event) => {
        const date = parseEventDate(event.occurred_at);
        return date !== null && date.getDay() === targetWeekday;
      }).length;
      const dScore = totalOnWeekday > 0 ? countOnWeekday / totalOnWeekday : 0;

      const pScore = action.is_pinned ? 1 : 0;

      let rScore = 0;
      if (actionEvents.length > 0) {
        const latestMs = actionEvents.reduce((maxMs, event) => {
          const date = parseEventDate(event.occurred_at);
          const ms = date ? date.getTime() : 0;
          return ms > maxMs ? ms : maxMs;
        }, 0);
        if (latestMs > 0) {
          const hoursSinceLastLog = Math.max(0, (now.getTime() - latestMs) / 3_600_000);
          rScore = 1 / (1 + hoursSinceLastLog);
        }
      }

      const score =
        weights.w1 * hScore +
        weights.w2 * dScore +
        weights.w3 * pScore +
        weights.w4 * rScore;

      return {
        action,
        score,
        hScore,
        dScore,
        pScore,
        rScore,
        isColdStart: false,
      };
    })
    .sort((a, b) => {
      if (Math.abs(b.score - a.score) > 1e-6) {
        return b.score - a.score;
      }
      if (a.action.is_pinned !== b.action.is_pinned) {
        return a.action.is_pinned ? -1 : 1;
      }
      return a.action.sort_order - b.action.sort_order;
    });
}

/**
 * Pure suggestion scoring function per SPEC.md § VIII.1:
 * S(a, t) = w1 * H(a, t) + w2 * D(a, t) + w3 * P(a) + w4 * R(a, t)
 */
export function scoreSuggestions(
  actions: Action[],
  events: Event[],
  weights: SuggestionWeights,
  now: Date = new Date(),
  topN: number = TOP_SUGGESTIONS_COUNT
): Action[] {
  return scoreActionsWithBreakdown(actions, events, weights, now)
    .slice(0, topN)
    .map((entry) => entry.action);
}

/**
 * Level 3 (BLUEPRINT.md § III.5): Computes consecutive same-day action transition pairs
 * (e.g., "Ngủ dậy" -> "Ăn sáng") from logged history.
 */
export function computeNextActionSequences(
  actions: Action[],
  allEvents: Event[],
  lastActionId: string | null = null,
  limit = 4
): ActionSequenceSuggestion[] {
  const activeById = new Map<string, Action>();
  for (const action of actions) {
    if (action.archived_at === null) {
      activeById.set(action.id, action);
    }
  }

  const eventsByDay = new Map<string, Array<{ event: Event; ms: number }>>();
  for (const event of allEvents) {
    const date = parseEventDate(event.occurred_at);
    if (!date) continue;
    const dayKey = format(date, 'yyyy-MM-dd');
    const bucket = eventsByDay.get(dayKey) ?? [];
    bucket.push({ event, ms: date.getTime() });
    eventsByDay.set(dayKey, bucket);
  }

  interface PairAccumulator {
    fromActionId: string;
    fromActionName: string;
    toAction: Action;
    count: number;
    totalDelayMinutes: number;
  }

  const pairMap = new Map<string, PairAccumulator>();
  const outgoingTotals = new Map<string, number>();

  eventsByDay.forEach((dayEntries) => {
    const chronological = [...dayEntries].sort((a, b) => a.ms - b.ms);
    for (let i = 0; i < chronological.length - 1; i += 1) {
      const current = chronological[i];
      const next = chronological[i + 1];
      if (current.event.action_id === next.event.action_id) continue;

      const delayMinutes = (next.ms - current.ms) / 60_000;
      if (delayMinutes < 0 || delayMinutes > MAX_SEQUENCE_GAP_MINUTES) continue;

      const targetAction = activeById.get(next.event.action_id);
      if (!targetAction) continue;

      const fromId = current.event.action_id;
      const fromAction = activeById.get(fromId);
      const fromName = fromAction?.name ?? current.event.action_name_snapshot;

      outgoingTotals.set(fromId, (outgoingTotals.get(fromId) ?? 0) + 1);

      const pairKey = `${fromId}::${targetAction.id}`;
      const existing = pairMap.get(pairKey);
      if (existing) {
        existing.count += 1;
        existing.totalDelayMinutes += delayMinutes;
      } else {
        pairMap.set(pairKey, {
          fromActionId: fromId,
          fromActionName: fromName,
          toAction: targetAction,
          count: 1,
          totalDelayMinutes: delayMinutes,
        });
      }
    }
  });

  return Array.from(pairMap.values())
    .map((item) => {
      const totalOut = outgoingTotals.get(item.fromActionId) ?? item.count;
      return {
        fromActionId: item.fromActionId,
        fromActionName: item.fromActionName,
        toAction: item.toAction,
        count: item.count,
        probability: totalOut > 0 ? item.count / totalOut : 0,
        avgDelayMinutes: Math.max(1, Math.round(item.totalDelayMinutes / item.count)),
      };
    })
    .sort((a, b) => {
      if (lastActionId) {
        const aMatchesLast = a.fromActionId === lastActionId;
        const bMatchesLast = b.fromActionId === lastActionId;
        if (aMatchesLast !== bMatchesLast) {
          return aMatchesLast ? -1 : 1;
        }
      }
      if (b.count !== a.count) {
        return b.count - a.count;
      }
      return b.probability - a.probability;
    })
    .slice(0, limit);
}

function computeTypicalTimeHHmm(dates: Date[]): string {
  if (dates.length === 0) return '--:--';
  let sinSum = 0;
  let cosSum = 0;
  for (const date of dates) {
    const minutesOfDay = date.getHours() * 60 + date.getMinutes();
    const angle = (minutesOfDay / 1440) * 2 * Math.PI;
    sinSum += Math.sin(angle);
    cosSum += Math.cos(angle);
  }
  let meanAngle = Math.atan2(sinSum / dates.length, cosSum / dates.length);
  if (meanAngle < 0) {
    meanAngle += 2 * Math.PI;
  }
  const rawMinutes = Math.round((meanAngle / (2 * Math.PI)) * 1440);
  const roundedMinutes = (Math.round(rawMinutes / 5) * 5) % 1440;
  const hours = String(Math.floor(roundedMinutes / 60)).padStart(2, '0');
  const mins = String(roundedMinutes % 60).padStart(2, '0');
  return `${hours}:${mins}`;
}

/**
 * Computes factual habit rhythm insights per logged action (BLUEPRINT.md § III.5 & Principle C).
 * Only returns actions that have been logged at least once — never fabricates missing data.
 */
export function computeHabitInsights(
  actions: Action[],
  allEvents: Event[],
  now: Date = new Date()
): ActionHabitInsight[] {
  const sevenDaysAgoMs = subDays(now, RECENT_WINDOW_DAYS).getTime();
  const activeActions = actions.filter((action) => action.archived_at === null);

  const insights: ActionHabitInsight[] = [];

  for (const action of activeActions) {
    const actionEvents = allEvents.filter((event) => event.action_id === action.id);
    if (actionEvents.length === 0) continue;

    const validDates: Date[] = [];
    const bracketCounts = new Array<number>(12).fill(0);
    let weeklyCount = 0;
    let latestMs = 0;
    let lastOccurredAt: string | null = null;

    for (const event of actionEvents) {
      const date = parseEventDate(event.occurred_at);
      if (!date) continue;
      validDates.push(date);
      const ms = date.getTime();
      if (ms >= sevenDaysAgoMs) {
        weeklyCount += 1;
      }
      if (ms > latestMs) {
        latestMs = ms;
        lastOccurredAt = event.occurred_at;
      }
      const bracket = Math.floor(date.getHours() / 2);
      if (bracket >= 0 && bracket < 12) {
        bracketCounts[bracket] += 1;
      }
    }

    let peakBracket = 0;
    for (let b = 1; b < 12; b += 1) {
      if (bracketCounts[b] > bracketCounts[peakBracket]) {
        peakBracket = b;
      }
    }

    insights.push({
      action,
      totalCount: actionEvents.length,
      weeklyCount,
      typicalTimeHHmm: computeTypicalTimeHHmm(validDates),
      peakBracket,
      lastOccurredAt,
    });
  }

  return insights.sort((a, b) => {
    if (b.weeklyCount !== a.weeklyCount) {
      return b.weeklyCount - a.weeklyCount;
    }
    return b.totalCount - a.totalCount;
  });
}

export function formatBracketRange(bracket: number): string {
  const safeBracket = Math.max(0, Math.min(11, Math.floor(bracket)));
  const start = String(safeBracket * 2).padStart(2, '0');
  const end = String(safeBracket * 2 + 2).padStart(2, '0');
  return `${start}:00–${end}:00`;
}

/**
 * Computes activity distribution across the 12 2-hour brackets (B0..B11).
 */
export function computeTimeBracketDistribution(events: Event[]): TimeBracketStat[] {
  const counts = new Array<number>(12).fill(0);
  const actionNamesPerBracket: Array<Map<string, number>> = Array.from(
    { length: 12 },
    () => new Map<string, number>()
  );

  for (const event of events) {
    const bracket = getTimeBracket(event.occurred_at);
    if (bracket >= 0 && bracket < 12) {
      counts[bracket] += 1;
      const nameMap = actionNamesPerBracket[bracket];
      nameMap.set(
        event.action_name_snapshot,
        (nameMap.get(event.action_name_snapshot) ?? 0) + 1
      );
    }
  }

  const total = events.length;

  return counts.map((count, bracket) => {
    let topActionName: string | null = null;
    let topActionCount = 0;
    actionNamesPerBracket[bracket].forEach((actionCount, name) => {
      if (actionCount > topActionCount) {
        topActionCount = actionCount;
        topActionName = name;
      }
    });

    return {
      bracket,
      label: formatBracketRange(bracket),
      count,
      share: total > 0 ? count / total : 0,
      topActionName,
    };
  });
}
