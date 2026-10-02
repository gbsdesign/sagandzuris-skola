import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
  fallbackMessage?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  private handleGoHome = () => {
    this.setState({ hasError: false, error: null });
    window.location.hash = '';
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-[300px] w-full max-w-lg mx-auto p-6 my-6 bg-white/95 rounded-3xl border border-red-200/80 shadow-lg text-center flex flex-col items-center justify-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-red-50 border border-red-200 flex items-center justify-center text-red-600 shadow-2xs">
            <AlertTriangle className="w-7 h-7" />
          </div>

          <div className="space-y-1.5">
            <h3 className="text-lg font-black text-slate-800">
              {this.props.fallbackTitle || 'დაფიქსირდა შეცდომა'}
            </h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
              {this.props.fallbackMessage ||
                'გვერდის ჩატვირთვისას წარმოიშვა დროებითი შეფერხება. სცადეთ განახლება.'}
            </p>
            {this.state.error?.message && (
              <p className="text-[10px] text-red-400 font-mono max-w-xs truncate mx-auto bg-red-50/60 px-2 py-1 rounded">
                {this.state.error.message}
              </p>
            )}
          </div>

          <div className="flex items-center gap-2.5 pt-2">
            <button
              type="button"
              onClick={this.handleReset}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-amber-600 to-[#85502c] hover:from-amber-700 hover:to-[#6d3c1c] text-white font-bold text-xs shadow-xs hover:shadow-md active:scale-95 transition-all cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>ხელახლა ცდა</span>
            </button>

            <button
              type="button"
              onClick={this.handleGoHome}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs border border-slate-200 active:scale-95 transition-all cursor-pointer"
            >
              <Home className="w-3.5 h-3.5" />
              <span>მთავარზე დაბრუნება</span>
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
