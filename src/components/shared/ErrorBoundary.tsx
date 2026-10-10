import React from 'react';

export interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallbackTitle?: string;
  fallbackMessage?: string;
  onReset?: () => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

/**
 * Reusable React ErrorBoundary for isolating synchronous render errors
 * at both the app shell level and around individual lazy-loaded views.
 */
export class ErrorBoundary extends React.Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  public state: ErrorBoundaryState = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    console.error('[1TD] Render error caught by ErrorBoundary:', error, errorInfo);
  }

  private handleRetry = (): void => {
    this.setState({ hasError: false, error: null });
    this.props.onReset?.();
  };

  private handleReload = (): void => {
    if (typeof window !== 'undefined') {
      window.location.reload();
    }
  };

  public render(): React.ReactNode {
    if (this.state.hasError) {
      const {
        fallbackTitle = 'ĐÃ XẢY RA LỖI HIỂN THỊ (SOMETHING WENT WRONG)',
        fallbackMessage = 'Đã xảy ra sự cố khi hiển thị nội dung này. Vui lòng thử lại hoặc tải lại ứng dụng.',
      } = this.props;

      return (
        <section className="view-section" role="alert" aria-live="assertive">
          <div className="view-section-header">
            <p className="type-mono-badge text-acid">{fallbackTitle}</p>
            <span className="type-mono-label text-muted">RENDER ERROR</span>
          </div>
          <p className="type-body-sm text-muted">{fallbackMessage}</p>
          <div className="library-filter-bar">
            <button
              type="button"
              className="shell-ghost-btn"
              aria-label="Thử hiển thị lại khu vực này"
              onClick={this.handleRetry}
            >
              Thử lại
            </button>
            <button
              type="button"
              className="shell-cta-btn"
              aria-label="Tải lại ứng dụng"
              onClick={this.handleReload}
            >
              Tải lại ứng dụng (Reload)
            </button>
          </div>
        </section>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
