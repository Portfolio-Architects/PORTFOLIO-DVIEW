'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, ChevronDown, ChevronUp } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode | ((error: Error, reset: () => void) => ReactNode);
  name?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
  showDetails: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    showDetails: false,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, showDetails: false };
  }

  public componentDidMount() {
    if (typeof window !== 'undefined') {
      window.addEventListener('online', this.handleOnline);
    }
  }

  public componentWillUnmount() {
    if (typeof window !== 'undefined') {
      window.removeEventListener('online', this.handleOnline);
    }
  }

  private handleOnline = () => {
    if (this.state.hasError) {
      console.log(`[ErrorBoundary:${this.props.name || 'Global'}] Network restored. Triggering self-healing auto-recovery...`);
      this.handleReset();
    }
  };

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error(`[ErrorBoundary:${this.props.name || 'Global'}] Caught error:`, error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null, showDetails: false });
  };

  private toggleDetails = () => {
    this.setState(prev => ({ showDetails: !prev.showDetails }));
  };

  public render() {
    if (this.state.hasError && this.state.error) {
      const { fallback } = this.props;
      
      if (fallback) {
        if (typeof fallback === 'function') {
          return fallback(this.state.error, this.handleReset);
        }
        return fallback;
      }

      return (
        <div className="w-full p-5 my-4 bg-rose-50/40 dark:bg-rose-950/10 border border-rose-500/20 rounded-2xl flex flex-col gap-3.5 select-none animate-in fade-in zoom-in-95 duration-200">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-rose-500/10 text-rose-500 flex items-center justify-center shrink-0">
              <AlertTriangle size={18} />
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="text-[13px] font-black text-primary">
                {this.props.name ? `${this.props.name} 영역 로드 실패` : '화면 일부를 불러오지 못했습니다'}
              </h4>
              <p className="text-[11.5px] font-medium text-tertiary mt-0.5 leading-relaxed break-keep">
                일시적인 네트워크 지연이나 데이터 오류가 발생했습니다. 아래 버튼을 눌러 다시 시도할 수 있습니다.
              </p>
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={this.handleReset}
              className="flex-1 py-2.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 text-[11.5px] font-extrabold rounded-xl border-none transition-all flex items-center justify-center gap-1 cursor-pointer"
            >
              <RefreshCw size={12} />
              <span>다시 시도</span>
            </button>
            
            <button
              onClick={this.toggleDetails}
              className="px-3 py-2.5 bg-body hover:bg-border/30 text-secondary text-[11.5px] font-bold rounded-xl border border-border/20 transition-all flex items-center justify-center gap-1 cursor-pointer"
            >
              <span>상세 정보</span>
              {this.state.showDetails ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            </button>
          </div>

          {this.state.showDetails && (
            <div className="p-3 bg-zinc-950 text-rose-400 dark:text-rose-300 font-mono text-[9.5px] rounded-xl overflow-x-auto max-h-[120px] whitespace-pre select-text leading-normal border border-neutral-800">
              {this.state.error.name}: {this.state.error.message}
              {"\n"}
              {this.state.error.stack}
            </div>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
