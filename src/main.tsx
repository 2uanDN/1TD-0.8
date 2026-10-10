import React, { useCallback, useEffect, useState } from 'react';
import ReactDOM from 'react-dom/client';
import { Workbox } from 'workbox-window';
import './styles/tokens.css';
import './styles/base.css';
import './styles/typography.css';
import { App } from './App';
import { ErrorBoundary } from './components/shared/ErrorBoundary';
import { getDB, onDatabaseBlocked } from './db/schema';
import { useUIStore } from './store/uiStore';

async function requestPersistentStorage(): Promise<void> {
  if (typeof navigator !== 'undefined' && navigator.storage && navigator.storage.persist) {
    try {
      await navigator.storage.persist();
    } catch (error: unknown) {
      console.warn('[1TD] Persistent storage request failed:', error);
    }
  }
}

const RootBootstrapper: React.FC = () => {
  const [waitingWorker, setWaitingWorker] = useState<ServiceWorker | null>(null);
  const [isSimulatedUpdate, setIsSimulatedUpdate] = useState<boolean>(false);
  const [isUpdateDismissed, setIsUpdateDismissed] = useState<boolean>(false);

  useEffect(() => {
    void requestPersistentStorage();

    const unsubscribeBlocked = onDatabaseBlocked((messageVi) => {
      useUIStore.getState().showToast(messageVi, 6000);
    });

    void getDB().catch((error: unknown) => {
      console.warn('[1TD] IndexedDB initialization failed:', error);
    });

    const handleSimulateUpdate = () => {
      setIsSimulatedUpdate(true);
      setIsUpdateDismissed(false);
    };
    window.addEventListener('1td:simulate-sw-update', handleSimulateUpdate);

    let activeRegistration: ServiceWorkerRegistration | undefined;

    if ('serviceWorker' in navigator) {
      const wb = new Workbox('/sw.js', { scope: '/' });

      wb.addEventListener('waiting', (event) => {
        if (event.sw) {
          setWaitingWorker(event.sw);
          setIsUpdateDismissed(false);
        }
      });

      wb.register()
        .then((registration) => {
          activeRegistration = registration;
          if (registration?.waiting) {
            setWaitingWorker(registration.waiting);
            setIsUpdateDismissed(false);
          }

          registration?.addEventListener('updatefound', () => {
            const installing = registration.installing;
            if (!installing) return;
            installing.addEventListener('statechange', () => {
              if (
                installing.state === 'installed' &&
                navigator.serviceWorker.controller
              ) {
                setWaitingWorker(registration.waiting ?? installing);
                setIsUpdateDismissed(false);
              }
            });
          });
        })
        .catch((error: unknown) => {
          console.warn('[1TD] Service worker registration skipped or failed:', error);
        });
    }

    const handleVisibilityChange = () => {
      if (
        document.visibilityState === 'visible' &&
        navigator.onLine &&
        activeRegistration
      ) {
        void activeRegistration.update().catch(() => {
          // Ignore transient network errors when checking for SW updates
        });
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      unsubscribeBlocked();
      window.removeEventListener('1td:simulate-sw-update', handleSimulateUpdate);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  const handleConfirmUpdate = useCallback(() => {
    if (waitingWorker) {
      let hasReloaded = false;
      const reloadOnce = () => {
        if (hasReloaded) return;
        hasReloaded = true;
        window.location.reload();
      };

      waitingWorker.addEventListener('statechange', () => {
        if (waitingWorker.state === 'activated') {
          reloadOnce();
        }
      });

      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.addEventListener('controllerchange', reloadOnce);
      }

      waitingWorker.postMessage({ type: 'SKIP_WAITING' });
      return;
    }

    if (isSimulatedUpdate) {
      setIsSimulatedUpdate(false);
      window.location.reload();
    }
  }, [waitingWorker, isSimulatedUpdate]);

  const handleDismissUpdate = useCallback(() => {
    setIsUpdateDismissed(true);
    setIsSimulatedUpdate(false);
  }, []);

  const showUpdateBanner =
    (Boolean(waitingWorker) || isSimulatedUpdate) && !isUpdateDismissed;

  return (
    <ErrorBoundary>
      <App
        waitingWorker={waitingWorker}
        isUpdateAvailable={showUpdateBanner}
        onConfirmUpdate={handleConfirmUpdate}
        onDismissUpdate={handleDismissUpdate}
      />
    </ErrorBoundary>
  );
};

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('Root element #root not found in index.html');
}

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <RootBootstrapper />
  </React.StrictMode>
);
