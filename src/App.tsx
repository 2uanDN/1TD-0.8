import React, { Suspense, lazy, useEffect, useState } from 'react';
import { TopNav } from './components/nav/TopNav';
import { OnboardingFlow } from './components/onboarding/OnboardingFlow';
import { ErrorBoundary } from './components/shared/ErrorBoundary';
import { UndoToast } from './components/shared/UndoToast';
import { useSettings } from './hooks/useSettings';
import {
  clearTransientUndoStack,
  isOnboarded,
  ONBOARDED_STORAGE_KEY,
  setOnboarded,
} from './storage/settings';
import { useUIStore } from './store/uiStore';
import { LibraryView } from './views/LibraryView';
import { TodayView } from './views/TodayView';

const HistoryView = lazy(() => import('./views/HistoryView'));
const RhythmView = lazy(() => import('./views/RhythmView'));
const SettingsView = lazy(() => import('./views/SettingsView'));

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

export interface AppProps {
  waitingWorker?: ServiceWorker | null;
  isUpdateAvailable?: boolean;
  onConfirmUpdate?: () => void;
  onDismissUpdate?: () => void;
}

export const App: React.FC<AppProps> = ({
  waitingWorker,
  isUpdateAvailable,
  onConfirmUpdate,
  onDismissUpdate,
}) => {
  useSettings();
  const activeView = useUIStore((state) => state.activeView);
  const setActiveView = useUIStore((state) => state.setActiveView);

  const [hasOnboarded, setHasOnboarded] = useState<boolean>(() => isOnboarded());
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState<boolean>(false);
  const [isIOS, setIsIOS] = useState<boolean>(false);
  const [showIOSGuide, setShowIOSGuide] = useState<boolean>(false);
  const [isOnline, setIsOnline] = useState<boolean>(() =>
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );

  useEffect(() => {
    clearTransientUndoStack();
    setHasOnboarded(isOnboarded());

    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true;
    setIsInstalled(isStandalone);

    const userAgent = window.navigator.userAgent.toLowerCase();
    setIsIOS(/iphone|ipad|ipod/.test(userAgent));

    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setDeferredPrompt(event as BeforeInstallPromptEvent);
    };
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    };
    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === null || event.key === ONBOARDED_STORAGE_KEY) {
        setHasOnboarded(isOnboarded());
      }
    };
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);
    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    try {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setIsInstalled(true);
        setDeferredPrompt(null);
      }
    } catch (error: unknown) {
      console.error('[1TD] Install prompt failed:', error);
    }
  };

  const handleCompleteOnboarding = () => {
    setOnboarded(true);
    setHasOnboarded(true);
  };

  if (!hasOnboarded) {
    return (
      <div className="app-shell">
        <ErrorBoundary>
          <OnboardingFlow onComplete={handleCompleteOnboarding} />
        </ErrorBoundary>
        <UndoToast />
      </div>
    );
  }

  const showUpdateBanner = Boolean(isUpdateAvailable ?? waitingWorker) && Boolean(onConfirmUpdate);

  return (
    <div className="app-shell">
      <TopNav activeView={activeView} onSelectView={setActiveView} />

      <ErrorBoundary>
        <main className="shell-main">
          {!isOnline && (
            <section className="shell-banner" role="status" aria-live="polite">
              <div>
                <p className="type-mono-badge text-acid">CHẾ ĐỘ NGOẠI TUYẾN (OFFLINE) · 100% CỤC BỘ</p>
                <p className="type-body-sm text-muted">Không có kết nối mạng. Mọi tính năng ghi nhận, lịch sử, gợi ý và xuất JSON đều hoạt động bình thường trên thiết bị.</p>
              </div>
              <span className="type-mono-badge text-secondary">OFFLINE READY</span>
            </section>
          )}

          {showUpdateBanner && onConfirmUpdate && (
            <section className="shell-banner" role="status" aria-live="polite">
              <div>
                <p className="type-mono-badge text-acid">BẢN CẬP NHẬT SẴN SÀNG (UPDATE AVAILABLE)</p>
                <p className="type-body-sm text-muted">Phiên bản mới của 1TD đã tải xong trong nền. Tải lại để áp dụng bản cập nhật.</p>
              </div>
              <div className="library-filter-bar">
                {onDismissUpdate && (
                  <button type="button" className="shell-ghost-btn" aria-label="Bỏ qua thông báo cập nhật lúc này" onClick={onDismissUpdate}>Để sau</button>
                )}
                <button type="button" className="shell-cta-btn" aria-label="Tải lại ứng dụng để cập nhật" onClick={onConfirmUpdate}>Tải lại ngay</button>
              </div>
            </section>
          )}

          {!isInstalled && (deferredPrompt || isIOS) && (
            <section className="shell-banner" aria-label="Cài đặt ứng dụng 1TD">
              <div>
                <p className="type-mono-label text-secondary">1TD · OFFLINE-FIRST PWA</p>
                <p className="type-body-sm text-muted">Cài đặt 1TD lên màn hình chính để ghi nhận một chạm không cần mạng.</p>
              </div>
              {deferredPrompt ? (
                <button type="button" className="shell-ghost-btn" aria-label="Cài đặt ứng dụng 1TD vào thiết bị" onClick={handleInstallClick}>Cài đặt ứng dụng</button>
              ) : (
                <button type="button" className="shell-ghost-btn" aria-label="Hướng dẫn cài đặt 1TD trên iOS" onClick={() => setShowIOSGuide((prev) => !prev)}>Hướng dẫn iOS</button>
              )}
            </section>
          )}

          {showIOSGuide && !isInstalled && (
            <section className="shell-banner" role="region" aria-label="Hướng dẫn cài đặt trên iPhone và iPad">
              <div>
                <p className="type-headline-sm">Cài đặt trên iPhone / iPad</p>
                <p className="type-body-sm text-muted">Chạm nút Chia sẻ (Share) trên thanh công cụ Safari, sau đó chọn &ldquo;Thêm vào Màn hình chính&rdquo; (Add to Home Screen).</p>
              </div>
              <button type="button" className="shell-ghost-btn" aria-label="Đóng hướng dẫn cài đặt iOS" onClick={() => setShowIOSGuide(false)}>Đóng</button>
            </section>
          )}

          <div id="panel-today" role="tabpanel" aria-labelledby="tab-today" hidden={activeView !== 'today'} className={activeView === 'today' ? 'view-panel' : 'view-panel view-panel--hidden'}>
            <TodayView />
          </div>
          <div id="panel-library" role="tabpanel" aria-labelledby="tab-library" hidden={activeView !== 'library'} className={activeView === 'library' ? 'view-panel' : 'view-panel view-panel--hidden'}>
            <LibraryView />
          </div>
          <div id="panel-history" role="tabpanel" aria-labelledby="tab-history" hidden={activeView !== 'history'} className={activeView === 'history' ? 'view-panel' : 'view-panel view-panel--hidden'}>
            <ErrorBoundary>
              <Suspense fallback={<section className="view-section"><p className="type-mono-label text-muted">ĐANG TẢI HISTORY...</p></section>}>
                <HistoryView />
              </Suspense>
            </ErrorBoundary>
          </div>
          <div id="panel-rhythm" role="tabpanel" aria-labelledby="tab-rhythm" hidden={activeView !== 'rhythm'} className={activeView === 'rhythm' ? 'view-panel' : 'view-panel view-panel--hidden'}>
            <ErrorBoundary>
              <Suspense fallback={<section className="view-section"><p className="type-mono-label text-muted">ĐANG TẢI RHYTHM...</p></section>}>
                <RhythmView />
              </Suspense>
            </ErrorBoundary>
          </div>
          <div id="panel-settings" role="tabpanel" aria-labelledby="tab-settings" hidden={activeView !== 'settings'} className={activeView === 'settings' ? 'view-panel' : 'view-panel view-panel--hidden'}>
            <ErrorBoundary>
              <Suspense fallback={<section className="view-section"><p className="type-mono-label text-muted">ĐANG TẢI SETTINGS...</p></section>}>
                <SettingsView />
              </Suspense>
            </ErrorBoundary>
          </div>
        </main>
      </ErrorBoundary>

      <UndoToast />
    </div>
  );
};

export default App;
