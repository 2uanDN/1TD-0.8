import React, { useCallback } from 'react';
import { Badge } from '../components/shared/Badge';
import { useEvents } from '../hooks/useEvents';
import { useSuggestions } from '../hooks/useSuggestions';
import { formatBracketRange, SUGGESTION_WEIGHT_META, TOP_SUGGESTIONS_COUNT } from '../lib/suggestions';
import { formatDate, getTimeBracket, getTimezone } from '../lib/time';
import { Action } from '../types';

export const RhythmView: React.FC = () => {
  const { recentEvents, allEvents, todayEvents, logEvent } = useEvents();
  const {
    scoredActions, isColdStart, weights, sequenceSuggestions,
    habitInsights, bracketStats, now, adjustWeight, resetWeights,
  } = useSuggestions();

  const currentBracket = getTimeBracket(now);
  const bracketLabel = formatBracketRange(currentBracket);
  const timezone = getTimezone();
  const topScored = scoredActions.slice(0, TOP_SUGGESTIONS_COUNT);
  const lastLoggedToday = todayEvents[0] ?? null;
  const activeBrackets = bracketStats.filter((b) => b.count > 0 || b.bracket === currentBracket);

  const handleQuickLog = useCallback((action: Action) => {
    void logEvent(action);
  }, [logEvent]);

  return (
    <div className="view-panel">
      <section className="view-section" aria-labelledby="rhythm-header-title">
        <div className="shell-header-row">
          <span className="type-mono-label text-secondary">RHYTHM · KHUNG GIỜ {bracketLabel} ({timezone})</span>
          <span className="type-mono-metric text-acid" aria-live="polite">B{currentBracket} · {recentEvents.length} LOG / 7D</span>
        </div>
        <div>
          <h1 id="rhythm-header-title" className="type-headline-lg">Nhịp sinh hoạt &amp; gợi ý thông minh</h1>
          <p className="type-editorial-italic text-muted">
            Xếp hạng gợi ý theo khung 2 giờ, thứ trong tuần ({formatDate(now, 'EEEE')}), trạng thái ghim và độ gần đây.
          </p>
        </div>
        <div className="view-grid-2col">
          <div className="view-cell">
            <span className="type-mono-label text-muted">CHẾ ĐỘ GỢI Ý HIỆN TẠI</span>
            <span className="type-mono-metric text-acid">{isColdStart ? 'COLD-START (GHIM + THỨ TỰ)' : 'CHẤM ĐIỂM S(a, t)'}</span>
            <span className="type-body-sm text-muted">
              {isColdStart
                ? `Cần tối thiểu 3 bản ghi trong 7 ngày qua (hiện có ${recentEvents.length}) để tính điểm.`
                : `Đang tính điểm từ ${recentEvents.length} bản ghi trong 7 ngày gần nhất.`}
            </span>
          </div>
          <div className="view-cell">
            <span className="type-mono-label text-muted">HOẠT ĐỘNG VỪA GHI HÔM NAY</span>
            <span className="type-mono-metric">{lastLoggedToday ? lastLoggedToday.action_name_snapshot : 'CHƯA CÓ HÔM NAY'}</span>
            <span className="type-body-sm text-muted">Tổng dữ liệu: {allEvents.length} bản ghi · {habitInsights.length} mẫu đã ghi nhận.</span>
          </div>
        </div>
      </section>

      <section className="view-section" aria-labelledby="rhythm-ranking-title">
        <div className="view-section-header">
          <h2 id="rhythm-ranking-title" className="type-headline-sm">Xếp hạng gợi ý thời điểm này</h2>
          <span className="type-mono-badge text-muted">
            {isColdStart ? 'CHẾ ĐỘ KHỞI ĐỘNG' : `KHUNG B${currentBracket} (${bracketLabel})`}
          </span>
        </div>

        <div className="view-divider-list">
          {topScored.map((entry, idx) => (
            <div key={entry.action.id} className="view-divider-item">
              <div className="timeline-item-copy">
                <div className="timeline-item-badges">
                  <span className="type-mono-badge text-acid">#0{idx + 1}</span>
                  <Badge label={entry.action.name} color={entry.action.color} iconName={entry.action.icon} />
                  {entry.action.is_pinned ? <span className="type-mono-badge text-secondary">GHIM</span> : null}
                </div>
                <span className="type-mono-label text-muted">
                  {entry.isColdStart
                    ? `Thứ tự ưu tiên #${entry.action.sort_order} · Chưa hiển thị điểm S(a, t)`
                    : `S=${entry.score.toFixed(2)} · H:${entry.hScore.toFixed(2)} · D:${entry.dScore.toFixed(2)} · P:${entry.pScore.toFixed(0)} · R:${entry.rScore.toFixed(2)}`}
                </span>
              </div>
              <button type="button" className="shell-ghost-btn" aria-label={`Ghi nhận ngay ${entry.action.name}`} onClick={() => handleQuickLog(entry.action)}>Ghi nhận</button>
            </div>
          ))}
        </div>
      </section>

      <section className="view-section" aria-labelledby="rhythm-sequence-title">
        <div className="view-section-header">
          <h2 id="rhythm-sequence-title" className="type-headline-sm">Chuỗi hành động tiếp theo</h2>
          <span className="type-mono-label text-muted">THEO LỊCH SỬ LIỀN KỀ</span>
        </div>

        {sequenceSuggestions.length === 0 ? (
          <div className="timeline-empty">
            <p className="type-mono-badge text-muted">CHƯA ĐỦ CHUỖI LIỀN KỀ</p>
            <p className="type-body-sm text-muted">
              Khi bạn ghi nhận từ 2 hoạt động liên tiếp trong cùng một ngày, 1TD sẽ phát hiện chuỗi thói quen (ví dụ: Ngủ dậy → Ăn sáng).
            </p>
          </div>
        ) : (
          <div className="view-divider-list">
            {sequenceSuggestions.map((seq) => (
              <div key={`${seq.fromActionId}-${seq.toAction.id}`} className="view-divider-item">
                <div className="timeline-item-copy">
                  <span className="type-body-lg">
                    Sau <strong>{seq.fromActionName}</strong> → <strong className="text-acid">{seq.toAction.name}</strong>
                  </span>
                  <span className="type-mono-label text-muted">
                    Lặp lại {seq.count} lần · Xác suất {Math.round(seq.probability * 100)}% · Cách nhau ~{seq.avgDelayMinutes} phút
                  </span>
                </div>
                <button type="button" className="shell-cta-btn" aria-label={`Ghi nhận hành động tiếp theo ${seq.toAction.name}`} onClick={() => handleQuickLog(seq.toAction)}>Chạm ghi</button>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="view-section" aria-labelledby="rhythm-insights-title">
        <div className="view-section-header">
          <h2 id="rhythm-insights-title" className="type-headline-sm">Thống kê nhịp sinh hoạt</h2>
          <span className="type-mono-label text-muted">CHỈ HIỂN THỊ DỮ LIỆU ĐÃ GHI</span>
        </div>

        {habitInsights.length === 0 ? (
          <div className="timeline-empty">
            <p className="type-mono-badge text-muted">CHƯA CÓ THỐNG KÊ THÓI QUEN</p>
            <p className="type-body-sm text-muted">
              Chưa có hoạt động nào được ghi nhận. Hãy chạm một ô bên tab Hôm nay để bắt đầu xây dựng thống kê nhịp sinh hoạt.
            </p>
          </div>
        ) : (
          <div className="view-grid-2col">
            {habitInsights.map((insight) => (
              <div key={insight.action.id} className="view-cell">
                <div className="view-row-between">
                  <Badge label={insight.action.name} color={insight.action.color} iconName={insight.action.icon} />
                  <span className="type-mono-metric text-acid">~{insight.typicalTimeHHmm}</span>
                </div>
                <p className="type-body-sm">
                  {insight.action.name} thường lúc <strong>{insight.typicalTimeHHmm}</strong> · <strong>{insight.weeklyCount} lần/tuần</strong>
                </p>
                <span className="type-mono-label text-muted">
                  TỔNG {insight.totalCount} LẦN · ĐỈNH B{insight.peakBracket} ({formatBracketRange(insight.peakBracket)})
                </span>
              </div>
            ))}
          </div>
        )}

        <div className="view-divider-list">
          {activeBrackets.map((b) => (
            <div key={b.bracket} className="view-divider-item">
              <span className="type-mono-label">B{b.bracket} · {b.label}{b.bracket === currentBracket ? ' (HIỆN TẠI)' : ''}</span>
              <span className="type-mono-label text-muted">
                {b.topActionName ? `Phổ biến: ${b.topActionName} · ` : ''}
                <strong className="text-acid">{b.count} bản ghi</strong> ({Math.round(b.share * 100)}%)
              </span>
            </div>
          ))}
        </div>
      </section>

      <section className="view-section" aria-labelledby="rhythm-weights-title">
        <div className="view-section-header">
          <h2 id="rhythm-weights-title" className="type-headline-sm">Cấu hình trọng số S(a, t)</h2>
          <button type="button" className="shell-ghost-btn" aria-label="Đặt lại trọng số gợi ý về mặc định" onClick={resetWeights}>Mặc định</button>
        </div>

        <div className="view-divider-list">
          {SUGGESTION_WEIGHT_META.map((item) => (
            <div key={item.key} className="view-divider-item">
              <div className="timeline-item-copy">
                <span className="type-mono-badge text-secondary">{item.code}</span>
                <span className="type-body-sm">{item.label}</span>
              </div>
              <div className="library-filter-bar">
                <button type="button" className="shell-ghost-btn" aria-label={`Giảm trọng số ${item.code}`} onClick={() => adjustWeight(item.key, -0.05)}>-0.05</button>
                <span className="type-mono-metric text-acid">{weights[item.key].toFixed(2)}</span>
                <button type="button" className="shell-ghost-btn" aria-label={`Tăng trọng số ${item.code}`} onClick={() => adjustWeight(item.key, 0.05)}>+0.05</button>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};

export default RhythmView;
