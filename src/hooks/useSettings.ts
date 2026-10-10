import { useCallback, useEffect, useMemo, useState } from 'react';
import { downloadJsonFile, exportToJSON, importFromJSON } from '../lib/exportImport';
import { clearAllActions } from '../storage/actions';
import {
  getLocalStorageUsageBytes,
  getSettings as storageGetSettings,
  resetSettings as storageResetSettings,
  saveSettings as storageSaveSettings,
  SETTINGS_STORAGE_KEY,
} from '../storage/settings';
import { useUIStore } from '../store/uiStore';
import { Settings, ThemePreference } from '../types';
import { useActions } from './useActions';
import { useEvents } from './useEvents';
import { useSuggestions } from './useSuggestions';

export const QUOTA_WARNING_THRESHOLD = 0.7;
export const EXPORT_REMINDER_DAYS = 7;
const DEFAULT_FALLBACK_QUOTA_BYTES = 50 * 1024 * 1024; // 50 MB fallback per RISKS.md #6

export interface StorageEstimateInfo {
  usageBytes: number;
  quotaBytes: number;
  usageRatio: number;
  usagePercent: number;
  isQuotaWarning: boolean;
  localStorageBytes: number;
  isPersisted: boolean | null;
  formattedUsage: string;
  formattedQuota: string;
  formattedLocalStorage: string;
}

type SettingsListener = (settings: Settings) => void;

const settingsListeners = new Set<SettingsListener>();
let cachedSettings: Settings | null = null;

function readInitialSettings(): Settings {
  if (cachedSettings !== null) {
    return cachedSettings;
  }
  cachedSettings = storageGetSettings();
  return cachedSettings;
}

function broadcastSettings(nextSettings: Settings): void {
  cachedSettings = nextSettings;
  settingsListeners.forEach((listener) => {
    listener(nextSettings);
  });
}

function resolveEffectiveTheme(preference: ThemePreference): 'dark' | 'light' {
  if (preference === 'light') {
    return 'light';
  }
  if (preference === 'dark') {
    return 'dark';
  }
  if (typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
    return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
  }
  return 'dark';
}

function applyThemeToDocument(resolvedTheme: 'dark' | 'light'): void {
  if (typeof document === 'undefined') {
    return;
  }
  const root = document.documentElement;
  root.setAttribute('data-theme', resolvedTheme);
  root.style.colorScheme = resolvedTheme;

  const metaThemeColor = document.querySelector('meta[name="theme-color"]');
  if (metaThemeColor) {
    metaThemeColor.setAttribute(
      'content',
      resolvedTheme === 'light' ? '#f5f6f0' : '#101411'
    );
  }
}

export function formatStorageBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) {
    return '0 B';
  }
  if (bytes < 1024) {
    return `${Math.round(bytes)} B`;
  }
  const kb = bytes / 1024;
  if (kb < 1024) {
    return `${kb.toFixed(1)} KB`;
  }
  const mb = kb / 1024;
  if (mb < 1024) {
    return `${mb.toFixed(2)} MB`;
  }
  const gb = mb / 1024;
  return `${gb.toFixed(2)} GB`;
}

export interface UseSettingsResult {
  settings: Settings;
  resolvedTheme: 'dark' | 'light';
  storageInfo: StorageEstimateInfo;
  isExportOverdue: boolean;
  daysSinceLastExport: number | null;
  isExporting: boolean;
  isImporting: boolean;
  isDeletingAll: boolean;
  isOnline: boolean;
  isStandalone: boolean;
  swStatus: 'active' | 'waiting' | 'unsupported';
  setTheme: (theme: ThemePreference) => void;
  setDefaultIcon: (iconName: string) => void;
  requestPersistence: () => Promise<boolean>;
  refreshStorageEstimate: () => Promise<void>;
  refreshSettings: () => void;
  handleExportData: () => Promise<void>;
  handleImportData: (jsonText: string) => Promise<boolean>;
  handleDeleteAllData: () => Promise<boolean>;
  checkForSwUpdate: () => Promise<void>;
  simulateSwUpdate: () => void;
}

