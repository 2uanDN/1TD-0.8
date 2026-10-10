import React, { useCallback, useRef, useState } from 'react';
import { Download, HardDrive, Moon, Monitor, RefreshCw, ShieldCheck, Sun, Trash2, Upload } from 'lucide-react';
import { ActionIcon } from '../components/shared/ActionIcon';
import { IconPicker } from '../components/shared/IconPicker';
import { useActions } from '../hooks/useActions';
import { useEvents } from '../hooks/useEvents';
import { useSettings } from '../hooks/useSettings';
import { formatDate, formatTime } from '../lib/time';
import { MAX_ACTIONS_LIMIT } from '../storage/actions';
import { ThemePreference } from '../types';

const THEME_OPTIONS: ReadonlyArray<{ id: ThemePreference; label: string; ariaLabel: string }> = [
  { id: 'dark', label: 'TỐI (DARK)', ariaLabel: 'Chọn giao diện tối (Dark theme)' },
  { id: 'light', label: 'SÁNG (LIGHT)', ariaLabel: 'Chọn giao diện sáng (Light theme)' },
  { id: 'system', label: 'HỆ THỐNG (SYSTEM)', ariaLabel: 'Chọn giao diện theo hệ thống (System theme)' },
];

const GAUGE_SEGMENTS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9] as const;

