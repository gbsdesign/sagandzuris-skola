import React from 'react';
import { Sparkles } from 'lucide-react';

/** The soft wine strip with ✦ under the levels and the certificate. */
export const Strip: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="flex shrink-0 items-start gap-3 rounded-card bg-tint px-4 py-3.5 text-wine">
    <Sparkles aria-hidden="true" className="mt-0.5 size-[18px] shrink-0" strokeWidth={2} />
    <p className="min-w-0 flex-1 text-body leading-snug font-medium wrap-break-word">{children}</p>
  </div>
);
