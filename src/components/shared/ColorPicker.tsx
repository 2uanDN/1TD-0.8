import React, { useEffect, useState } from 'react';
import {
  ActionPresetColor,
  isValidActionColor,
  resolveActionColorHex,
} from '../../types';
import { resolvePresetLabel } from './ActionIcon';

export interface ColorPickerProps {
  value: string;
  onChange: (color: string) => void;
}

interface PresetOption {
  key: ActionPresetColor;
  title: string;
  subtitle: string;
  indicatorClass: string;
}

const PRESET_OPTIONS: ReadonlyArray<PresetOption> = [
  {
    key: 'chartreuse',
    title: 'Chartreuse',
    subtitle: 'Năng lượng · Khởi động',
    indicatorClass: 'color-swatch-indicator--chartreuse',
  },
  {
    key: 'terracotta',
    title: 'Terracotta',
    subtitle: 'Thể chất · Vận động',
    indicatorClass: 'color-swatch-indicator--terracotta',
  },
  {
    key: 'lavender',
    title: 'Lavender',
    subtitle: 'Tập trung · Sáng tạo',
    indicatorClass: 'color-swatch-indicator--lavender',
  },
  {
    key: 'mint',
    title: 'Mint',
    subtitle: 'Phục hồi · Dinh dưỡng',
    indicatorClass: 'color-swatch-indicator--mint',
  },
];

export const ColorPicker: React.FC<ColorPickerProps> = ({ value, onChange }) => {
  const activePreset = resolvePresetLabel(value);
  const resolvedHex = resolveActionColorHex(value);
  const [hexDraft, setHexDraft] = useState<string>(resolvedHex);

  useEffect(() => {
    setHexDraft(resolveActionColorHex(value));
  }, [value]);

  const handleHexInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const raw = event.target.value;
    setHexDraft(raw);
    if (isValidActionColor(raw)) {
      onChange(raw.trim());
    }
  };

  const isDraftValid = isValidActionColor(hexDraft);

  return (
    <div className="color-picker" role="group" aria-label="Chọn màu sắc hành động">
      <div className="color-swatch-grid">
        {PRESET_OPTIONS.map((preset) => {
          const isSelected =
            value.trim().toLowerCase() === preset.key ||
            activePreset === preset.key;

          return (
            <button
              key={preset.key}
              type="button"
              className="color-swatch-btn"
              aria-pressed={isSelected}
              aria-label={`Chọn màu ${preset.title} (${preset.subtitle})`}
              onClick={() => onChange(preset.key)}
            >
              <div>
                <p className="type-body-sm">{preset.title}</p>
                <p className="type-mono-badge text-muted">{preset.subtitle}</p>
              </div>
              <span
                className={`color-swatch-indicator ${preset.indicatorClass}`}
                aria-hidden="true"
              />
            </button>
          );
        })}
      </div>

      <div className="library-search-row">
        <div className="ledger-input-wrap">
          <input
            type="text"
            className="ledger-input ledger-input--mono"
            value={hexDraft}
            maxLength={7}
            placeholder="MÃ HEX (#RRGGBB)"
            aria-label="Nhập mã màu Hex tùy chỉnh theo định dạng #RRGGBB"
            aria-invalid={!isDraftValid}
            onChange={handleHexInputChange}
          />
        </div>
        <span className="type-mono-badge text-muted">
          {isDraftValid ? `ĐANG DÙNG · ${resolvedHex}` : 'ĐỊNH DẠNG #RRGGBB'}
        </span>
      </div>
    </div>
  );
};

export default ColorPicker;
