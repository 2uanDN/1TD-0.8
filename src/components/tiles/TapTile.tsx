import React from 'react';
import { formatTime } from '../../lib/time';
import { Action } from '../../types';
import {
  ActionIcon,
  getAccentBadgeStyle,
  getAccentClassName,
  getAccentStyle,
} from '../shared/ActionIcon';

export interface TapTileProps {
  action: Action;
  todayCount?: number;
  lastLoggedAt?: string;
  onTap: (action: Action) => void;
}

/**
 * SPEC.md § IX & token_design.md — One-tap entry cell.
 * Built on --color-tile-surface (#151916) with 1px --color-hairline border.
 * Immediate tactile :active feedback (--color-tile-active fill + --color-acid border + 0.98 scale).
 */
export const TapTile: React.FC<TapTileProps> = ({
  action,
  todayCount = 0,
  lastLoggedAt,
  onTap,
}) => {
  const accentClass = getAccentClassName(action.color);
  const tileAccentStyle = getAccentStyle(action.color);
  const badgeAccentStyle = getAccentBadgeStyle(action.color);
  const formattedLastTime = lastLoggedAt ? formatTime(lastLoggedAt) : null;

  return (
    <button
      type="button"
      className={`tap-tile ${accentClass}`}
      style={tileAccentStyle}
      aria-label={`Ghi nhận ngay: ${action.name}${
        todayCount > 0 ? ` (đã ghi nhận ${todayCount} lần hôm nay)` : ''
      }`}
      onClick={() => onTap(action)}
    >
      <div className="tap-tile-header">
        <span
          className={`tap-tile-badge ${accentClass}`}
          style={badgeAccentStyle}
        >
          <ActionIcon name={action.icon} size={16} />
          <span className="type-mono-badge">
            {action.group ? action.group : action.is_pinned ? 'GHIM' : 'MẪU'}
          </span>
        </span>

        <span
          className={
            todayCount > 0
              ? 'type-mono-badge text-acid'
              : 'type-mono-badge text-muted'
          }
        >
          {todayCount}× HÔM NAY
        </span>
      </div>

      <div className="tap-tile-body">
        <span className="tap-tile-title">{action.name}</span>
        <span className="type-mono-label text-muted">
          {formattedLastTime
            ? `GẦN NHẤT · ${formattedLastTime}`
            : 'CHẠM ĐỂ LƯU NGAY'}
        </span>
      </div>
    </button>
  );
};

export default TapTile;
