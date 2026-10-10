import React from 'react';
import { Archive, Pencil, Pin } from 'lucide-react';
import { Action, resolveActionColorHex } from '../../types';
import { getAccentClassName, getAccentStyle } from '../shared/ActionIcon';
import { Badge } from '../shared/Badge';

export interface ActionCardProps {
  action: Action;
  onTogglePin: (action: Action) => void;
  onEdit: (action: Action) => void;
  onArchive: (action: Action) => void;
}

/**
 * SPEC.md § IX & BLUEPRINT.md § III.2 — Action template card in LibraryView.
 * Displays icon, name, group/color badge, pin toggle, edit trigger, and soft-archive button.
 */
export const ActionCard: React.FC<ActionCardProps> = ({
  action,
  onTogglePin,
  onEdit,
  onArchive,
}) => {
  const accentClass = getAccentClassName(action.color);
  const accentStyle = getAccentStyle(action.color);
  const resolvedHex = resolveActionColorHex(action.color);
  const groupLabel = action.group ? action.group : 'CHƯA PHÂN NHÓM';
  const orderLabel = `#${String(action.sort_order).padStart(2, '0')}`;

  return (
    <article
      className={`action-card ${accentClass}`}
      style={accentStyle}
      aria-label={`Mẫu hành động: ${action.name}`}
    >
      <div className="tap-tile-header">
        <Badge
          label={groupLabel}
          color={action.color}
          iconName={action.icon}
          iconSize={16}
        />
        <span
          className={
            action.is_pinned
              ? 'type-mono-badge text-acid'
              : 'type-mono-badge text-muted'
          }
        >
          {action.is_pinned ? `GHIM · ${orderLabel}` : `THỨ TỰ · ${orderLabel}`}
        </span>
      </div>

      <div className="action-card-body">
        <h3 className="tap-tile-title">{action.name}</h3>
        <p className="type-mono-label text-muted">
          ICON: {action.icon.toUpperCase()} · MÀU: {resolvedHex}
        </p>
      </div>

      <div className="action-card-actions">
        <button
          type="button"
          className="action-card-btn"
          aria-pressed={action.is_pinned}
          aria-label={
            action.is_pinned
              ? `Bỏ ghim mẫu ${action.name}`
              : `Ghim mẫu ${action.name} lên gợi ý đầu`
          }
          onClick={() => onTogglePin(action)}
        >
          <Pin size={14} aria-hidden="true" />
          <span>{action.is_pinned ? 'Đã ghim' : 'Ghim'}</span>
        </button>

        <button
          type="button"
          className="action-card-btn"
          aria-label={`Chỉnh sửa mẫu hành động ${action.name}`}
          onClick={() => onEdit(action)}
        >
          <Pencil size={14} aria-hidden="true" />
          <span>Sửa</span>
        </button>

        <button
          type="button"
          className="action-card-btn action-card-btn--danger"
          aria-label={`Lưu trữ mẫu hành động ${action.name}`}
          onClick={() => onArchive(action)}
        >
          <Archive size={14} aria-hidden="true" />
          <span>Lưu trữ</span>
        </button>
      </div>
    </article>
  );
};

export default ActionCard;