export const SettingsView: React.FC = () => {
  const { actions, activeActions } = useActions();
  const { allEvents } = useEvents();
  const {
    settings, resolvedTheme, storageInfo, isExportOverdue, daysSinceLastExport,
    isExporting, isImporting, isDeletingAll, isOnline, isStandalone, swStatus,
    setTheme, setDefaultIcon, requestPersistence, refreshStorageEstimate,
    handleExportData, handleImportData, handleDeleteAllData,
    checkForSwUpdate, simulateSwUpdate,
  } = useSettings();

  const [isIconPickerOpen, setIsIconPickerOpen] = useState<boolean>(false);
  const [isConfirmingDeleteAll, setIsConfirmingDeleteAll] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const filledSegments = Math.max(
    storageInfo.usageBytes > 0 ? 1 : 0,
    Math.min(10, Math.ceil(storageInfo.usageRatio * 10))
  );

  const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (file) await handleImportData(await file.text());
  }, [handleImportData]);

  const handleConfirmDeleteAll = useCallback(async () => {
    if (await handleDeleteAllData()) setIsConfirmingDeleteAll(false);
  }, [handleDeleteAllData]);

  return (
    <div className="view-panel">
      <section className="view-section" aria-labelledby="settings-header-title">
        <div className="shell-header-row">
          <span className="type-mono-label text-secondary">SETTINGS · CẤU HÌNH &amp; DỮ LIỆU CỤC BỘ</span>
          <span className="type-mono-metric text-acid" aria-live="polite">
            THEME: {settings.theme.toUpperCase()} ({resolvedTheme.toUpperCase()})
          </span>
        </div>
        <div>
          <h1 id="settings-header-title" className="type-headline-lg">Cài đặt &amp; Quản lý dữ liệu</h1>
          <p className="type-editorial-italic text-muted">Toàn bộ dữ liệu lưu trữ cục bộ 100% trên thiết bị. Không máy chủ, không tài khoản.</p>
        </div>
      </section>

      {isExportOverdue && (
        <section className="shell-banner shell-banner--warn" role="status" aria-live="polite">
          <div>
            <p className="type-mono-badge text-acid">NHẮC NHỞ SAO LƯU ĐỊNH KỲ (RISKS #6 &amp; #13)</p>
            <p className="type-body-sm text-muted">
              {daysSinceLastExport === null
                ? 'Bạn chưa từng xuất bản sao lưu JSON. Hãy xuất định kỳ mỗi tuần để phòng ngừa mất dữ liệu trình duyệt.'
                : `Đã ${daysSinceLastExport} ngày kể từ lần sao lưu gần nhất. Khuyến nghị xuất tệp JSON mỗi 7 ngày.`}
            </p>
          </div>
          <button type="button" className="shell-cta-btn" aria-label="Sao lưu dữ liệu ra tệp JSON ngay" disabled={isExporting} onClick={() => void handleExportData()}>
            <Download size={15} aria-hidden="true" />
            <span>Sao lưu ngay</span>
          </button>
        </section>
      )}

      {storageInfo.isQuotaWarning && (
        <section className="shell-banner shell-banner--warn" role="alert">
          <div>
            <p className="type-mono-badge text-acid">CẢNH BÁO DUNG LƯỢNG BỘ NHỚ (&gt; 70% QUOTA)</p>
            <p className="type-body-sm text-muted">Bộ nhớ cục bộ đã dùng {storageInfo.usagePercent.toFixed(1)}% hạn mức trình duyệt. Hãy xuất tệp JSON dự phòng ngay.</p>
          </div>
        </section>
      )}

      <section className="view-section" aria-labelledby="settings-theme-title">
        <div className="view-section-header">
          <h2 id="settings-theme-title" className="type-headline-sm">Giao diện &amp; Biểu tượng mặc định</h2>
          <span className="type-mono-badge text-muted">1TD:SETTINGS</span>
        </div>
        <div className="action-form-field">
          <span className="type-mono-label text-secondary">01 · CHẾ ĐỘ HIỂN THỊ (DARK / LIGHT / SYSTEM)</span>
          <div className="library-filter-bar" role="group" aria-label="Tùy chọn chế độ giao diện">
            {THEME_OPTIONS.map((opt) => (
              <button key={opt.id} type="button" className="library-filter-btn" aria-pressed={settings.theme === opt.id} aria-label={opt.ariaLabel} onClick={() => setTheme(opt.id)}>
                {opt.id === 'dark' ? <Moon size={15} aria-hidden="true" /> : opt.id === 'light' ? <Sun size={15} aria-hidden="true" /> : <Monitor size={15} aria-hidden="true" />}
                <span className="type-mono-badge">{opt.label}</span>
              </button>
            ))}
          </div>
        </div>
        <div className="action-form-field">
          <div className="view-row-between">
            <div>
              <span className="type-mono-label text-secondary">02 · BIỂU TƯỢNG MẶC ĐỊNH CHO MẪU MỚI</span>
              <p className="type-body-sm text-muted">Áp dụng sẵn khi mở ngăn tạo mẫu hành động mới trong Thư viện.</p>
            </div>
            <button type="button" className="shell-ghost-btn" aria-expanded={isIconPickerOpen} aria-label={`Đổi biểu tượng mặc định (hiện tại: ${settings.default_icon})`} onClick={() => setIsIconPickerOpen((prev) => !prev)}>
              <ActionIcon name={settings.default_icon} size={16} />
              <span>{settings.default_icon} · {isIconPickerOpen ? 'Thu gọn' : 'Đổi icon'}</span>
            </button>
          </div>
          {isIconPickerOpen && <IconPicker value={settings.default_icon} onChange={(icon) => { setDefaultIcon(icon); setIsIconPickerOpen(false); }} />}
        </div>
      </section>

      <section className="view-section" aria-labelledby="settings-storage-title">
        <div className="view-section-header">
          <h2 id="settings-storage-title" className="type-headline-sm">Dung lượng &amp; Chẩn đoán PWA Ngoại tuyến</h2>
          <span className="type-mono-badge text-acid">{storageInfo.isPersisted ? 'BỀN VỮNG (PERSISTENT)' : 'TIÊU CHUẨN (BEST-EFFORT)'}</span>
        </div>
        <div className="storage-meter-wrap">
          <div className="view-row-between">
            <span className="type-mono-label text-muted">SỬ DỤNG: {storageInfo.formattedUsage} / {storageInfo.formattedQuota}</span>
            <span className="type-mono-metric text-acid">{storageInfo.usagePercent.toFixed(1)}%</span>
          </div>
          <div className="storage-gauge" role="meter" aria-label="Mức sử dụng bộ nhớ cục bộ" aria-valuenow={Math.round(storageInfo.usagePercent)} aria-valuemin={0} aria-valuemax={100}>
            {GAUGE_SEGMENTS.map((seg) => (
              <span key={seg} className={seg < filledSegments ? (storageInfo.isQuotaWarning ? 'storage-gauge-segment storage-gauge-segment--warn' : 'storage-gauge-segment storage-gauge-segment--filled') : 'storage-gauge-segment'} />
            ))}
          </div>
        </div>
        <div className="view-grid-2col">
          <div className="view-cell">
            <span className="type-mono-label text-muted">INDEXEDDB &amp; LOCALSTORAGE</span>
            <span className="type-mono-metric text-acid">{allEvents.length} LOG · {storageInfo.formattedLocalStorage}</span>
            <span className="type-body-sm text-muted">{activeActions.length}/{actions.length} mẫu (tối đa {MAX_ACTIONS_LIMIT})</span>
          </div>
          <div className="view-cell">
            <span className="type-mono-label text-muted">PWA · SW SCOPE &ldquo;/&rdquo;</span>
            <span className="type-mono-metric text-acid">{isOnline ? 'ONLINE' : 'OFFLINE'} · {swStatus.toUpperCase()}</span>
            <span className="type-body-sm text-muted">Chế độ: {isStandalone ? 'Standalone (Đã cài)' : 'Trình duyệt'} · Cache v1</span>
          </div>
        </div>
        <div className="library-filter-bar">
          <button type="button" className="shell-ghost-btn" aria-label="Kiểm tra lại dung lượng lưu trữ" onClick={() => void refreshStorageEstimate()}>
            <RefreshCw size={15} aria-hidden="true" /><span>Làm mới dung lượng</span>
          </button>
          {!storageInfo.isPersisted && (
            <button type="button" className="shell-ghost-btn" aria-label="Yêu cầu trình duyệt cấp quyền lưu trữ bền vững" onClick={() => void requestPersistence()}>
              <ShieldCheck size={15} aria-hidden="true" /><span>Lưu trữ bền vững</span>
            </button>
          )}
          <button type="button" className="shell-ghost-btn" aria-label="Kiểm tra bản cập nhật Service Worker" onClick={() => void checkForSwUpdate()}>Kiểm tra SW</button>
          <button type="button" className="shell-ghost-btn" aria-label="Kiểm thử thanh thông báo cập nhật Service Worker" onClick={simulateSwUpdate}>Thử banner cập nhật</button>
        </div>
      </section>

      <section className="view-section" aria-labelledby="settings-data-title">
        <div className="view-section-header">
          <h2 id="settings-data-title" className="type-headline-sm">Sao lưu, Khôi phục &amp; Xóa dữ liệu</h2>
          <span className="type-mono-label text-muted">{settings.last_export ? `SAO LƯU CUỐI: ${formatDate(settings.last_export)} ${formatTime(settings.last_export)}` : 'CHƯA TỪNG SAO LƯU'}</span>
        </div>
        <div className="library-filter-bar">
          <input ref={fileInputRef} type="file" accept=".json,application/json" hidden aria-label="Chọn tệp JSON để khôi phục dữ liệu" onChange={(e) => void handleFileChange(e)} />
          <button type="button" className="shell-cta-btn" aria-label="Xuất toàn bộ dữ liệu ra tệp JSON" disabled={isExporting} onClick={() => void handleExportData()}>
            <Download size={15} aria-hidden="true" /><span>Xuất toàn bộ JSON</span>
          </button>
          <button type="button" className="shell-ghost-btn" aria-label="Nhập dữ liệu từ tệp JSON" disabled={isImporting} onClick={() => fileInputRef.current?.click()}>
            <Upload size={15} aria-hidden="true" /><span>Nhập từ tệp JSON</span>
          </button>
          <button type="button" className="action-card-btn action-card-btn--danger" aria-label="Xóa toàn bộ dữ liệu trên thiết bị" disabled={isDeletingAll} onClick={() => setIsConfirmingDeleteAll(true)}>
            <Trash2 size={15} aria-hidden="true" /><span>Xóa toàn bộ dữ liệu</span>
          </button>
        </div>
        {isConfirmingDeleteAll && (
          <div className="event-delete-confirm" role="alertdialog" aria-labelledby="delete-all-confirm-title">
            <p id="delete-all-confirm-title" className="type-mono-badge text-acid">XÁC NHẬN XÓA VĨNH VIỄN TOÀN BỘ DỮ LIỆU?</p>
            <p className="type-body-sm text-muted">Xóa toàn bộ {allEvents.length} sự kiện trong IndexedDB, {actions.length} mẫu hành động và đặt lại cài đặt mặc định.</p>
            <div className="event-delete-actions">
              <button type="button" className="shell-ghost-btn" aria-label="Hủy xóa toàn bộ dữ liệu" onClick={() => setIsConfirmingDeleteAll(false)}>Hủy bỏ</button>
              <button type="button" className="action-card-btn action-card-btn--danger" aria-label="Xác nhận xóa vĩnh viễn toàn bộ dữ liệu" disabled={isDeletingAll} onClick={() => void handleConfirmDeleteAll()}>
                <HardDrive size={14} aria-hidden="true" /><span>Xác nhận xóa vĩnh viễn</span>
              </button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
};

export default SettingsView;
