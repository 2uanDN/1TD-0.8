import React from 'react';

export type NavTabId = 'today' | 'library' | 'history' | 'rhythm' | 'settings';

interface NavTabItem {
  id: NavTabId;
  label: string;
  ariaLabel: string;
}

const NAV_TABS: readonly NavTabItem[] = [
  { id: 'today', label: 'TODAY', ariaLabel: 'Hôm nay (Today)' },
  { id: 'library', label: 'LIBRARY', ariaLabel: 'Thư viện hành động (Library)' },
  { id: 'history', label: 'HISTORY', ariaLabel: 'Lịch sử ghi nhận (History)' },
  { id: 'rhythm', label: 'RHYTHM', ariaLabel: 'Nhịp độ và gợi ý (Rhythm)' },
  { id: 'settings', label: 'SETTINGS', ariaLabel: 'Cài đặt và quản lý dữ liệu (Settings)' },
];

export interface TopNavProps {
  activeView: NavTabId;
  onSelectView: (view: NavTabId) => void;
}

export const TopNav: React.FC<TopNavProps> = ({ activeView, onSelectView }) => {
  return (
    <header className="top-nav">
      <nav aria-label="Điều hướng chính">
        <ul className="top-nav-list" role="tablist">
          {NAV_TABS.map((tab) => {
            const isSelected = activeView === tab.id;
            return (
              <li key={tab.id} className="top-nav-item" role="presentation">
                <button
                  type="button"
                  role="tab"
                  id={`tab-${tab.id}`}
                  aria-selected={isSelected}
                  aria-controls={`panel-${tab.id}`}
                  aria-label={tab.ariaLabel}
                  className="top-nav-tab type-mono-badge"
                  onClick={() => onSelectView(tab.id)}
                >
                  {isSelected && <span className="top-nav-dot" aria-hidden="true" />}
                  <span>{tab.label}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </nav>
    </header>
  );
};
