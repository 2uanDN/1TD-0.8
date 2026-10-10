import { endOfDay as dfnsEndOfDay } from 'date-fns/endOfDay';
import { format } from 'date-fns/format';
import { isValid } from 'date-fns/isValid';
import { parseISO } from 'date-fns/parseISO';
import { startOfDay as dfnsStartOfDay } from 'date-fns/startOfDay';
import { vi } from 'date-fns/locale/vi';

function toDateInstance(dateOrIso: Date | string): Date {
  if (dateOrIso instanceof Date) {
    return dateOrIso;
  }
  const parsed = parseISO(dateOrIso);
  if (isValid(parsed)) {
    return parsed;
  }
  return new Date(dateOrIso);
}

/**
 * Formats a Date or ISO timestamp into 24-hour monospace time `HH:mm` (e.g. "14:02").
 */
export function formatTime(dateOrIso: Date | string = new Date()): string {
  const date = toDateInstance(dateOrIso);
  if (!isValid(date)) {
    return '--:--';
  }
  return format(date, 'HH:mm');
}

/**
 * Formats a Date or ISO timestamp into a localized Vietnamese date string
 * (default: "EEEE, dd/MM", e.g. "Thứ Sáu, 09/10").
 */
export function formatDate(
  dateOrIso: Date | string = new Date(),
  pattern = 'EEEE, dd/MM'
): string {
  const date = toDateInstance(dateOrIso);
  if (!isValid(date)) {
    return '';
  }
  return format(date, pattern, { locale: vi });
}

/**
 * Returns the 2-hour time-of-day bracket (0..11) for suggestion scoring (SPEC.md § VIII.1).
 * Bracket = Math.floor(hour / 2).
 */
export function getTimeBracket(dateOrIso: Date | string = new Date()): number {
  const date = toDateInstance(dateOrIso);
  if (!isValid(date)) {
    return 0;
  }
  return Math.floor(date.getHours() / 2);
}

/**
 * Returns the current device IANA timezone identifier (e.g. "Asia/Ho_Chi_Minh").
 */
export function getTimezone(): string {
  try {
    if (typeof Intl !== 'undefined' && typeof Intl.DateTimeFormat === 'function') {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      if (tz && tz.trim().length > 0) {
        return tz;
      }
    }
  } catch (error: unknown) {
    console.warn('[1TD][Time] Failed to resolve IANA timezone:', error);
  }
  return 'UTC';
}

/**
 * Thin wrapper over date-fns `startOfDay`.
 */
export function startOfDay(dateOrIso: Date | string = new Date()): Date {
  return dfnsStartOfDay(toDateInstance(dateOrIso));
}

/**
 * Thin wrapper over date-fns `endOfDay`.
 */
export function endOfDay(dateOrIso: Date | string = new Date()): Date {
  return dfnsEndOfDay(toDateInstance(dateOrIso));
}

/**
 * Formats a Date as an ISO 8601 timestamp with local timezone offset (SPEC.md § III.2),
 * e.g. "2026-10-09T14:23:00+07:00".
 */
export function formatLocalIsoOffset(dateOrIso: Date | string = new Date()): string {
  const date = toDateInstance(dateOrIso);
  if (!isValid(date)) {
    return new Date().toISOString();
  }
  return format(date, "yyyy-MM-dd'T'HH:mm:ssxxx");
}

/**
 * Applies a 24-hour `HH:mm` time string to an existing ISO timestamp while preserving its calendar date.
 * Returns an ISO 8601 timestamp with local timezone offset (SPEC.md § III.2).
 */
export function applyTimeInputToIso(baseIso: string, timeHHmm: string): string {
  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(timeHHmm.trim());
  if (!match) {
    return baseIso;
  }

  const baseDate = toDateInstance(baseIso);
  const targetDate = isValid(baseDate) ? new Date(baseDate.getTime()) : new Date();
  const hours = Number.parseInt(match[1], 10);
  const minutes = Number.parseInt(match[2], 10);

  targetDate.setHours(hours, minutes);
  return formatLocalIsoOffset(targetDate);
}

/**
 * Shifts an ISO timestamp by a signed number of minutes and returns a local-offset ISO 8601 string.
 */
export function shiftIsoByMinutes(baseIso: string, deltaMinutes: number): string {
  const baseDate = toDateInstance(baseIso);
  const validDate = isValid(baseDate) ? baseDate : new Date();
  const shifted = new Date(validDate.getTime() + deltaMinutes * 60000);
  return formatLocalIsoOffset(shifted);
}

