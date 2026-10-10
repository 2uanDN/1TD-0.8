import React, { useEffect } from 'react';
import { useUndoStack } from '../../hooks/useUndoStack';
import { useUIStore } from '../../store/uiStore';

/**
 * SPEC.md § VIII.2 & § IX — Bottom UndoToast with 3s timeout and "Hoàn tác" button.
 * Never shows confirmation dialogs on log taps; offers immediate post-log undo.
 */
export const UndoToast: React.FC = () => {
  const toastMessage = useUIStore((state) => state.toastMessage);
  const toastDuration = useUIStore((state) => state.toastDuration);
  const clearToast = useUIStore((state) => state.clearToast);
  const { canUndo, latestUndoEvent, executeUndo } = useUndoStack();

  useEffect(() => {
    if (!toastMessage) {
      return;
    }
    const timer = window.setTimeout(() => {
      clearToast();
    }, toastDuration);
    return () => {
      window.clearTimeout(timer);
    };
  }, [toastMessage, toastDuration, clearToast]);

  if (!toastMessage) {
    return null;
  }

  const isUndoableToast =
    canUndo && Boolean(latestUndoEvent) && toastMessage.includes('Hoàn tác');

  const displayMessage = isUndoableToast
    ? toastMessage.replace(/\s*—\s*Hoàn tác$/i, '')
    : toastMessage;

  const handleUndoClick = () => {
    void executeUndo();
  };

  return (
    <aside
      className="undo-toast-region"
      role="status"
      aria-live="polite"
      aria-atomic="true"
    >
      <div className="undo-toast">
        <div className="undo-toast-content">
          <span className="type-mono-badge text-acid">
            {isUndoableToast ? 'LOGGED · 3S' : 'THÔNG BÁO'}
          </span>
          <span className="type-body-sm">{displayMessage}</span>
        </div>

        <div className="undo-toast-actions">
          {isUndoableToast ? (
            <button
              type="button"
              className="shell-cta-btn"
              aria-label={
                latestUndoEvent
                  ? `Hoàn tác ghi nhận ${latestUndoEvent.action_name_snapshot}`
                  : 'Hoàn tác hoạt động vừa ghi nhận'
              }
              onClick={handleUndoClick}
            >
              Hoàn tác
            </button>
          ) : (
            <button
              type="button"
              className="shell-ghost-btn"
              aria-label="Đóng thông báo"
              onClick={clearToast}
            >
              Đóng
            </button>
          )}
        </div>
      </div>
    </aside>
  );
};

export default UndoToast;
