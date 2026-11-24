import React, { Component, ErrorInfo, ReactNode, useEffect, useState } from 'react';
import { reportError } from '../utils/errorLog';
import { isChunkError, restartFresh } from '../utils/appUpdate';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import { closeChunkLine, openChunkLine, useChunkLineShows } from '../utils/loadNotice';

/** One quiet line, not a red box on every part of the page — and only one on the whole screen (utils/loadNotice.ts). */
const ChunkLine: React.FC = () => {
  const [id, setId] = useState<number | null>(null);
  useEffect(() => { const i = openChunkLine(); setId(i); return () => closeChunkLine(i); }, []);
  if (!useChunkLineShows(id)) return null;
  return (
    <div role="status" className="w-full max-w-lg mx-auto my-3 px-4 py-3 rounded-2xl bg-white/90 border border-[#e6e1d9] flex items-center gap-3 text-left">
      <RefreshCw className="w-5 h-5 shrink-0 text-[#7a2028]" aria-hidden="true" />
      <p className="flex-1 min-w-0 text-[13px] leading-snug text-[#6b625a]">აპის ახალი ვერსია იტვირთება…</p>
      <button
        type="button"
        onClick={() => restartFresh(true)}
        className="shrink-0 h-10 px-4 rounded-full bg-[#7a2028] text-white text-[13px] font-bold cursor-pointer active:scale-95 transition"
      >
        განახლება
      </button>
    </div>
  );
};

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
    reportError(error, 'react', errorInfo.componentStack ?? undefined);
    // a part of an older version the site no longer has: the newest version has it — go there by itself (once a minute)
    if (isChunkError(error)) restartFresh();
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  private handleGoHome = () => {
    this.setState({ hasError: false, error: null });
    window.location.hash = '';
  };

  public render() {
    if (this.state.hasError && isChunkError(this.state.error)) {
      return <ChunkLine />;
    }
    if (this.state.hasError) {
      return (
        <div className="min-h-[300px] w-full max-w-lg mx-auto p-6 my-6 bg-white/95 rounded-3xl border border-red-200/80 shadow-lg text-center flex flex-col items-center justify-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-red-50 border border-red-200 flex items-center justify-center text-red-600 shadow-2xs">
            <AlertTriangle className="w-7 h-7" />
          </div>

          <div className="space-y-1.5">
            <h3 className="text-lg font-black text-[#2a2017]">
              {this.props.fallbackTitle || 'დაფიქსირდა შეცდომა'}
            </h3>
            <p className="text-xs text-[#8a7a6a] max-w-sm mx-auto leading-relaxed">
              {this.props.fallbackMessage ||
                'გვერდის ჩატვირთვისას წარმოიშვა დროებითი შეფერხება. სცადეთ განახლება.'}
            </p>
            {this.state.error?.message && (
              <p className="text-[11px] text-red-400 font-mono max-w-xs truncate mx-auto bg-red-50/60 px-2 py-1 rounded">
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
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#f1e9dc] hover:bg-[#e8dcc8] text-[#4a3426] font-bold text-xs border border-[#e8dcc8] active:scale-95 transition-all cursor-pointer"
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
