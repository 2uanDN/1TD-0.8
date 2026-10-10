import React from 'react';
import { ArrowRight, Check, Plus, RotateCcw, ShieldAlert, Smartphone } from 'lucide-react';
import {
  ONBOARDING_COLOR_OPTIONS,
  ONBOARDING_PRESETS,
  REQUIRED_ONBOARDING_ACTIONS,
  useOnboarding,
} from '../../hooks/useOnboarding';
import { ActionIcon } from '../shared/ActionIcon';
import { Badge } from '../shared/Badge';
import { TapTile } from '../tiles/TapTile';
import { TimelineItem } from '../timeline/TimelineItem';

export interface OnboardingFlowProps {
  onComplete: () => void;
}

export const OnboardingFlow: React.FC<OnboardingFlowProps> = ({ onComplete }) => {
  const {
    step, activeActions, step2Actions, confirmedActionIds, step1ProgressCount,
    isStep1Ready, isStep2Ready, hasTestedUndo, customName, customColor,
    customIcon, formError, todayEvents, todayCountsByActionId,
    lastLoggedAtByActionId, latestUndoEvent, canUndo, setCustomName,
    setCustomColor, goToStep, handleSelectPreset, handleCreateCustomAction,
    handleConfirmStarterActions, handleTapActionInStep2,
    handleTriggerUndoDemo, handleLogSampleForUndo, handleComplete,
  } = useOnboarding(onComplete);

  return (
    <main className="onboarding-gate" aria-labelledby="onboarding-title">
      <section className="shell-viewport-plate">
        <div className="shell-header-row">
          <span className="type-mono-label text-secondary">1TD · HƯỚNG DẪN KHỞI TẠO 3 BƯỚC</span>
          <span className="type-mono-metric text-acid" aria-live="polite">0{step} / 03</span>
        </div>

        <div>
          <h1 id="onboarding-title" className="type-headline-lg">Nhật ký một chạm — Lưu trữ 100% trên thiết bị</h1>
          <p className="type-editorial-italic text-muted">Ghi nhận phải dễ hơn trì hoãn. Không tài khoản, không đám mây, hoạt động ngoại tuyến hoàn toàn.</p>
        </div>

        <nav className="onboarding-stepper" aria-label="Tiến trình khởi tạo 3 bước">
          <button type="button" className="onboarding-step-tab" aria-current={step === 1 ? 'step' : undefined} aria-label="Bước 1: Tạo ít nhất 2 mẫu hành động" onClick={() => goToStep(1)}>
            <span className={step === 1 || isStep1Ready ? 'type-mono-badge text-acid' : 'type-mono-badge text-muted'}>01 · TẠO MẪU</span>
            <span className="type-body-sm">{Math.min(step1ProgressCount, REQUIRED_ONBOARDING_ACTIONS)}/{REQUIRED_ONBOARDING_ACTIONS} mẫu</span>
          </button>
          <button type="button" className="onboarding-step-tab" aria-current={step === 2 ? 'step' : undefined} aria-label="Bước 2: Ghi nhận sự kiện đầu tiên bằng một chạm" onClick={() => goToStep(2)}>
            <span className={step === 2 || isStep2Ready ? 'type-mono-badge text-acid' : 'type-mono-badge text-muted'}>02 · GHI NHẬN</span>
            <span className="type-body-sm">{isStep2Ready ? 'Đã lưu' : '1 chạm'}</span>
          </button>
          <button type="button" className="onboarding-step-tab" aria-current={step === 3 ? 'step' : undefined} aria-label="Bước 3: Tìm hiểu cơ chế Hoàn tác 3 giây và hoàn tất" onClick={() => goToStep(3)}>
            <span className={step === 3 || hasTestedUndo ? 'type-mono-badge text-acid' : 'type-mono-badge text-muted'}>03 · HOÀN TÁC</span>
            <span className="type-body-sm">{hasTestedUndo ? 'Đã thử' : '3 giây'}</span>
          </button>
        </nav>

        {step === 1 && (
          <div className="view-panel" role="region" aria-labelledby="step1-heading">
            <div className="view-section-header">
              <h2 id="step1-heading" className="type-headline-sm">Bước 1: Chọn hoặc tạo ít nhất 2 mẫu hành động</h2>
              <span className="type-mono-badge text-acid" aria-live="polite">ĐÃ CHỌN {step1ProgressCount} / {REQUIRED_ONBOARDING_ACTIONS}</span>
            </div>
            <p className="type-body-sm text-muted">Chạm chọn từ gợi ý bên dưới hoặc tự nhập mẫu hành động của riêng bạn. Bạn chỉ cần tạo mẫu một lần duy nhất.</p>
            <div className="onboarding-preset-grid" role="group" aria-label="Mẫu hành động gợi ý nhanh">
              {ONBOARDING_PRESETS.map((preset) => {
                const matched = activeActions.find((a) => a.name.toLowerCase() === preset.name.toLowerCase());
                const isSelected = Boolean(matched && confirmedActionIds.includes(matched.id));
                return (
                  <button key={preset.name} type="button" className="onboarding-preset-btn" aria-pressed={isSelected} aria-label={`${isSelected ? 'Bỏ chọn' : 'Chọn'} mẫu hành động ${preset.name}`} onClick={() => handleSelectPreset(preset)}>
                    <Badge label={preset.group} color={preset.color} iconName={preset.icon} iconSize={15} />
                    <span className="onboarding-preset-title">{preset.name}</span>
                    <span className={isSelected ? 'type-mono-badge text-acid' : 'type-mono-badge text-muted'}>{isSelected ? <Check size={14} aria-hidden="true" /> : '+ CHỌN'}</span>
                  </button>
                );
              })}
            </div>
            <form className="onboarding-inline-form" onSubmit={handleCreateCustomAction} noValidate>
              <span className="type-mono-label text-secondary">HOẶC TỰ TẠO MẪU HÀNH ĐỘNG MỚI</span>
              <div className="library-search-row">
                <div className="ledger-input-wrap">
                  <input type="text" className="ledger-input" value={customName} maxLength={40} placeholder="Nhập tên: Chạy bộ, Thiền 10 phút..." aria-label="Tên mẫu hành động tự tạo" onChange={(e) => setCustomName(e.target.value)} />
                </div>
                <button type="submit" className="shell-ghost-btn" aria-label="Thêm mẫu hành động tự tạo">
                  <ActionIcon name={customIcon} size={15} />
                  <Plus size={15} aria-hidden="true" />
                  <span>Tạo mẫu</span>
                </button>
              </div>
              <div className="onboarding-color-row" role="group" aria-label="Màu sắc mẫu hành động">
                {ONBOARDING_COLOR_OPTIONS.map((c) => (
                  <button key={c.id} type="button" className="library-filter-btn" aria-pressed={customColor === c.id} aria-label={`Chọn màu ${c.label}`} onClick={() => setCustomColor(c.id)}>
                    <span className={`color-swatch-indicator color-swatch-indicator--${c.id}`} />
                    <span className="type-mono-badge">{c.label}</span>
                  </button>
                ))}
              </div>
              {formError && <p className="type-mono-label text-acid" role="alert">{formError}</p>}
            </form>
            <div className="onboarding-footer">
              <button type="button" className="shell-ghost-btn" aria-label="Dùng 2 mẫu mặc định sẵn có và chuyển sang Bước 2" onClick={handleConfirmStarterActions}>Dùng mẫu sẵn có ({Math.max(activeActions.length, REQUIRED_ONBOARDING_ACTIONS)})</button>
              <button type="button" className="shell-cta-btn" aria-label="Tiếp tục sang Bước 2: Ghi nhận sự kiện đầu tiên" onClick={() => (isStep1Ready ? goToStep(2) : handleConfirmStarterActions())}>
                <span>Tiếp tục Bước 02</span>
                <ArrowRight size={15} aria-hidden="true" />
              </button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="view-panel" role="region" aria-labelledby="step2-heading">
            <div className="view-section-header">
              <h2 id="step2-heading" className="type-headline-sm">Bước 2: Chạm một ô để ghi nhận sự kiện đầu tiên</h2>
              <span className="type-mono-badge text-acid" aria-live="polite">{isStep2Ready ? `${todayEvents.length} ĐÃ GHI NHẬN` : 'CHỜ CHẠM'}</span>
            </div>
            <p className="type-body-sm text-muted">Chạm bất kỳ ô hành động nào bên dưới. 1TD lưu tức thì vào IndexedDB với thời gian thực của thiết bị mà không hiện hộp thoại hỏi lại.</p>
            <div className="tile-grid" role="group" aria-label="Bảng chạm thử ghi nhận nhanh">
              {step2Actions.map((action) => (
                <TapTile key={action.id} action={action} todayCount={todayCountsByActionId[action.id] ?? 0} lastLoggedAt={lastLoggedAtByActionId[action.id]} onTap={(a) => void handleTapActionInStep2(a)} />
              ))}
            </div>
            {todayEvents.length > 0 ? (
              <div className="timeline-feed" aria-label="Bản ghi vừa lưu hôm nay">
                {todayEvents.slice(0, 2).map((evt) => (
                  <TimelineItem key={evt.id} event={evt} onUndo={(e) => void handleTriggerUndoDemo(e)} />
                ))}
              </div>
            ) : (
              <div className="timeline-empty">
                <span className="type-mono-badge text-secondary">CHƯA CÓ BẢN GHI TRONG NGÀY</span>
                <p className="type-body-sm text-muted">Hãy chạm một ô hành động phía trên để lưu bản ghi đầu tiên.</p>
              </div>
            )}
            <div className="onboarding-footer">
              <button type="button" className="shell-ghost-btn" aria-label="Quay lại Bước 1" onClick={() => goToStep(1)}>Quay lại Bước 01</button>
              <button type="button" className="shell-cta-btn" aria-label="Tiếp tục sang Bước 3: Hiểu cơ chế hoàn tác" onClick={() => goToStep(3)}>
                <span>Tiếp tục Bước 03</span>
                <ArrowRight size={15} aria-hidden="true" />
              </button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="view-panel" role="region" aria-labelledby="step3-heading">
            <div className="view-section-header">
              <h2 id="step3-heading" className="type-headline-sm">Bước 3: Hoàn tác 3 giây &amp; Nguyên tắc lưu trữ cục bộ</h2>
              <span className="type-mono-badge text-acid" aria-live="polite">{hasTestedUndo ? 'ĐÃ THỬ HOÀN TÁC' : 'SẴN SÀNG'}</span>
            </div>
            <p className="type-body-sm text-muted">Vì 1TD không bao giờ làm gián đoạn bạn bằng hộp thoại &ldquo;Bạn có chắc không?&rdquo;, thanh <strong>Hoàn tác 3 giây</strong> luôn xuất hiện ngay sau mỗi lần chạm nhầm.</p>
            <div className="onboarding-inline-form">
              <div className="view-row-between">
                <span className="type-mono-label text-secondary">THỬ NGHIỆM HOÀN TÁC TỨC THÌ</span>
                <span className="type-mono-badge text-acid">{hasTestedUndo ? 'ĐÃ XÁC NHẬN HOÀN TÁC' : canUndo ? 'CÓ THỂ HOÀN TÁC NGAY' : 'HÀNG ĐỢI TRỐNG'}</span>
              </div>
              {canUndo && latestUndoEvent ? (
                <div className="view-row-between">
                  <span className="type-body-sm">Bản ghi gần nhất: <strong>{latestUndoEvent.action_name_snapshot}</strong></span>
                  <button type="button" className="shell-ghost-btn" aria-label={`Hoàn tác thử bản ghi ${latestUndoEvent.action_name_snapshot}`} onClick={() => void handleTriggerUndoDemo()}>
                    <RotateCcw size={15} aria-hidden="true" />
                    <span>Thử hoàn tác ngay</span>
                  </button>
                </div>
              ) : (
                <div className="view-row-between">
                  <span className="type-body-sm text-muted">{hasTestedUndo ? 'Bạn đã hoàn tác thành công! Có thể chạm ghi nhận lại nếu muốn.' : 'Chạm tạo 1 bản ghi mẫu để kích hoạt nút Hoàn tác.'}</span>
                  <button type="button" className="shell-ghost-btn" aria-label="Ghi nhận thử một hoạt động để kiểm tra hoàn tác" onClick={() => void handleLogSampleForUndo()}>+ Ghi nhận thử</button>
                </div>
              )}
            </div>
            <div className="view-grid-2col">
              <div className="view-cell">
                <span className="type-mono-badge text-acid"><ShieldAlert size={13} aria-hidden="true" /> 100% CỤC BỘ &amp; SAO LƯU JSON</span>
                <p className="type-body-sm text-muted">Dữ liệu chỉ lưu trên trình duyệt thiết bị này. Hãy xuất tệp JSON định kỳ mỗi tuần trong mục <strong>SETTINGS</strong> để tránh mất dữ liệu khi xóa bộ nhớ trình duyệt.</p>
              </div>
              <div className="view-cell">
                <span className="type-mono-badge text-secondary"><Smartphone size={13} aria-hidden="true" /> LƯU Ý iOS SAFARI</span>
                <p className="type-body-sm text-muted">Trên iPhone/iPad, hãy chọn <strong>Thêm vào Màn hình chính</strong> và sử dụng thường xuyên để ngăn Safari tự động thu hồi bộ nhớ ngoại tuyến sau 7 ngày không mở.</p>
              </div>
            </div>
            <div className="onboarding-footer">
              <button type="button" className="shell-ghost-btn" aria-label="Quay lại Bước 2" onClick={() => goToStep(2)}>Quay lại Bước 02</button>
              <button type="button" className="shell-cta-btn" aria-label="Hoàn tất hướng dẫn khởi tạo và vào màn hình chính 1TD" onClick={handleComplete}>
                <span>Bắt đầu sử dụng 1TD</span>
                <Check size={15} aria-hidden="true" />
              </button>
            </div>
          </div>
        )}
      </section>
    </main>
  );
};

export default OnboardingFlow;
