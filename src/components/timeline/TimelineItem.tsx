import React from 'react';
import { formatTime } from '../../lib/time';
import { Event } from '../../types';
import { getAccentClassName, getAccentStyle } from '../shared/ActionIcon';
import { Badge } from '../shared/Badge';
import { Timestamp } from '../shared/Timestamp';

export interface TimelineItemProps {
  event: Event;
  elapsedText?: string | null;
  onUndo: (event: Event) => void;
  onSelect?: (event: Event) => void;
}

/**
 * SPEC.md § IX & BLUEPRINT.md § III.1 — TimelineItem:
 * Displays a logged Event row with activity accent stripe, icon + "ĐÃ GHI NHẬN" micro-badge,
 * snapshot action name, optional note preview, monospace timestamp, and one-tap Undo button.
 */
export const TimelineItem: React.FC<TimelineItemProps> = ({
  event,
  elapsedText,
  onUndo,
  onSelect,
}) => {
  const accentClass = getAccentClassName(event.action_color_snapshot);
  const accentStyle = getAccentStyle(event.action_color_snapshot);
  const formattedTime = formatTime(event.occurred_at);

  return (
    <div
      role="listitem"
      className={`timeline-item ${accentClass}`}
      style={accentStyle}
    >
      <div className="timeline-item-primary">
        {onSelect ? (
          <button
            type="button"
            className="timeline-item-trigger"
            aria-label={`Xem chi tiết ${event.action_name_snapshot} lúc ${formattedTime}`}
            onClick={() => onSelect(event)}
          >
            <div className="timeline-item-badges">
              <Badge
                label="ĐÃ GHI NHẬN"
                color={event.action_color_snapshot}
                iconName={event.action_icon_snapshot}
                iconSize={15}
              />
            </div>

            <div className="timeline-item-copy">
              <span className="timeline-item-title">
                {event.action_name_snapshot}
              </span>
              {event.note ? (
                <p className="type-editorial-italic text-muted timeline-item-note">
                  {event.note}
                </p>
              ) : null}
            </div>
          </button>
        ) : (
          <div className="timeline-item-static">
            <div className="timeline-item-badges">
              <Badge
                label="ĐÃ GHI NHẬN"
                color={event.action_color_snapshot}
                iconName={event.action_icon_snapshot}
                iconSize={15}
              />
            </div>

            <div className="timeline-item-copy">
              <span className="timeline-item-title">
                {event.action_name_snapshot}
              </span>
              {event.note ? (
                <p className="type-editorial-italic text-muted timeline-item-note">
                  {event.note}
                </p>
              ) : null}
            </div>
          </div>
        )}
      </div>

      <div className="timeline-item-meta">
        <Timestamp
          isoString={event.occurred_at}
          elapsedText={elapsedText}
          variant="metric"
          highlight
        />

        <button
          type="button"
          className="shell-ghost-btn"
          aria-label={`Hoàn tác ${event.action_name_snapshot} lúc ${formattedTime}`}
          onClick={() => onUndo(event)}
        >
          Hoàn tác
        </button>
      </div>
    </div>
  );
};

export default TimelineItem;
