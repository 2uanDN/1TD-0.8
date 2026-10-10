import React, { useCallback } from 'react';
import { ActionDrawer } from '../components/drawers/ActionDrawer';
import { LibraryGrid } from '../components/library/LibraryGrid';
import { useActions } from '../hooks/useActions';
import { useSettings } from '../hooks/useSettings';
import {
  MAX_ACTIONS_LIMIT,
  WARN_ACTIONS_THRESHOLD,
} from '../storage/actions';
import { useUIStore } from '../store/uiStore';
import { Action, CreateActionInput } from '../types';

function isActionPayload(payload: unknown): payload is Action {
  if (!payload || typeof payload !== 'object') {
    return false;
  }
  return 'is_pinned' in payload && 'sort_order' in payload;
}

export const LibraryView: React.FC = () => {
  const {
    actions,
    activeActions,
    pinnedActions,
    createAction,
    editAction,
    togglePinAction,
    removeAction,
  } = useActions();

  const openDrawer = useUIStore((state) => state.openDrawer);
  const drawerPayload = useUIStore((state) => state.drawerPayload);
  const openAddActionDrawer = useUIStore((state) => state.openAddActionDrawer);
  const openActionDrawer = useUIStore((state) => state.openActionDrawer);
  const closeDrawer = useUIStore((state) => state.closeDrawer);
  const showToast = useUIStore((state) => state.showToast);

  const { settings } = useSettings();
  const totalStoredCount = actions.length;
  const isNearCapacity = totalStoredCount >= WARN_ACTIONS_THRESHOLD;
  const isAtCapacity = totalStoredCount >= MAX_ACTIONS_LIMIT;

  const isDrawerOpen =
    openDrawer === 'add-action' || openDrawer === 'action-edit';
  const drawerMode = openDrawer === 'action-edit' ? 'edit' : 'add';
  const editingAction =
    openDrawer === 'action-edit' && isActionPayload(drawerPayload)
      ? drawerPayload
      : null;

  const handleOpenAdd = useCallback(() => {
    if (isAtCapacity) {
      showToast(`Đã đạt giới hạn tối đa ${MAX_ACTIONS_LIMIT} mẫu hành động.`);
      return;
    }
    openAddActionDrawer();
  }, [isAtCapacity, openAddActionDrawer, showToast]);

  const handleOpenEdit = useCallback(
    (action: Action) => {
      openActionDrawer(action);
    },
    [openActionDrawer]
  );

  const handleTogglePin = useCallback(
    (action: Action) => {
      const updated = togglePinAction(action.id);
      if (updated) {
        showToast(
          updated.is_pinned
            ? `Đã ghim "${updated.name}" lên gợi ý ưu tiên.`
            : `Đã bỏ ghim "${updated.name}".`
        );
      }
    },
    [togglePinAction, showToast]
  );

  const handleArchive = useCallback(
    (action: Action) => {
      const archived = removeAction(action.id);
      if (archived) {
        if (
          openDrawer === 'action-edit' &&
          editingAction?.id === action.id
        ) {
          closeDrawer();
        }
        showToast(`Đã lưu trữ mẫu "${action.name}". Lịch sử bản ghi vẫn được giữ nguyên.`);
      }
    },
    [removeAction, openDrawer, editingAction, closeDrawer, showToast]
  );

  const handleSaveAction = useCallback(
    (input: CreateActionInput, existingId?: string) => {
      if (existingId) {
        const updated = editAction(existingId, input);
        if (updated) {
          closeDrawer();
          showToast(`Đã cập nhật mẫu "${updated.name}".`);
        }
        return;
      }

      const created = createAction(input);
      if (created) {
        closeDrawer();
        showToast(`Đã thêm mẫu "${created.name}" vào thư viện.`);
      }
    },
    [createAction, editAction, closeDrawer, showToast]
  );

  return (
    <div className="view-panel">
      <section className="view-section" aria-labelledby="library-header-title">
        <div className="shell-header-row">
          <span className="type-mono-label text-secondary">
            LIBRARY · DANH MỤC MẪU HÀNH ĐỘNG
          </span>
          <span className="type-mono-metric text-acid" aria-live="polite">
            {activeActions.length} MẪU · {pinnedActions.length} ĐÃ GHIM
          </span>
        </div>

        <div className="view-row-between">
          <div>
            <h1 id="library-header-title" className="type-headline-lg">
              Thư viện hành động
            </h1>
            <p className="type-editorial-italic text-muted">
              Tạo mẫu một lần với biểu tượng, màu sắc và thứ tự ưu tiên ghim.
            </p>
          </div>
          <button
            type="button"
            className="shell-cta-btn"
            aria-label="Thêm hành động mới vào thư viện"
            onClick={handleOpenAdd}
          >
            Thêm hành động mới
          </button>
        </div>
      </section>

      {isNearCapacity && (
        <section
          className="shell-banner shell-banner--warn"
          role="status"
          aria-live="polite"
        >
          <div>
            <p className="type-mono-badge text-acid">
              CẢNH BÁO DUNG LƯỢNG THƯ VIỆN ({totalStoredCount} / {MAX_ACTIONS_LIMIT})
            </p>
            <p className="type-body-sm text-muted">
              Thư viện đã vượt ngưỡng {WARN_ACTIONS_THRESHOLD} mẫu. Giới hạn tối đa là {MAX_ACTIONS_LIMIT} mẫu hành động.
            </p>
          </div>
        </section>
      )}

      <section className="view-section" aria-labelledby="library-grid-title">
        <div className="view-section-header">
          <h2 id="library-grid-title" className="type-headline-sm">
            Tất cả mẫu đang hoạt động
          </h2>
          <span className="type-mono-badge text-muted">
            {totalStoredCount} / {MAX_ACTIONS_LIMIT} MẪU ĐÃ LƯU
          </span>
        </div>

        <LibraryGrid
          actions={activeActions}
          onAddAction={handleOpenAdd}
          onEditAction={handleOpenEdit}
          onTogglePin={handleTogglePin}
          onArchiveAction={handleArchive}
        />
      </section>

      <ActionDrawer
        isOpen={isDrawerOpen}
        mode={drawerMode}
        action={editingAction}
        defaultIcon={settings.default_icon}
        onClose={closeDrawer}
        onSave={handleSaveAction}
        onArchive={handleArchive}
      />
    </div>
  );
};

export default LibraryView;
