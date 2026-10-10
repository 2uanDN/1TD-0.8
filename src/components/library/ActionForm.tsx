import React, { useEffect, useState } from 'react';
import { Archive, Pin } from 'lucide-react';
import { Action, CreateActionInput, isValidActionColor } from '../../types';
import { Badge } from '../shared/Badge';
import { ColorPicker } from '../shared/ColorPicker';
import { IconPicker, inferIconFromActionName } from '../shared/IconPicker';

export interface ActionFormProps {
  initialAction?: Action | null;
  defaultIcon?: string;
  firstInputRef?: React.RefObject<HTMLInputElement | null>;
  onSubmit: (input: CreateActionInput, existingId?: string) => void;
  onArchive?: (action: Action) => void;
  onCancel: () => void;
}

const QUICK_GROUPS: ReadonlyArray<string> = [
  'Buổi sáng',
  'Dinh dưỡng',
  'Công việc',
  'Sức khỏe',
  'Buổi tối',
];

export const ActionForm: React.FC<ActionFormProps> = ({
  initialAction = null,
  defaultIcon = 'Activity',
  firstInputRef,
  onSubmit,
  onArchive,
  onCancel,
}) => {
  const [name, setName] = useState<string>(initialAction?.name ?? '');
  const [group, setGroup] = useState<string>(initialAction?.group ?? '');
  const [icon, setIcon] = useState<string>(initialAction?.icon ?? defaultIcon);
  const [color, setColor] = useState<string>(initialAction?.color ?? 'chartreuse');
  const [isPinned, setIsPinned] = useState<boolean>(initialAction?.is_pinned ?? true);
  const [hasManualIcon, setHasManualIcon] = useState<boolean>(Boolean(initialAction));
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    setName(initialAction?.name ?? '');
    setGroup(initialAction?.group ?? '');
    setIcon(initialAction?.icon ?? defaultIcon);
    setColor(initialAction?.color ?? 'chartreuse');
    setIsPinned(initialAction?.is_pinned ?? true);
    setHasManualIcon(Boolean(initialAction));
    setErrorMessage(null);
  }, [initialAction, defaultIcon]);

  const handleNameChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const nextName = event.target.value;
    setName(nextName);
    if (errorMessage) setErrorMessage(null);
    if (!hasManualIcon) {
      const inferred = inferIconFromActionName(nextName);
      if (inferred) setIcon(inferred);
    }
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmedName = name.trim();
    if (trimmedName.length < 1 || trimmedName.length > 40) {
      setErrorMessage('Tên hành động bắt buộc từ 1 đến 40 ký tự.');
      return;
    }
    const normalizedColor = isValidActionColor(color) ? color.trim() : 'chartreuse';
    const trimmedGroup = group.trim().slice(0, 30);
    onSubmit(
      {
        name: trimmedName,
        icon,
        color: normalizedColor,
        group: trimmedGroup || undefined,
        is_pinned: isPinned,
      },
      initialAction?.id
    );
  };

  return (
    <form className="action-form" onSubmit={handleSubmit} noValidate>
      <div className="view-row-between">
        <Badge
          label={group.trim() || (isPinned ? 'GHIM' : 'MẪU')}
          color={color}
          iconName={icon}
          iconSize={16}
        />
        <span className="type-mono-label text-muted">
          XEM TRƯỚC · {name.trim() || 'TÊN HÀNH ĐỘNG'}
        </span>
      </div>

      <div className="action-form-field">
        <label htmlFor="action-name-input" className="type-mono-label text-secondary">
          01 · TÊN HÀNH ĐỘNG (BẮT BUỘC, TỐI ĐA 40 KÝ TỰ)
        </label>
        <input
          ref={firstInputRef}
          id="action-name-input"
          type="text"
          className="ledger-input"
          value={name}
          maxLength={40}
          required
          placeholder="Ví dụ: Uống nước ấm, Đọc sách 20 phút..."
          aria-label="Tên hành động"
          onChange={handleNameChange}
        />
        {errorMessage && (
          <p className="type-mono-label text-acid" role="alert">
            {errorMessage}
          </p>
        )}
      </div>

      <div className="action-form-field">
        <div className="view-row-between">
          <label htmlFor="action-group-input" className="type-mono-label text-secondary">
            02 · NHÓM PHÂN LOẠI (TÙY CHỌN, TỐI ĐA 30 KÝ TỰ)
          </label>
          <button type="button" className="library-filter-btn" aria-pressed={isPinned} aria-label="Ghim mẫu hành động vào danh sách ưu tiên" onClick={() => setIsPinned((prev) => !prev)}>
            <Pin size={14} aria-hidden="true" />
            <span className="type-mono-badge">{isPinned ? 'ĐANG GHIM ƯU TIÊN' : 'KHÔNG GHIM'}</span>
          </button>
        </div>

        <input id="action-group-input" type="text" className="ledger-input" value={group} maxLength={30} placeholder="Ví dụ: Buổi sáng, Công việc, Sức khỏe..." aria-label="Nhóm phân loại hành động" onChange={(e) => setGroup(e.target.value)} />

        <div className="library-filter-bar" role="group" aria-label="Gợi ý nhóm nhanh">
          {QUICK_GROUPS.map((presetGroup) => (
            <button key={presetGroup} type="button" className="library-filter-btn" aria-pressed={group.trim() === presetGroup} aria-label={`Chọn nhóm ${presetGroup}`} onClick={() => setGroup((prev) => (prev.trim() === presetGroup ? '' : presetGroup))}>
              <span className="type-mono-badge">{presetGroup}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="action-form-field">
        <span className="type-mono-label text-secondary">03 · MÀU SẮC ĐỊNH DANH</span>
        <ColorPicker value={color} onChange={setColor} />
      </div>

      <div className="action-form-field">
        <span className="type-mono-label text-secondary">04 · BIỂU TƯỢNG (TỰ ĐỘNG GỢI Ý THEO TÊN)</span>
        <IconPicker value={icon} onChange={(nextIcon) => { setHasManualIcon(true); setIcon(nextIcon); }} actionNameHint={name} />
      </div>

      <div className="action-form-footer">
        <div className="library-filter-bar">
          <button type="button" className="shell-ghost-btn" aria-label="Hủy và đóng ngăn biểu mẫu" onClick={onCancel}>Hủy</button>
          {initialAction && onArchive && (
            <button type="button" className="action-card-btn action-card-btn--danger" aria-label={`Lưu trữ mẫu hành động ${initialAction.name}`} onClick={() => onArchive(initialAction)}>
              <Archive size={14} aria-hidden="true" />
              <span>Lưu trữ mẫu</span>
            </button>
          )}
        </div>
        <button type="submit" className="shell-cta-btn" aria-label={initialAction ? 'Lưu cập nhật mẫu hành động' : 'Lưu mẫu hành động mới vào thư viện'}>
          {initialAction ? 'Lưu thay đổi' : 'Lưu vào thư viện'}
        </button>
      </div>
    </form>
  );
};

export default ActionForm;
