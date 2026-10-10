import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { inferIconFromActionName } from '../components/shared/IconPicker';
import { DEFAULT_STARTER_ACTIONS } from '../storage/actions';
import { setOnboarded } from '../storage/settings';
import { useUIStore } from '../store/uiStore';
import { Action, ActionPresetColor, Event } from '../types';
import { useActions } from './useActions';
import { useEvents } from './useEvents';
import { useUndoStack } from './useUndoStack';

export type OnboardingStep = 1 | 2 | 3;

export interface OnboardingPreset {
  name: string;
  icon: string;
  color: ActionPresetColor;
  group: string;
}

export const ONBOARDING_PRESETS: ReadonlyArray<OnboardingPreset> = [
  { name: 'Ngủ dậy', icon: 'Sunrise', color: 'chartreuse', group: 'Buổi sáng' },
  { name: 'Uống cà phê', icon: 'Coffee', color: 'terracotta', group: 'Buổi sáng' },
  { name: 'Ăn sáng', icon: 'Utensils', color: 'mint', group: 'Dinh dưỡng' },
  { name: 'Bắt đầu làm việc', icon: 'Briefcase', color: 'lavender', group: 'Công việc' },
  { name: 'Uống nước ấm', icon: 'Droplets', color: 'mint', group: 'Sức khỏe' },
  { name: 'Đọc sách 20 phút', icon: 'BookOpen', color: 'lavender', group: 'Buổi tối' },
];

export const ONBOARDING_COLOR_OPTIONS: ReadonlyArray<{
  id: ActionPresetColor;
  label: string;
}> = [
  { id: 'chartreuse', label: 'Vàng Acid' },
  { id: 'terracotta', label: 'Đất Nung' },
  { id: 'mint', label: 'Bạc Hà' },
  { id: 'lavender', label: 'Oải Hương' },
];

export const REQUIRED_ONBOARDING_ACTIONS = 2;

export interface UseOnboardingResult {
  step: OnboardingStep;
  activeActions: Action[];
  step2Actions: Action[];
  confirmedActionIds: string[];
  step1ProgressCount: number;
  isStep1Ready: boolean;
  isStep2Ready: boolean;
  hasTestedUndo: boolean;
  customName: string;
  customColor: ActionPresetColor;
  customIcon: string;
  formError: string | null;
  todayEvents: Event[];
  todayCountsByActionId: Record<string, number>;
  lastLoggedAtByActionId: Record<string, string>;
  latestUndoEvent: Event | undefined;
  canUndo: boolean;
  setCustomName: (value: string) => void;
  setCustomColor: (color: ActionPresetColor) => void;
  goToStep: (nextStep: OnboardingStep) => void;
  handleSelectPreset: (preset: OnboardingPreset) => void;
  handleCreateCustomAction: (event: React.FormEvent<HTMLFormElement>) => void;
  handleConfirmStarterActions: () => void;
  handleTapActionInStep2: (action: Action) => Promise<void>;
  handleTriggerUndoDemo: (targetEvent?: Event) => Promise<void>;
  handleLogSampleForUndo: () => Promise<void>;
  handleComplete: () => void;
}

