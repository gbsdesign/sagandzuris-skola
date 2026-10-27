import React, { useState } from 'react';
import { usePWAInstall } from './../hooks/usePWAInstall';
import { Download, X, Share } from 'lucide-react';
import { triggerHaptic } from '../utils/haptics';

// compact: a header-sized round icon button; otherwise a full „აპის დაყენება“ button (profile page)
export const PWAInstallButton: React.FC<{ compact?: boolean }> = ({ compact = false }) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);
  const buttonClass = compact
    ? 'w-9 h-9 rounded-full ring-1 ring-[#e8dcc8] bg-white/80 hover:bg-white hover:ring-[#7a2028]/40 text-[#7a2028] flex items-center justify-center transition-all cursor-pointer active:scale-95 shrink-0'
    : 'inline-flex items-center justify-center gap-2 h-11 px-5 rounded-full bg-white ring-1 ring-[#e8dcc8] hover:ring-[#7a2028]/40 text-[#4a3426] text-sm font-bold cursor-pointer select-none transition active:scale-[0.97] shrink-0';

  // If already running as an installed PWA, hide the button
  if (isInstalled) {
    return null;
  }

  const handleInstallClick = async () => {
    triggerHaptic(20);
    await install();
  };

  const handleIOSClick = () => {
    triggerHaptic(15);
    setShowIOSGuide(true);
  };

  const inner = (
    <>
      <Download className={compact ? 'w-[18px] h-[18px]' : 'w-[18px] h-[18px] text-[#7a2028]'} />
      {!compact && <span>აპის დაყენება</span>}
    </>
  );

  // Chromium / Android / Desktop flow
  if (isInstallable) {
    return (
      <button type="button" onClick={handleInstallClick} className={buttonClass} title="აპის დაყენება" aria-label="აპის დაყენება">
        {inner}
      </button>
    );
  }

  // iOS Safari flow (beforeinstallprompt is not supported by WebKit)
  if (isIOS) {
    return (
      <>
        <button type="button" onClick={handleIOSClick} className={buttonClass} title="აპის დაყენება" aria-label="აპის დაყენება">
          {inner}
        </button>

        {showIOSGuide && (
          <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-[#2a2017]/45 backdrop-blur-[2px] p-3 sm:p-6 sg-in" onClick={() => setShowIOSGuide(false)}>
            <div
              role="dialog"
              aria-modal="true"
              onClick={e => e.stopPropagation()}
              className="w-full sm:max-w-sm max-h-[calc(100dvh-2rem)] overflow-y-auto overscroll-contain rounded-[24px] bg-[#fbf6ec] ring-1 ring-[#e8dcc8] p-5 shadow-2xl space-y-4 safe-bottom sg-up"
            >
              <div className="flex items-center justify-between gap-2">
                <h3 className="font-serif-ge text-[18px] font-bold text-[#4a3426]">დაყენება iPhone / iPad-ზე</h3>
                <button
                  type="button"
                  onClick={() => setShowIOSGuide(false)}
                  className="w-9 h-9 shrink-0 rounded-full text-[#8a7a6a] hover:text-[#7a2028] hover:bg-[#7a2028]/[0.06] flex items-center justify-center cursor-pointer transition-colors"
                  aria-label="დახურვა"
                >
                  <X className="w-[18px] h-[18px]" />
                </button>
              </div>

              <ol className="space-y-3 text-[15px] text-[#2a2017] leading-relaxed">
                <li className="flex items-start gap-3">
                  <span className="w-7 h-7 shrink-0 rounded-full bg-[#7a2028]/[0.08] text-[#7a2028] font-bold flex items-center justify-center">1</span>
                  <p>დააჭირე Safari-ს <strong>გაზიარების</strong> ღილაკს <Share className="inline w-4 h-4 -mt-0.5 text-[#7a2028]" aria-label="Share" />.</p>
                </li>
                <li className="flex items-start gap-3">
                  <span className="w-7 h-7 shrink-0 rounded-full bg-[#7a2028]/[0.08] text-[#7a2028] font-bold flex items-center justify-center">2</span>
                  <p>სიაში აირჩიე <strong>Add to Home Screen</strong>.</p>
                </li>
              </ol>

              <button
                type="button"
                onClick={() => setShowIOSGuide(false)}
                className="w-full h-11 rounded-full bg-[#7a2028] hover:bg-[#5e1820] text-[#fbf6ec] font-bold text-sm transition-colors cursor-pointer"
              >
                გასაგებია
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
};
