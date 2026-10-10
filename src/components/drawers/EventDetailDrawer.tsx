import React, { useEffect, useRef, useState } from 'react';
import { Trash2 } from 'lucide-react';
import { useEvents } from '../../hooks/useEvents';
import { applyTimeInputToIso, formatDate, formatTime, shiftIsoByMinutes } from '../../lib/time';
import { useUIStore } from '../../store/uiStore';
import { Event } from '../../types';
import { Badge } from '../shared/Badge';

const MAX_NOTE_CHARS = 500;
const MINUTE_STEPS: ReadonlyArray<{ delta: number; label: string }> = [
  { delta: -15, label: '-15P' },
  { delta: -5, label: '-5P' },
  { delta: -1, label: '-1P' },
  { delta: 1, label: '+1P' },
  { delta: 5, label: '+5P' },
  { delta: 15, label: '+15P' },
];

export interface EventDetailUpdates {
  note: string | null;
  occurred_at: string;
}

export interface EventDetailDrawerProps {
  isOpen?: boolean;
  event?: Event | null;
  onClose?: () => void;
  onSave?: (eventId: string, updates: EventDetailUpdates) => Promise<void> | void;
  onDelete?: (event: Event) => Promise<void> | void;
}

function isEventPayload(payload: unknown): payload is Event {
  return Boolean(payload && typeof payload === 'object' && 'action_name_snapshot' in payload && 'occurred_at' in payload);
}