export function useOnboarding(onComplete: () => void): UseOnboardingResult {
  const { activeActions, createAction, editAction } = useActions();
  const {
    todayEvents,
    todayCountsByActionId,
    lastLoggedAtByActionId,
    logEvent,
  } = useEvents();
  const { canUndo, latestUndoEvent, executeUndo } = useUndoStack();
  const toastMessage = useUIStore((state) => state.toastMessage);
  const showToast = useUIStore((state) => state.showToast);
  const setActiveView = useUIStore((state) => state.setActiveView);

  const [step, setStep] = useState<OnboardingStep>(1);
  const [confirmedActionIds, setConfirmedActionIds] = useState<string[]>([]);
  const [hasLoggedInOnboarding, setHasLoggedInOnboarding] = useState<boolean>(
    () => todayEvents.length > 0
  );
  const [hasTestedUndo, setHasTestedUndo] = useState<boolean>(false);

  const [customName, setCustomNameState] = useState<string>('');
  const [customColor, setCustomColor] = useState<ActionPresetColor>('chartreuse');
  const [formError, setFormError] = useState<string | null>(null);

  const customIcon = useMemo(
    () => inferIconFromActionName(customName) ?? 'Activity',
    [customName]
  );

  // Detect if user triggered undo via the global UndoToast
  useEffect(() => {
    if (toastMessage && toastMessage.startsWith('Đã hoàn tác:')) {
      setHasTestedUndo(true);
    }
  }, [toastMessage]);

  useEffect(() => {
    if (todayEvents.length > 0) {
      setHasLoggedInOnboarding(true);
    }
  }, [todayEvents.length]);

  const setCustomName = useCallback((value: string) => {
    setCustomNameState(value);
    setFormError(null);
  }, []);

  const step1ProgressCount = confirmedActionIds.length;
  const isStep1Ready = step1ProgressCount >= REQUIRED_ONBOARDING_ACTIONS;
  const isStep2Ready = hasLoggedInOnboarding || todayEvents.length > 0;

  const step2Actions = useMemo(() => {
    const confirmed = activeActions.filter((a) => confirmedActionIds.includes(a.id));
    const remaining = activeActions.filter((a) => !confirmedActionIds.includes(a.id));
    return [...confirmed, ...remaining].slice(0, 4);
  }, [activeActions, confirmedActionIds]);

  const handleSelectPreset = useCallback(
    (preset: OnboardingPreset) => {
      const existing = activeActions.find(
        (item) => item.name.toLowerCase() === preset.name.toLowerCase()
      );

      if (existing) {
        if (!existing.is_pinned) {
          editAction(existing.id, { is_pinned: true });
        }
        const alreadyConfirmed = confirmedActionIds.includes(existing.id);
        setConfirmedActionIds((prev) =>
          prev.includes(existing.id)
            ? prev.filter((id) => id !== existing.id)
            : [...prev, existing.id]
        );
        if (!alreadyConfirmed) {
          showToast(`Đã chọn mẫu "${existing.name}" cho bảng chạm nhanh.`);
        }
        return;
      }

      const created = createAction({
        name: preset.name,
        icon: preset.icon,
        color: preset.color,
        group: preset.group,
        is_pinned: true,
      });

      if (created) {
        setConfirmedActionIds((prev) =>
          prev.includes(created.id) ? prev : [...prev, created.id]
        );
        showToast(`Đã thêm mẫu hành động "${created.name}".`);
      }
    },
    [activeActions, confirmedActionIds, createAction, editAction, showToast]
  );

  const handleCreateCustomAction = useCallback(
    (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      const trimmed = customName.trim();
      if (trimmed.length < 1 || trimmed.length > 40) {
        setFormError('Vui lòng nhập tên hành động (1–40 ký tự).');
        return;
      }

      const existing = activeActions.find(
        (item) => item.name.toLowerCase() === trimmed.toLowerCase()
      );

      if (existing) {
        setConfirmedActionIds((prev) =>
          prev.includes(existing.id) ? prev : [...prev, existing.id]
        );
        setCustomNameState('');
        setFormError(null);
        showToast(`Đã kích hoạt mẫu "${existing.name}".`);
        return;
      }

      const created = createAction({
        name: trimmed,
        icon: customIcon,
        color: customColor,
        is_pinned: true,
      });

      if (created) {
        setConfirmedActionIds((prev) =>
          prev.includes(created.id) ? prev : [...prev, created.id]
        );
        setCustomNameState('');
        setFormError(null);
        showToast(`Đã tạo mẫu "${created.name}".`);
      }
    },
    [activeActions, createAction, customColor, customIcon, customName, showToast]
  );

  const ensureStarterActionIds = useCallback((): string[] => {
    const activeIdSet = new Set(activeActions.map((item) => item.id));
    const nextIds: string[] = confirmedActionIds.filter((id) => activeIdSet.has(id));

    for (const action of activeActions) {
      if (nextIds.length >= REQUIRED_ONBOARDING_ACTIONS) {
        break;
      }
      if (!nextIds.includes(action.id)) {
        nextIds.push(action.id);
      }
    }

    if (nextIds.length < REQUIRED_ONBOARDING_ACTIONS) {
      for (const starter of DEFAULT_STARTER_ACTIONS) {
        if (nextIds.length >= REQUIRED_ONBOARDING_ACTIONS) {
          break;
        }
        const existing = activeActions.find(
          (item) => item.name.toLowerCase() === starter.name.toLowerCase()
        );
        if (existing) {
          if (!nextIds.includes(existing.id)) {
            nextIds.push(existing.id);
          }
          continue;
        }
        const created = createAction({
          name: starter.name,
          icon: starter.icon,
          color: starter.color,
          group: starter.group,
          is_pinned: true,
        });
        if (created && !nextIds.includes(created.id)) {
          nextIds.push(created.id);
        }
      }
    }

    return nextIds;
  }, [activeActions, confirmedActionIds, createAction]);

  const handleConfirmStarterActions = useCallback(() => {
    const nextIds = ensureStarterActionIds();
    setConfirmedActionIds(nextIds);
    if (nextIds.length >= REQUIRED_ONBOARDING_ACTIONS) {
      setStep(2);
    }
  }, [ensureStarterActionIds]);

  const handleTapActionInStep2 = useCallback(
    async (action: Action) => {
      const logged = await logEvent(action);
      if (logged) {
        setHasLoggedInOnboarding(true);
      }
    },
    [logEvent]
  );

  const handleTriggerUndoDemo = useCallback(
    async (targetEvent?: Event) => {
      const undone = await executeUndo(targetEvent);
      if (undone) {
        setHasTestedUndo(true);
      }
    },
    [executeUndo]
  );

  const handleLogSampleForUndo = useCallback(async () => {
    const targetAction = step2Actions[0] ?? activeActions[0];
    if (!targetAction) return;
    const logged = await logEvent(targetAction);
    if (logged) {
      setHasLoggedInOnboarding(true);
    }
  }, [activeActions, logEvent, step2Actions]);

  const goToStep = useCallback(
    (nextStep: OnboardingStep) => {
      if (nextStep > 1 && confirmedActionIds.length < REQUIRED_ONBOARDING_ACTIONS) {
        const nextIds = ensureStarterActionIds();
        setConfirmedActionIds(nextIds);
        if (nextIds.length < REQUIRED_ONBOARDING_ACTIONS) {
          return;
        }
      }
      setStep(nextStep);
    },
    [confirmedActionIds.length, ensureStarterActionIds]
  );

  const handleComplete = useCallback(() => {
    setOnboarded(true);
    setActiveView('today');
    onComplete();
  }, [onComplete, setActiveView]);

  return {
    step,
    activeActions,
    step2Actions,
    confirmedActionIds,
    step1ProgressCount,
    isStep1Ready,
    isStep2Ready,
    hasTestedUndo,
    customName,
    customColor,
    customIcon,
    formError,
    todayEvents,
    todayCountsByActionId,
    lastLoggedAtByActionId,
    latestUndoEvent,
    canUndo,
    setCustomName,
    setCustomColor,
    goToStep,
    handleSelectPreset,
    handleCreateCustomAction,
    handleConfirmStarterActions,
    handleTapActionInStep2,
    handleTriggerUndoDemo,
    handleLogSampleForUndo,
    handleComplete,
  };
}
