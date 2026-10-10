import React, { useMemo, useState } from 'react';
import { Pencil, Trash2 } from 'lucide-react';
import { formatDate, formatTime } from '../../lib/time';
import { Event } from '../../types';
import { getAccentClassName, getAccentStyle } from '../shared/ActionIcon';
import { Badge } from '../shared/Badge';
import { Timestamp } from '../shared/Timestamp';

export interface HistoryDayGroup {
  dateKey: string;
  dateLabel: string;
  isToday: boolean;
  events: Event[];
}

export interface HistoryListProps {
  events: Event[];
  isLoading?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
  onEditEvent: (event: Event) => void;
  onDeleteEvent: (event: Event) => Promise<void> | void;
  onGoToday?: () => void;
}

export function groupEventsByDay(events: Event[]): HistoryDayGroup[] {
  const todayKey = formatDate(new Date(), 'yyyy-MM-dd');
  const grouped = new Map<string, Event[]>();

  for (const item of events) {
    const key = formatDate(item.occurred_at, 'yyyy-MM-dd') || 'unknown';
    const bucket = grouped.get(key);
    if (bucket) {
      bucket.push(item);
    } else {
      grouped.set(key, [item]);
    }
  }

  return Array.from(grouped.entries())
    .sort(([keyA], [keyB]) => keyB.localeCompare(keyA))
    .map(([dateKey, groupEvents]) => {
      const sampleIso = groupEvents[0]?.occurred_at ?? new Date().toISOString();
      return {
        dateKey,
        dateLabel: formatDate(sampleIso, 'EEEE, dd/MM/yyyy'),
        isToday: dateKey === todayKey,
        events: groupEvents,
      };
    });
}

/**
 * SPEC.md § IX & BLUEPRINT.md § III.4 — Events grouped by calendar date (newest date first),
 * with per-event "Sửa" (time/note via EventDetailDrawer) and confirmed "Xóa".
 */
export const HistoryList: React.FC<HistoryListProps> = ({
  events,
  isLoading = false,
  emptyTitle = 'CHƯA CÓ BẢN GHI LỊCH SỬ',
  emptyDescription = 'Chưa có bản ghi lịch sử nào trong cơ sở dữ liệu thiết bị. Quay về Hôm nay để ghi nhận một chạm.',
  onEditEvent,
  onDeleteEvent,
  onGoToday,
}) => {
  const [confirmingDeleteId, setConfirmingDeleteId] = useState<string | null>(null);
  const dayGroups = useMemo(() => groupEventsByDay(events), [events]);

  const handleConfirmDelete = async (event: Event) => {
    setConfirmingDeleteId(null);
    await onDeleteEvent(event);
  };

  if (isLoading) {
    return (
      <div className="timeline-empty" role="status" aria-live="polite">
        <span className="type-mono-label text-muted">ĐANG TẢI NHẬT KÝ TỪ INDEXEDDB...</span>
      </div>
    );
  }

  if (dayGroups.length === 0) {
    return (
      <div className="timeline-empty" role="status">
        <div className="timeline-empty-header">
          <span className="type-mono-badge text-secondary">{emptyTitle}</span>
          <span className="type-mono-label text-muted">0 BẢN GHI</span>
        </div>
        <p className="type-editorial-italic text-muted">{emptyDescription}</p>
        {onGoToday && (
          <div>
            <button type="button" className="shell-cta-btn" aria-label="Quay về màn hình Hôm nay để ghi nhận" onClick={onGoToday}>
              Về Hôm nay
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="library-toolbar" role="region" aria-label="Danh sách sự kiện theo ngày">
      {dayGroups.map((group) => (
        <section key={group.dateKey} className="view-section" aria-labelledby={`history-day-${group.dateKey}`}>
          <div className="view-section-header">
            <h3 id={`history-day-${group.dateKey}`} className="type-headline-sm">
              {group.isToday ? `Hôm nay — ${group.dateLabel}` : group.dateLabel}
            </h3>
            <span className="type-mono-badge text-acid">{group.events.length} BẢN GHI</span>
          </div>

          <div className="timeline-feed" role="list" aria-label={`Sự kiện ngày ${group.dateLabel}`}>
            {group.events.map((event) => {
              const accentClass = getAccentClassName(event.action_color_snapshot);
              const accentStyle = getAccentStyle(event.action_color_snapshot);
              const timeLabel = formatTime(event.occurred_at);
              const shortDate = formatDate(event.occurred_at, 'dd/MM/yyyy');
              const isConfirming = confirmingDeleteId === event.id;

              return (
                <div key={event.id} role="listitem" className={`timeline-item ${accentClass}`} style={accentStyle}>
                  <div className="timeline-item-primary">
                    <button
                      type="button"
                      className="timeline-item-trigger"
                      aria-label={`Sửa chi tiết ${event.action_name_snapshot} ngày ${shortDate} lúc ${timeLabel}`}
                      onClick={() => onEditEvent(event)}
                    >
                      <div className="timeline-item-badges">
                        <Badge label={shortDate} color={event.action_color_snapshot} iconName={event.action_icon_snapshot} iconSize={15} />
                      </div>
                      <div className="timeline-item-copy">
                        <span className="timeline-item-title">{event.action_name_snapshot}</span>
                        {event.note ? <p className="type-editorial-italic text-muted timeline-item-note">{event.note}</p> : null}
                      </div>
                    </button>
                  </div>

                  <div className="timeline-item-meta">
                    <Timestamp isoString={event.occurred_at} variant="metric" highlight />

                    {isConfirming ? (
                      <div className="event-delete-actions" role="group" aria-label="Xác nhận xóa bản ghi">
                        <button
                          type="button"
                          className="action-card-btn action-card-btn--danger"
                          aria-label={`Xác nhận xóa ${event.action_name_snapshot} lúc ${timeLabel}`}
                          onClick={() => void handleConfirmDelete(event)}
                        >
                          <Trash2 size={14} aria-hidden="true" />
                          <span>Xác nhận</span>
                        </button>
                        <button type="button" className="shell-ghost-btn" aria-label="Hủy xóa bản ghi" onClick={() => setConfirmingDeleteId(null)}>
                          Hủy
                        </button>
                      </div>
                    ) : (
                      <div className="event-delete-actions">
                        <button
                          type="button"
                          className="action-card-btn"
                          aria-label={`Sửa bản ghi ${event.action_name_snapshot} lúc ${timeLabel}`}
                          onClick={() => onEditEvent(event)}
                        >
                          <Pencil size={14} aria-hidden="true" />
                          <span>Sửa</span>
                        </button>
                        <button
                          type="button"
                          className="action-card-btn action-card-btn--danger"
                          aria-label={`Xóa bản ghi ${event.action_name_snapshot} lúc ${timeLabel}`}
                          onClick={() => setConfirmingDeleteId(event.id)}
                        >
                          <Trash2 size={14} aria-hidden="true" />
                          <span>Xóa</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
};

export default HistoryList;
