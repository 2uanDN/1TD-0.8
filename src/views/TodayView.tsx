import React, { useCallback, useEffect, useState } from 'react';
import { EventDetailDrawer } from '../components/drawers/EventDetailDrawer';
import { TileGrid } from '../components/tiles/TileGrid';
import { TimelineFeed } from '../components/timeline/TimelineFeed';
import { useEvents } from '../hooks/useEvents';
import { useSuggestions } from '../hooks/useSuggestions';
import { useUndoStack } from '../hooks/useUndoStack';
import { formatDate, formatTime } from '../lib/time';
import { useUIStore } from '../store/uiStore';
import { Action, Event } from '../types';

export const TodayView: React.FC = () => {
  const activeView = useUIStore((state) => state.activeView);
  const openDrawer = useUIStore((state) => state.openDrawer);
  const setActiveView = useUIStore((state) => state.setActiveView);
  const openEventDetailDrawer = useUIStore(
    (state) => state.openEventDetailDrawer
  );

  const {
    todayEvents,
    isLoading,
    todayCountsByActionId,
    lastLoggedAtByActionId,
    logEvent,
  } = useEvents();
  const { suggestions: displayedActions } = useSuggestions();
  const { executeUndo } = useUndoStack();

  const [now, setNow] = useState<Date>(() => new Date());

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setNow(new Date());
    }, 30000);
    return () => {
      window.clearInterval(intervalId);
    };
  }, []);

  const handleTapAction = useCallback(
    (action: Action) => {
      void logEvent(action);
    },
    [logEvent]
  );

  const handleUndoEvent = useCallback(
    (event: Event) => {
      void executeUndo(event);
    },
    [executeUndo]
  );

  const handleSelectEvent = useCallback(
    (event: Event) => {
      openEventDetailDrawer(event);
    },
    [openEventDetailDrawer]
  );

  const formattedDate = formatDate(now);
  const formattedTime = formatTime(now);
  const todayEventCount = todayEvents.length;

  return (
    <div className="view-panel">
      <section className="view-section" aria-labelledby="today-header-title">
        <div className="shell-header-row">
          <span
            className="type-mono-label text-secondary"
            aria-live="polite"
          >
            HÔM NAY — {formattedDate} — {todayEventCount} HOẠT ĐỘNG ĐÃ GHI NHẬN
          </span>
          <span className="type-mono-metric text-acid">{formattedTime}</span>
        </div>

        <div className="view-row-between">
          <div>
            <h1 id="today-header-title" className="type-headline-lg">
              Chạm để ghi nhận
            </h1>
            <p className="type-editorial-italic text-muted">
              Một chạm lưu ngay cùng mốc thời gian thiết bị — không hộp thoại xác nhận.
            </p>
          </div>
          <button
            type="button"
            className="shell-ghost-btn"
            aria-label="Mở thư viện mẫu hành động"
            onClick={() => setActiveView('library')}
          >
            Thư viện
          </button>
        </div>
      </section>

      <section className="view-section" aria-labelledby="today-suggestions-title">
        <div className="view-section-header">
          <h2 id="today-suggestions-title" className="type-headline-sm">
            Gợi ý theo thời điểm
          </h2>
          <span className="type-mono-badge text-muted">
            {displayedActions.length} MẪU ĐANG HIỂN THỊ
          </span>
        </div>

        <TileGrid
          actions={displayedActions}
          todayCountsByActionId={todayCountsByActionId}
          lastLoggedAtByActionId={lastLoggedAtByActionId}
          onTapAction={handleTapAction}
          onOpenLibrary={() => setActiveView('library')}
        />
      </section>

      <section className="view-section" aria-labelledby="today-timeline-title">
        <div className="view-section-header">
          <h2 id="today-timeline-title" className="type-headline-sm">
            Dòng thời gian hôm nay
          </h2>
          <span className="type-mono-label text-muted" aria-live="polite">
            {todayEventCount > 0
              ? `${todayEventCount} BẢN GHI · MỚI NHẤT TRƯỚC`
              : 'MỚI NHẤT TRƯỚC'}
          </span>
        </div>

        <TimelineFeed
          events={todayEvents}
          isLoading={isLoading}
          onUndo={handleUndoEvent}
          onSelectEvent={handleSelectEvent}
        />
      </section>

      <EventDetailDrawer
        isOpen={activeView === 'today' && openDrawer === 'event-detail'}
      />
    </div>
  );
};

export default TodayView;
