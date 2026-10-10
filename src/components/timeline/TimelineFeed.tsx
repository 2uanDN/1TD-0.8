import React, { useMemo } from 'react';
import { Event } from '../../types';
import { TimelineItem } from './TimelineItem';

export interface TimelineFeedProps {
  events: Event[];
  isLoading?: boolean;
  onUndo: (event: Event) => void;
  onSelectEvent?: (event: Event) => void;
}

/**
 * Computes a compact monospace elapsed interval string (e.g. "+24M" or "+2H")
 * relative to the immediately preceding chronological event in the same day.
 */
function formatElapsedDelta(
  currentIso: string,
  previousChronologicalIso?: string
): string | null {
  if (!previousChronologicalIso) {
    return null;
  }

  const currentMs = new Date(currentIso).getTime();
  const prevMs = new Date(previousChronologicalIso).getTime();
  if (Number.isNaN(currentMs) || Number.isNaN(prevMs)) {
    return null;
  }

  const diffMinutes = Math.round((currentMs - prevMs) / 60000);
  if (diffMinutes <= 0) {
    return null;
  }
  if (diffMinutes < 60) {
    return `+${diffMinutes}P`;
  }

  const hours = Math.floor(diffMinutes / 60);
  const mins = diffMinutes % 60;
  return mins > 0 ? `+${hours}G${mins}P` : `+${hours}G`;
}

/**
 * SPEC.md § IX & BLUEPRINT.md § III.1 — TimelineFeed:
 * Renders today's logged events ordered newest-first against a hairline temporal rail,
 * or an editorial empty state when no events have been logged yet.
 */
export const TimelineFeed: React.FC<TimelineFeedProps> = ({
  events,
  isLoading = false,
  onUndo,
  onSelectEvent,
}) => {
  const orderedEvents = useMemo(() => {
    return [...events].sort((a, b) => {
      const diff =
        new Date(b.occurred_at).getTime() - new Date(a.occurred_at).getTime();
      if (!Number.isNaN(diff) && diff !== 0) {
        return diff;
      }
      return b.occurred_at.localeCompare(a.occurred_at);
    });
  }, [events]);

  if (isLoading && orderedEvents.length === 0) {
    return (
      <div className="timeline-empty" role="status" aria-live="polite">
        <span className="type-mono-label text-secondary">ĐANG ĐỒNG BỘ BỘ NHỚ CỤC BỘ...</span>
        <p className="type-editorial-italic text-muted">
          Đang tải dòng thời gian trong ngày từ thiết bị.
        </p>
      </div>
    );
  }

  if (orderedEvents.length === 0) {
    return (
      <div className="timeline-empty" role="status">
        <div className="timeline-empty-header">
          <span className="type-mono-badge text-secondary">00 BẢN GHI HÔM NAY</span>
          <span className="type-mono-label text-muted">SẴN SÀNG GHI NHẬN</span>
        </div>
        <p className="type-editorial-italic text-muted">
          Chưa có hoạt động nào được ghi nhận trong hôm nay. Chạm một ô hành động phía trên để lưu ngay vào dòng thời gian.
        </p>
      </div>
    );
  }

  return (
    <div
      className="timeline-feed"
      role="list"
      aria-label="Danh sách hoạt động đã ghi nhận hôm nay (mới nhất trước)"
    >
      {orderedEvents.map((event, index) => {
        const olderEvent = orderedEvents[index + 1];
        const elapsedText = formatElapsedDelta(
          event.occurred_at,
          olderEvent?.occurred_at
        );

        return (
          <TimelineItem
            key={event.id}
            event={event}
            elapsedText={elapsedText}
            onUndo={onUndo}
            onSelect={onSelectEvent}
          />
        );
      })}
    </div>
  );
};

export default TimelineFeed;