export const EventDetailDrawer: React.FC<EventDetailDrawerProps> = ({
  isOpen,
  event,
  onClose,
  onSave,
  onDelete,
}) => {
  const { openDrawer, drawerPayload, closeDrawer: closeStoreDrawer, showToast } = useUIStore();
  const { updateNote, updateOccurredAt, deleteEvent } = useEvents();

  const resolvedIsOpen = isOpen ?? openDrawer === 'event-detail';
  const activeEvent = event !== undefined ? event : isEventPayload(drawerPayload) ? drawerPayload : null;
  const handleClose = onClose ?? closeStoreDrawer;

  const [noteText, setNoteText] = useState<string>('');
  const [occurredAtIso, setOccurredAtIso] = useState<string>('');
  const [timeInput, setTimeInput] = useState<string>('');
  const [isConfirmingDelete, setIsConfirmingDelete] = useState<boolean>(false);

  const noteInputRef = useRef<HTMLTextAreaElement | null>(null);
  const previousActiveRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!activeEvent) return;
    setNoteText(activeEvent.note ?? '');
    setOccurredAtIso(activeEvent.occurred_at);
    setTimeInput(formatTime(activeEvent.occurred_at));
    setIsConfirmingDelete(false);
  }, [activeEvent]);

  useEffect(() => {
    if (resolvedIsOpen && activeEvent) {
      if (document.activeElement instanceof HTMLElement) {
        previousActiveRef.current = document.activeElement;
      }
      const timer = window.setTimeout(() => noteInputRef.current?.focus(), 0);
      const onKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          e.preventDefault();
          handleClose();
        }
      };
      window.addEventListener('keydown', onKeyDown);
      return () => {
        window.clearTimeout(timer);
        window.removeEventListener('keydown', onKeyDown);
      };
    }
    if (previousActiveRef.current) {
      previousActiveRef.current.focus();
      previousActiveRef.current = null;
    }
    return undefined;
  }, [resolvedIsOpen, activeEvent, handleClose]);

  if (!resolvedIsOpen || !activeEvent) return null;

  const handleTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const nextValue = e.target.value;
    setTimeInput(nextValue);
    if (/^([01]\d|2[0-3]):([0-5]\d)$/.test(nextValue)) {
      setOccurredAtIso(applyTimeInputToIso(occurredAtIso, nextValue));
    }
  };

  const handleStepMinutes = (delta: number) => {
    const shiftedIso = shiftIsoByMinutes(occurredAtIso, delta);
    setOccurredAtIso(shiftedIso);
    setTimeInput(formatTime(shiftedIso));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const normalizedNote = noteText.trim().slice(0, MAX_NOTE_CHARS) || null;
    if (onSave) {
      await onSave(activeEvent.id, { note: normalizedNote, occurred_at: occurredAtIso });
      handleClose();
      return;
    }
    if (occurredAtIso !== activeEvent.occurred_at) await updateOccurredAt(activeEvent.id, occurredAtIso);
    if (normalizedNote !== activeEvent.note) await updateNote(activeEvent.id, normalizedNote);
    showToast(`Đã cập nhật bản ghi "${activeEvent.action_name_snapshot}".`);
    handleClose();
  };

  const handleConfirmDelete = async () => {
    if (onDelete) {
      await onDelete(activeEvent);
      handleClose();
      return;
    }
    if (await deleteEvent(activeEvent.id)) showToast(`Đã xóa bản ghi "${activeEvent.action_name_snapshot}".`);
    handleClose();
  };

  return (
    <div className="drawer-backdrop" role="presentation" onClick={(e) => e.target === e.currentTarget && handleClose()}>
      <section className="drawer-sheet" role="dialog" aria-modal="true" aria-labelledby="event-detail-drawer-title">
        <button type="button" className="drawer-handle-bar" aria-label="Đóng ngăn chi tiết bản ghi" onClick={handleClose}>
          <span className="drawer-handle-pill" aria-hidden="true" />
        </button>
        <div className="drawer-content">
          <div className="shell-header-row">
            <div>
              <span className="type-mono-label text-secondary">EVENT DETAIL · CHI TIẾT BẢN GHI</span>
              <h2 id="event-detail-drawer-title" className="type-headline-sm">{activeEvent.action_name_snapshot}</h2>
            </div>
            <button type="button" className="shell-ghost-btn" aria-label="Đóng ngăn" onClick={handleClose}>Đóng</button>
          </div>
          <div className="event-detail-summary">
            <Badge label="ĐÃ GHI NHẬN" color={activeEvent.action_color_snapshot} iconName={activeEvent.action_icon_snapshot} iconSize={16} />
            <div className="event-detail-meta">
              <span className="type-mono-metric text-acid">{formatTime(occurredAtIso)}</span>
              <span className="type-mono-label text-muted">{formatDate(occurredAtIso)} · {activeEvent.timezone_id}</span>
            </div>
          </div>
          <form className="action-form" onSubmit={(e) => void handleSubmit(e)} noValidate>
            <div className="action-form-field">
              <label htmlFor="event-time-input" className="type-mono-label text-secondary">01 · THỜI GIAN GHI NHẬN (OCCURRED_AT)</label>
              <div className="event-time-controls">
                <input id="event-time-input" type="time" className="ledger-input ledger-input--mono" value={timeInput} aria-label="Thời gian diễn ra hoạt động (HH:mm)" onChange={handleTimeChange} />
                <div className="event-stepper-grid" role="group" aria-label="Điều chỉnh nhanh thời gian theo phút">
                  {MINUTE_STEPS.map((step) => (
                    <button key={step.label} type="button" className="action-card-btn" aria-label={`Điều chỉnh thời gian ${step.delta > 0 ? `cộng ${step.delta}` : `trừ ${Math.abs(step.delta)}`} phút`} onClick={() => handleStepMinutes(step.delta)}>{step.label}</button>
                  ))}
                </div>
              </div>
            </div>
            <div className="action-form-field">
              <div className="view-row-between">
                <label htmlFor="event-note-textarea" className="type-mono-label text-secondary">02 · GHI CHÚ BỐI CẢNH (TÙY CHỌN)</label>
                <span className="type-mono-label text-muted">{noteText.length} / {MAX_NOTE_CHARS} KÝ TỰ</span>
              </div>
              <textarea ref={noteInputRef} id="event-note-textarea" className="ledger-input ledger-textarea" rows={3} maxLength={MAX_NOTE_CHARS} value={noteText} placeholder="Thêm ghi chú ngắn cho bản ghi này (tối đa 500 ký tự)..." aria-label="Ghi chú hoạt động" onChange={(e) => setNoteText(e.target.value)} />
            </div>
            {isConfirmingDelete ? (
              <div className="event-delete-confirm" role="alertdialog" aria-labelledby="delete-confirm-title">
                <p id="delete-confirm-title" className="type-mono-badge text-acid">XÁC NHẬN XÓA VĨNH VIỄN BẢN GHI NÀY?</p>
                <p className="type-body-sm text-muted">Bản ghi &ldquo;{activeEvent.action_name_snapshot}&rdquo; lúc {formatTime(activeEvent.occurred_at)} sẽ bị xóa khỏi thiết bị.</p>
                <div className="event-delete-actions">
                  <button type="button" className="shell-ghost-btn" aria-label="Hủy thao tác xóa bản ghi" onClick={() => setIsConfirmingDelete(false)}>Hủy xóa</button>
                  <button type="button" className="action-card-btn action-card-btn--danger" aria-label={`Xác nhận xóa bản ghi ${activeEvent.action_name_snapshot}`} onClick={() => void handleConfirmDelete()}>
                    <Trash2 size={14} aria-hidden="true" /><span>Xác nhận xóa</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="action-form-footer">
                <div className="library-filter-bar">
                  <button type="button" className="shell-ghost-btn" aria-label="Hủy và đóng ngăn" onClick={handleClose}>Hủy</button>
                  <button type="button" className="action-card-btn action-card-btn--danger" aria-label={`Xóa bản ghi ${activeEvent.action_name_snapshot}`} onClick={() => setIsConfirmingDelete(true)}>
                    <Trash2 size={14} aria-hidden="true" /><span>Xóa bản ghi</span>
                  </button>
                </div>
                <button type="submit" className="shell-cta-btn" aria-label="Lưu cập nhật bản ghi">Lưu thay đổi</button>
              </div>
            )}
          </form>
        </div>
      </section>
    </div>
  );
};

export default EventDetailDrawer;
