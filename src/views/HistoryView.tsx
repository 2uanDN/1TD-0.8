import { subDays } from 'date-fns';
import React, { useCallback, useMemo, useRef, useState } from 'react';
import { Download, Upload } from 'lucide-react';
import { EventDetailDrawer } from '../components/drawers/EventDetailDrawer';
import { HistoryList } from '../components/history/HistoryList';
import { useActions } from '../hooks/useActions';
import { useEvents } from '../hooks/useEvents';
import { useSettings } from '../hooks/useSettings';
import { downloadJsonFile, exportToJSON, importFromJSON } from '../lib/exportImport';
import { startOfDay } from '../lib/time';
import { useUIStore } from '../store/uiStore';
import { Event } from '../types';

type HistoryRange = 'all' | 'week' | 'month';

export const HistoryView: React.FC = () => {
  const activeView = useUIStore((state) => state.activeView);
  const openDrawer = useUIStore((state) => state.openDrawer);
  const setActiveView = useUIStore((state) => state.setActiveView);
  const openEventDetailDrawer = useUIStore((state) => state.openEventDetailDrawer);
  const showToast = useUIStore((state) => state.showToast);

  const { allEvents, isLoading, deleteEvent, refreshEvents } = useEvents();
  const { refreshActions } = useActions();
  const { refreshSettings } = useSettings();

  const [rangeFilter, setRangeFilter] = useState<HistoryRange>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const filteredEvents = useMemo(() => {
    const now = new Date();
    const minMs =
      rangeFilter === 'week'
        ? startOfDay(subDays(now, 6)).getTime()
        : rangeFilter === 'month'
          ? startOfDay(subDays(now, 29)).getTime()
          : null;
    const query = searchQuery.trim().toLowerCase();

    return allEvents.filter((event) => {
      if (minMs !== null) {
        const eventMs = new Date(event.occurred_at).getTime();
        if (!Number.isNaN(eventMs) && eventMs < minMs) return false;
      }
      if (!query) return true;
      const nameMatch = event.action_name_snapshot.toLowerCase().includes(query);
      const noteMatch = (event.note ?? '').toLowerCase().includes(query);
      return nameMatch || noteMatch;
    });
  }, [allEvents, rangeFilter, searchQuery]);

  const handleExportJson = useCallback(async () => {
    if (isExporting) return;
    setIsExporting(true);
    try {
      const jsonContent = await exportToJSON();
      const filename = downloadJsonFile(jsonContent);
      refreshSettings();
      showToast(`Đã xuất ${allEvents.length} bản ghi ra tệp ${filename}.`);
    } catch (error: unknown) {
      console.error('[1TD][HistoryView] Export JSON failed:', error);
      showToast('Không thể xuất dữ liệu JSON.');
    } finally {
      setIsExporting(false);
    }
  }, [allEvents.length, isExporting, refreshSettings, showToast]);

  const handleImportFileChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      e.target.value = '';
      if (!file) return;
      try {
        const text = await file.text();
        const result = await importFromJSON(text);
        refreshActions();
        await refreshEvents();
        refreshSettings();
        showToast(result.message);
      } catch (error: unknown) {
        console.error('[1TD][HistoryView] Import JSON failed:', error);
        showToast(error instanceof Error ? error.message : 'Không thể nhập tệp JSON.');
      }
    },
    [refreshActions, refreshEvents, refreshSettings, showToast]
  );

  const handleDeleteEvent = useCallback(
    async (event: Event) => {
      const deleted = await deleteEvent(event.id);
      if (deleted) {
        showToast(`Đã xóa bản ghi "${event.action_name_snapshot}".`);
      }
    },
    [deleteEvent, showToast]
  );

  return (
    <div className="view-panel">
      <section className="view-section" aria-labelledby="history-header-title">
        <div className="shell-header-row">
          <span className="type-mono-label text-secondary">HISTORY · NHẬT KÝ THEO NGÀY</span>
          <span className="type-mono-metric text-acid" aria-live="polite">
            {allEvents.length} BẢN GHI
          </span>
        </div>

        <div className="view-row-between">
          <div>
            <h1 id="history-header-title" className="type-headline-lg">Lịch sử sự kiện</h1>
            <p className="type-editorial-italic text-muted">
              Toàn bộ bản ghi lưu trữ cục bộ trên thiết bị, nhóm theo từng ngày.
            </p>
          </div>
          <div className="library-filter-bar">
            <input ref={fileInputRef} type="file" accept=".json,application/json" hidden aria-label="Chọn tệp JSON để nhập dữ liệu" onChange={(e) => void handleImportFileChange(e)} />
            <button type="button" className="shell-ghost-btn" aria-label="Nhập dữ liệu nhật ký từ tệp JSON" onClick={() => fileInputRef.current?.click()}>
              <Upload size={15} aria-hidden="true" />
              <span>Nhập JSON</span>
            </button>
            <button type="button" className="shell-cta-btn" aria-label="Xuất toàn bộ dữ liệu nhật ký ra tệp JSON" disabled={isExporting} onClick={() => void handleExportJson()}>
              <Download size={15} aria-hidden="true" />
              <span>Xuất JSON</span>
            </button>
          </div>
        </div>
      </section>

      <section className="view-section" aria-labelledby="history-filter-title">
        <div className="view-section-header">
          <h2 id="history-filter-title" className="type-headline-sm">Bộ lọc &amp; tìm kiếm</h2>
          <span className="type-mono-badge text-muted">HIỂN THỊ {filteredEvents.length} / {allEvents.length} BẢN GHI</span>
        </div>

        <div className="library-toolbar">
          <div className="library-search-row">
            <div className="ledger-input-wrap">
              <input type="search" className="ledger-input" value={searchQuery} placeholder="Tìm theo tên hành động hoặc ghi chú..." aria-label="Tìm kiếm trong lịch sử sự kiện" onChange={(e) => setSearchQuery(e.target.value)} />
            </div>
            {searchQuery && (
              <button type="button" className="shell-ghost-btn" aria-label="Xóa từ khóa tìm kiếm lịch sử" onClick={() => setSearchQuery('')}>Xóa lọc</button>
            )}
          </div>

          <div className="library-filter-bar" role="group" aria-label="Bộ lọc khoảng thời gian lịch sử">
            <button type="button" className="library-filter-btn" aria-pressed={rangeFilter === 'all'} aria-label="Hiển thị toàn bộ lịch sử" onClick={() => setRangeFilter('all')}>
              <span className="type-mono-badge">TẤT CẢ ({allEvents.length})</span>
            </button>
            <button type="button" className="library-filter-btn" aria-pressed={rangeFilter === 'week'} aria-label="Hiển thị sự kiện trong 7 ngày qua" onClick={() => setRangeFilter('week')}>
              <span className="type-mono-badge">7 NGÀY QUA</span>
            </button>
            <button type="button" className="library-filter-btn" aria-pressed={rangeFilter === 'month'} aria-label="Hiển thị sự kiện trong 30 ngày qua" onClick={() => setRangeFilter('month')}>
              <span className="type-mono-badge">30 NGÀY QUA</span>
            </button>
          </div>
        </div>
      </section>

      <HistoryList
        events={filteredEvents}
        isLoading={isLoading}
        emptyTitle={allEvents.length === 0 ? 'CHƯA CÓ BẢN GHI LỊCH SỬ' : 'KHÔNG CÓ BẢN GHI PHÙ HỢP'}
        emptyDescription={
          allEvents.length === 0
            ? 'Chưa có bản ghi lịch sử nào trong cơ sở dữ liệu IndexedDB. Quay về Hôm nay để ghi nhận một chạm.'
            : 'Không có sự kiện nào khớp với bộ lọc thời gian hoặc từ khóa hiện tại.'
        }
        onEditEvent={openEventDetailDrawer}
        onDeleteEvent={handleDeleteEvent}
        onGoToday={() => setActiveView('today')}
      />

      <EventDetailDrawer isOpen={activeView === 'history' && openDrawer === 'event-detail'} />
    </div>
  );
};

export default HistoryView;
