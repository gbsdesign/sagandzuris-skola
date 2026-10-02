import React, { useState } from 'react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { Download, X, Share } from 'lucide-react';
import { triggerHaptic } from '../utils/haptics';

export const PWAInstallButton: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

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

  // Chromium / Android / Desktop flow
  if (isInstallable) {
    return (
      <button
        onClick={handleInstallClick}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border transition-all text-xs font-black cursor-pointer select-none active:scale-95 shadow-2xs bg-gradient-to-r from-amber-600 to-[#85502c] text-white border-amber-700 hover:brightness-105 shrink-0"
        title="აპლიკაციის დაყენება"
      >
        <Download className="w-3.5 h-3.5 text-amber-100 shrink-0" />
        <span className="tracking-tight">დაყენება</span>
      </button>
    );
  }

  // iOS Safari flow (beforeinstallprompt is not supported by WebKit)
  if (isIOS) {
    return (
      <>
        <button
          onClick={handleIOSClick}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border transition-all text-xs font-black cursor-pointer select-none active:scale-95 shadow-2xs bg-gradient-to-r from-amber-600 to-[#85502c] text-white border-amber-700 hover:brightness-105 shrink-0"
          title="აპლიკაციის დაყენება"
        >
          <Download className="w-3.5 h-3.5 text-amber-100 shrink-0" />
          <span className="tracking-tight">დაყენება</span>
        </button>

        {showIOSGuide && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="w-full max-w-sm rounded-3xl bg-[#fcf9f5] border border-amber-200/80 p-6 shadow-2xl space-y-4 animate-in zoom-in-95 duration-200">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-[#5c3a21]">დაყენება iPhone / iPad</h3>
                <button 
                  onClick={() => setShowIOSGuide(false)}
                  className="p-1.5 rounded-xl hover:bg-amber-100/50 text-slate-400 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="space-y-4 text-sm text-slate-700 leading-relaxed">
                <div className="flex items-start gap-3">
                  <div className="w-7 h-7 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
                    <span className="text-amber-800 font-bold">1</span>
                  </div>
                  <p>დააჭირეთ <strong>გაზიარების (Share)</strong> ღილაკს Safari-ს ბარში.</p>
                </div>
                
                <div className="flex items-center justify-center py-2">
                  <div className="p-3 bg-white rounded-2xl border border-slate-200 shadow-sm">
                    <Share className="w-6 h-6 text-blue-500" />
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-7 h-7 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
                    <span className="text-amber-800 font-bold">2</span>
                  </div>
                  <p>ჩამოშალეთ სია და აირჩიეთ <strong>Add to Home Screen</strong>.</p>
                </div>
              </div>

              <button
                onClick={() => setShowIOSGuide(false)}
                className="w-full py-3 rounded-2xl bg-amber-100 text-amber-900 font-bold text-sm hover:bg-amber-200 transition-colors"
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
