import React, { useEffect, useRef } from 'react';
import { Action, CreateActionInput } from '../../types';
import { ActionForm } from '../library/ActionForm';

export interface ActionDrawerProps {
  isOpen: boolean;
  mode: 'add' | 'edit';
  action: Action | null;
  defaultIcon?: string;
  onClose: () => void;
  onSave: (input: CreateActionInput, existingId?: string) => void;
  onArchive?: (action: Action) => void;
}

/**
 * SPEC.md § IX & token_design.md — Bottom-sheet Action Drawer (85% max viewport height).
 * Manages focus on open (first input) and restores focus to the trigger element on close (AGENTS.md).
 */
export const ActionDrawer: React.FC<ActionDrawerProps> = ({
  isOpen,
  mode,
  action,
  defaultIcon = 'Activity',
  onClose,
  onSave,
  onArchive,
}) => {
  const firstInputRef = useRef<HTMLInputElement | null>(null);
  const previousActiveElementRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (isOpen) {
      if (document.activeElement instanceof HTMLElement) {
        previousActiveElementRef.current = document.activeElement;
      }

      const timer = window.setTimeout(() => {
        firstInputRef.current?.focus();
      }, 0);

      const handleKeyDown = (event: KeyboardEvent) => {
        if (event.key === 'Escape') {
          event.preventDefault();
          onClose();
        }
      };

      window.addEventListener('keydown', handleKeyDown);
      return () => {
        window.clearTimeout(timer);
        window.removeEventListener('keydown', handleKeyDown);
      };
    }

    if (previousActiveElementRef.current) {
      previousActiveElementRef.current.focus();
      previousActiveElementRef.current = null;
    }
    return undefined;
  }, [isOpen, onClose]);

  if (!isOpen) {
    return null;
  }

  const isEditMode = mode === 'edit' && action !== null;
  const dialogTitleId = 'action-drawer-title';

  const handleBackdropClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (event.target === event.currentTarget) {
      onClose();
    }
  };

  return (
    <div
      className="drawer-backdrop"
      role="presentation"
      onClick={handleBackdropClick}
    >
      <section
        className="drawer-sheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby={dialogTitleId}
      >
        <button
          type="button"
          className="drawer-handle-bar"
          aria-label="Đóng ngăn thiết lập mẫu hành động"
          onClick={onClose}
        >
          <span className="drawer-handle-pill" aria-hidden="true" />
        </button>

        <div className="drawer-content">
          <div className="shell-header-row">
            <div>
              <span className="type-mono-label text-secondary">
                {isEditMode
                  ? 'ACTION DRAWER · CHỈNH SỬA MẪU'
                  : 'ACTION DRAWER · KHỞI TẠO MẪU MỚI'}
              </span>
              <h2 id={dialogTitleId} className="type-headline-sm">
                {isEditMode
                  ? `Chỉnh sửa: ${action.name}`
                  : 'Thêm hành động mới'}
              </h2>
            </div>

            <button
              type="button"
              className="shell-ghost-btn"
              aria-label="Đóng ngăn"
              onClick={onClose}
            >
              Đóng
            </button>
          </div>

          <ActionForm
            initialAction={isEditMode ? action : null}
            defaultIcon={defaultIcon}
            firstInputRef={firstInputRef}
            onSubmit={onSave}
            onArchive={isEditMode ? onArchive : undefined}
            onCancel={onClose}
          />
        </div>
      </section>
    </div>
  );
};

export default ActionDrawer;