export function useSettings(): UseSettingsResult {
  const showToast = useUIStore((state) => state.showToast);
  const { actions, refreshActions } = useActions();
  const { allEvents, refreshEvents, clearEvents } = useEvents();
  const { recomputeSuggestions } = useSuggestions();

  const [settings, setSettings] = useState<Settings>(() => readInitialSettings());
  const [resolvedTheme, setResolvedTheme] = useState<'dark' | 'light'>(() =>
    resolveEffectiveTheme(readInitialSettings().theme)
  );
  const [rawUsageBytes, setRawUsageBytes] = useState<number>(0);
  const [rawQuotaBytes, setRawQuotaBytes] = useState<number>(DEFAULT_FALLBACK_QUOTA_BYTES);
  const [localStorageBytes, setLocalStorageBytes] = useState<number>(() =>
    getLocalStorageUsageBytes()
  );
  const [isPersisted, setIsPersisted] = useState<boolean | null>(null);
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [isImporting, setIsImporting] = useState<boolean>(false);
  const [isDeletingAll, setIsDeletingAll] = useState<boolean>(false);
  const [isOnline, setIsOnline] = useState<boolean>(() =>
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const [isStandalone, setIsStandalone] = useState<boolean>(() =>
    typeof window !== 'undefined' && typeof window.matchMedia === 'function'
      ? window.matchMedia('(display-mode: standalone)').matches ||
        (window.navigator as unknown as { standalone?: boolean }).standalone === true
      : false
  );
  const [swStatus, setSwStatus] = useState<'active' | 'waiting' | 'unsupported'>(() =>
    typeof navigator !== 'undefined' && 'serviceWorker' in navigator ? 'active' : 'unsupported'
  );

  const refreshSettings = useCallback(() => {
    const fresh = storageGetSettings();
    broadcastSettings(fresh);
  }, []);

  const refreshStorageEstimate = useCallback(async () => {
    const localBytes = getLocalStorageUsageBytes();
    setLocalStorageBytes(localBytes);

    if (typeof navigator === 'undefined' || !navigator.storage) {
      setRawUsageBytes(localBytes);
      return;
    }

    try {
      if (typeof navigator.storage.estimate === 'function') {
        const estimate = await navigator.storage.estimate();
        const estimatedUsage =
          typeof estimate.usage === 'number' && estimate.usage >= 0
            ? Math.max(estimate.usage, localBytes)
            : localBytes;
        const estimatedQuota =
          typeof estimate.quota === 'number' && estimate.quota > 0
            ? estimate.quota
            : DEFAULT_FALLBACK_QUOTA_BYTES;

        setRawUsageBytes(estimatedUsage);
        setRawQuotaBytes(estimatedQuota);
      } else {
        setRawUsageBytes(localBytes);
      }

      if (typeof navigator.storage.persisted === 'function') {
        const persisted = await navigator.storage.persisted();
        setIsPersisted(persisted);
      }
    } catch (error: unknown) {
      console.warn('[1TD][useSettings] Storage estimate check failed:', error);
      setRawUsageBytes(localBytes);
    }
  }, []);

  useEffect(() => {
    settingsListeners.add(setSettings);

    const handleStorageEvent = (event: StorageEvent) => {
      if (event.key === null || event.key === SETTINGS_STORAGE_KEY) {
        const fresh = storageGetSettings();
        broadcastSettings(fresh);
      }
    };
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('storage', handleStorageEvent);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
      void navigator.serviceWorker
        .getRegistration('/')
        .then((reg) => {
          if (reg?.waiting) {
            setSwStatus('waiting');
          } else {
            setSwStatus('active');
          }
        })
        .catch(() => {
          setSwStatus('active');
        });
    }

    return () => {
      settingsListeners.delete(setSettings);
      window.removeEventListener('storage', handleStorageEvent);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    const updateResolvedTheme = () => {
      const nextResolved = resolveEffectiveTheme(settings.theme);
      setResolvedTheme(nextResolved);
      applyThemeToDocument(nextResolved);
    };

    updateResolvedTheme();

    if (
      settings.theme === 'system' &&
      typeof window !== 'undefined' &&
      typeof window.matchMedia === 'function'
    ) {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: light)');
      const handleMediaChange = () => updateResolvedTheme();
      mediaQuery.addEventListener('change', handleMediaChange);
      return () => {
        mediaQuery.removeEventListener('change', handleMediaChange);
      };
    }

    return undefined;
  }, [settings.theme]);

  useEffect(() => {
    void refreshStorageEstimate();
  }, [actions.length, allEvents.length, settings.last_export, refreshStorageEstimate]);

  const storageInfo = useMemo<StorageEstimateInfo>(() => {
    const safeQuota = rawQuotaBytes > 0 ? rawQuotaBytes : DEFAULT_FALLBACK_QUOTA_BYTES;
    const safeUsage = Math.max(rawUsageBytes, localStorageBytes);
    const usageRatio = Math.min(1, Math.max(0, safeUsage / safeQuota));
    const usagePercent = Math.round(usageRatio * 1000) / 10;

    return {
      usageBytes: safeUsage,
      quotaBytes: safeQuota,
      usageRatio,
      usagePercent,
      isQuotaWarning: usageRatio > QUOTA_WARNING_THRESHOLD,
      localStorageBytes,
      isPersisted,
      formattedUsage: formatStorageBytes(safeUsage),
      formattedQuota: formatStorageBytes(safeQuota),
      formattedLocalStorage: formatStorageBytes(localStorageBytes),
    };
  }, [rawUsageBytes, rawQuotaBytes, localStorageBytes, isPersisted]);

  const { isExportOverdue, daysSinceLastExport } = useMemo(() => {
    if (!settings.last_export) {
      return { isExportOverdue: true, daysSinceLastExport: null };
    }
    const lastMs = new Date(settings.last_export).getTime();
    if (Number.isNaN(lastMs)) {
      return { isExportOverdue: true, daysSinceLastExport: null };
    }
    const elapsedDays = Math.floor((Date.now() - lastMs) / (24 * 3600 * 1000));
    return {
      isExportOverdue: elapsedDays >= EXPORT_REMINDER_DAYS,
      daysSinceLastExport: Math.max(0, elapsedDays),
    };
  }, [settings.last_export]);

  const setTheme = useCallback(
    (theme: ThemePreference) => {
      try {
        const updated = storageSaveSettings({ theme });
        broadcastSettings(updated);
        const label =
          theme === 'dark'
            ? 'Tối (Dark)'
            : theme === 'light'
              ? 'Sáng (Light)'
              : 'Theo hệ thống (System)';
        showToast(`Đã chuyển giao diện sang chế độ ${label}.`);
      } catch (error: unknown) {
        console.error('[1TD][useSettings] Failed to update theme:', error);
        showToast('Không thể lưu tùy chọn giao diện.');
      }
    },
    [showToast]
  );

  const setDefaultIcon = useCallback(
    (iconName: string) => {
      try {
        const updated = storageSaveSettings({ default_icon: iconName });
        broadcastSettings(updated);
        showToast(`Đã đặt biểu tượng mặc định: ${updated.default_icon}.`);
      } catch (error: unknown) {
        console.error('[1TD][useSettings] Failed to update default_icon:', error);
        showToast('Không thể lưu biểu tượng mặc định.');
      }
    },
    [showToast]
  );

  const requestPersistence = useCallback(async (): Promise<boolean> => {
    if (
      typeof navigator === 'undefined' ||
      !navigator.storage ||
      typeof navigator.storage.persist !== 'function'
    ) {
      showToast('Trình duyệt không hỗ trợ API lưu trữ bền vững.');
      return false;
    }

    try {
      const granted = await navigator.storage.persist();
      setIsPersisted(granted);
      if (granted) {
        showToast('Đã kích hoạt chế độ lưu trữ bền vững trên thiết bị.');
      } else {
        showToast(
          'Trình duyệt chưa cấp quyền bền vững. Hãy xuất tệp JSON sao lưu định kỳ.'
        );
      }
      return granted;
    } catch (error: unknown) {
      console.warn('[1TD][useSettings] Persistent storage request failed:', error);
      showToast('Không thể yêu cầu quyền lưu trữ bền vững.');
      return false;
    }
  }, [showToast]);

  const checkForSwUpdate = useCallback(async () => {
    if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) {
      showToast('Trình duyệt hiện tại không hỗ trợ Service Worker.');
      return;
    }
    try {
      const reg = await navigator.serviceWorker.getRegistration('/');
      if (!reg) {
        showToast('Service Worker đang ở chế độ phát triển cục bộ.');
        return;
      }
      await reg.update();
      if (reg.waiting) {
        setSwStatus('waiting');
        window.dispatchEvent(new CustomEvent('1td:simulate-sw-update'));
        showToast('Phát hiện bản cập nhật mới — Thanh cập nhật đã hiển thị.');
      } else {
        setSwStatus('active');
        showToast('Bạn đang sử dụng phiên bản 1TD mới nhất (Scope /).');
      }
    } catch (error: unknown) {
      console.warn('[1TD][useSettings] SW update check failed:', error);
      showToast('Đang ngoại tuyến — Ứng dụng chạy từ bộ nhớ đệm Service Worker.');
    }
  }, [showToast]);

  const simulateSwUpdate = useCallback(() => {
    setSwStatus('waiting');
    window.dispatchEvent(new CustomEvent('1td:simulate-sw-update'));
    showToast('Đã kích hoạt thanh thông báo cập nhật Service Worker để kiểm thử.');
  }, [showToast]);

  const handleExportData = useCallback(async () => {
    if (isExporting) return;
    setIsExporting(true);
    try {
      const jsonContent = await exportToJSON();
      const filename = downloadJsonFile(jsonContent);
      refreshSettings();
      await refreshStorageEstimate();
      showToast(`Đã xuất ${allEvents.length} bản ghi ra tệp ${filename}.`);
    } catch (error: unknown) {
      console.error('[1TD][useSettings] Export JSON failed:', error);
      showToast('Không thể xuất dữ liệu JSON.');
    } finally {
      setIsExporting(false);
    }
  }, [allEvents.length, isExporting, refreshSettings, refreshStorageEstimate, showToast]);

  const handleImportData = useCallback(
    async (jsonText: string): Promise<boolean> => {
      if (isImporting) return false;
      setIsImporting(true);
      try {
        const result = await importFromJSON(jsonText);
        refreshActions();
        await refreshEvents();
        refreshSettings();
        recomputeSuggestions();
        await refreshStorageEstimate();
        showToast(result.message);
        return true;
      } catch (error: unknown) {
        console.error('[1TD][useSettings] Import JSON failed:', error);
        showToast(
          error instanceof Error ? error.message : 'Không thể nhập dữ liệu từ tệp JSON.'
        );
        return false;
      } finally {
        setIsImporting(false);
      }
    },
    [
      isImporting,
      refreshActions,
      refreshEvents,
      refreshSettings,
      recomputeSuggestions,
      refreshStorageEstimate,
      showToast,
    ]
  );

  const handleDeleteAllData = useCallback(async (): Promise<boolean> => {
    if (isDeletingAll) return false;
    setIsDeletingAll(true);
    try {
      const eventsCleared = await clearEvents();
      if (!eventsCleared) {
        return false;
      }
      clearAllActions();
      const reset = storageResetSettings();
      broadcastSettings(reset);
      refreshActions();
      await refreshEvents();
      recomputeSuggestions();
      await refreshStorageEstimate();
      showToast('Đã xóa toàn bộ dữ liệu và đặt lại cài đặt mặc định.');
      return true;
    } catch (error: unknown) {
      console.error('[1TD][useSettings] Failed to delete all data:', error);
      showToast('Không thể xóa toàn bộ dữ liệu trên thiết bị.');
      return false;
    } finally {
      setIsDeletingAll(false);
    }
  }, [
    clearEvents,
    isDeletingAll,
    refreshActions,
    refreshEvents,
    recomputeSuggestions,
    refreshStorageEstimate,
    showToast,
  ]);

  return {
    settings,
    resolvedTheme,
    storageInfo,
    isExportOverdue,
    daysSinceLastExport,
    isExporting,
    isImporting,
    isDeletingAll,
    isOnline,
    isStandalone,
    swStatus,
    setTheme,
    setDefaultIcon,
    requestPersistence,
    refreshStorageEstimate,
    refreshSettings,
    handleExportData,
    handleImportData,
    handleDeleteAllData,
    checkForSwUpdate,
    simulateSwUpdate,
  };
}
