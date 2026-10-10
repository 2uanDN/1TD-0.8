import React from 'react';
import { Action } from '../../types';
import { ActionIcon } from '../shared/ActionIcon';
import { TapTile } from './TapTile';

export interface TileGridProps {
  actions: Action[];
  todayCountsByActionId?: Record<string, number>;
  lastLoggedAtByActionId?: Record<string, string>;
  onTapAction: (action: Action) => void;
  onOpenLibrary: () => void;
}

/**
 * SPEC.md § IX & BLUEPRINT.md § III.1 — Responsive 2-column grid of TapTiles
 * plus the "Các hành động khác" cell that opens LibraryView.
 */
export const TileGrid: React.FC<TileGridProps> = ({
  actions,
  todayCountsByActionId = {},
  lastLoggedAtByActionId = {},
  onTapAction,
  onOpenLibrary,
}) => {
  return (
    <div className="tile-grid" role="group" aria-label="Lưới ô chạm ghi nhận nhanh">
      {actions.map((action) => (
        <TapTile
          key={action.id}
          action={action}
          todayCount={todayCountsByActionId[action.id] ?? 0}
          lastLoggedAt={lastLoggedAtByActionId[action.id]}
          onTap={onTapAction}
        />
      ))}

      <button
        type="button"
        className="tap-tile tap-tile--library"
        aria-label="Mở các hành động khác trong thư viện"
        onClick={onOpenLibrary}
      >
        <div className="tap-tile-header">
          <span className="tap-tile-badge accent-chartreuse">
            <ActionIcon name="Sparkles" size={16} />
            <span className="type-mono-badge text-acid">THƯ VIỆN</span>
          </span>
          <span className="type-mono-badge text-secondary">DANH MỤC</span>
        </div>

        <div className="tap-tile-body">
          <span className="tap-tile-title">Các hành động khác</span>
          <span className="type-mono-label text-muted">
            MỞ THƯ VIỆN &amp; QUẢN LÝ MẪU
          </span>
        </div>
      </button>
    </div>
  );
};

export default TileGrid;
