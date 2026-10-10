import React, { useMemo, useState } from 'react';
import { Plus } from 'lucide-react';
import { Action } from '../../types';
import { ActionCard } from './ActionCard';

export interface LibraryGridProps {
  actions: Action[];
  onAddAction: () => void;
  onEditAction: (action: Action) => void;
  onTogglePin: (action: Action) => void;
  onArchiveAction: (action: Action) => void;
}

type FilterMode = 'all' | 'pinned' | string;

/**
 * SPEC.md § IX & BLUEPRINT.md § III.2 — Searchable and filterable grid of ActionCards
 * with an inline "Add Action" trigger card.
 */
export const LibraryGrid: React.FC<LibraryGridProps> = ({
  actions,
  onAddAction,
  onEditAction,
  onTogglePin,
  onArchiveAction,
}) => {
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeFilter, setActiveFilter] = useState<FilterMode>('all');

  const availableGroups = useMemo(() => {
    const set = new Set<string>();
    actions.forEach((action) => {
      if (action.group && action.group.trim()) {
        set.add(action.group.trim());
      }
    });
    return Array.from(set);
  }, [actions]);

  const filteredActions = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return actions.filter((action) => {
      if (activeFilter === 'pinned' && !action.is_pinned) {
        return false;
      }
      if (
        activeFilter !== 'all' &&
        activeFilter !== 'pinned' &&
        action.group !== activeFilter
      ) {
        return false;
      }

      if (!query) {
        return true;
      }

      const nameMatch = action.name.toLowerCase().includes(query);
      const groupMatch = (action.group ?? '').toLowerCase().includes(query);
      const iconMatch = action.icon.toLowerCase().includes(query);
      return nameMatch || groupMatch || iconMatch;
    });
  }, [actions, activeFilter, searchQuery]);

  return (
    <div className="library-toolbar">
      <div className="library-search-row">
        <div className="ledger-input-wrap">
          <input
            type="search"
            className="ledger-input"
            value={searchQuery}
            placeholder="Tìm nhanh theo tên, nhóm hoặc biểu tượng..."
            aria-label="Tìm kiếm mẫu hành động trong thư viện"
            onChange={(event) => setSearchQuery(event.target.value)}
          />
        </div>
        {searchQuery && (
          <button
            type="button"
            className="shell-ghost-btn"
            aria-label="Xóa từ khóa tìm kiếm"
            onClick={() => setSearchQuery('')}
          >
            Xóa lọc
          </button>
        )}
      </div>

      <div className="library-filter-bar" role="group" aria-label="Bộ lọc danh mục hành động">
        <button
          type="button"
          className="library-filter-btn"
          aria-pressed={activeFilter === 'all'}
          aria-label="Hiển thị tất cả mẫu hành động"
          onClick={() => setActiveFilter('all')}
        >
          <span className="type-mono-badge">TẤT CẢ ({actions.length})</span>
        </button>

        <button
          type="button"
          className="library-filter-btn"
          aria-pressed={activeFilter === 'pinned'}
          aria-label="Chỉ hiển thị các mẫu đang ghim"
          onClick={() => setActiveFilter('pinned')}
        >
          <span className="type-mono-badge">
            ĐANG GHIM ({actions.filter((a) => a.is_pinned).length})
          </span>
        </button>

        {availableGroups.map((groupName) => (
          <button
            key={groupName}
            type="button"
            className="library-filter-btn"
            aria-pressed={activeFilter === groupName}
            aria-label={`Lọc theo nhóm ${groupName}`}
            onClick={() => setActiveFilter(groupName)}
          >
            <span className="type-mono-badge">{groupName}</span>
          </button>
        ))}
      </div>

      {filteredActions.length === 0 ? (
        <div className="timeline-empty" role="status">
          <div className="timeline-empty-header">
            <span className="type-mono-badge text-secondary">
              {actions.length === 0 ? 'THƯ VIỆN TRỐNG' : 'KHÔNG TÌM THẤY KẾT QUẢ'}
            </span>
            <span className="type-mono-label text-muted">0 MẪU PHÙ HỢP</span>
          </div>
          <p className="type-editorial-italic text-muted">
            {actions.length === 0
              ? 'Chưa có mẫu hành động nào đang hoạt động. Tạo mẫu đầu tiên để bắt đầu ghi nhận một chạm.'
              : 'Không có mẫu hành động nào khớp với bộ lọc hiện tại.'}
          </p>
          <div>
            <button
              type="button"
              className="shell-cta-btn"
              aria-label="Thêm hành động mới ngay"
              onClick={onAddAction}
            >
              Thêm hành động mới
            </button>
          </div>
        </div>
      ) : (
        <div className="tile-grid" role="list" aria-label="Danh sách mẫu hành động">
          {filteredActions.map((action) => (
            <div key={action.id} role="listitem">
              <ActionCard
                action={action}
                onTogglePin={onTogglePin}
                onEdit={onEditAction}
                onArchive={onArchiveAction}
              />
            </div>
          ))}

          <div role="listitem">
            <button
              type="button"
              className="tap-tile tap-tile--library"
              aria-label="Thêm mẫu hành động mới vào thư viện"
              onClick={onAddAction}
            >
              <div className="tap-tile-header">
                <span className="tap-tile-badge accent-chartreuse">
                  <Plus size={16} aria-hidden="true" />
                  <span className="type-mono-badge">TẠO MỚI</span>
                </span>
                <span className="type-mono-badge text-acid">+ MẪU</span>
              </div>
              <div className="tap-tile-body">
                <span className="tap-tile-title">Thêm hành động mới</span>
                <span className="type-mono-label text-muted">
                  TẠO MẪU MỘT LẦN · DÙNG MÃI MÃI
                </span>
              </div>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default LibraryGrid;
