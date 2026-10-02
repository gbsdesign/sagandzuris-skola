import React, { useState } from 'react';

interface SwipeToDismissProps {
  onDismiss: () => void;
  children: React.ReactNode;
  className?: string;
}

export function SwipeToDismiss({ onDismiss, children, className = '' }: SwipeToDismissProps) {
  const [startY, setStartY] = useState<number | null>(null);
  const [currentY, setCurrentY] = useState<number | null>(null);
  const [isSwiping, setIsSwiping] = useState(false);

  const isInteractiveElement = (target: HTMLElement | null): boolean => {
    if (!target) return false;
    const tagName = target.tagName.toLowerCase();
    if (['input', 'textarea', 'select', 'button', 'a', 'label'].includes(tagName)) {
      return true;
    }
    return target.closest('input, textarea, select, button, a, label, [role="button"]') !== null;
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    const target = e.target as HTMLElement;
    // Do not initiate swipe dismiss if interacting with an input or button
    if (isInteractiveElement(target)) {
      return;
    }

    const currentTarget = e.currentTarget as HTMLElement;
    // Only allow swipe downwards to close if the modal content is scrolled to the top
    if (currentTarget.scrollTop > 0) return;

    setStartY(e.touches[0].clientY);
    setIsSwiping(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isSwiping || startY === null) return;

    const target = e.target as HTMLElement;
    if (isInteractiveElement(target)) {
      return;
    }

    const diffY = e.touches[0].clientY - startY;

    if (diffY > 0) {
      setCurrentY(diffY);
      if (e.cancelable) {
        e.preventDefault();
      }
    }
  };

  const handleTouchEnd = () => {
    if (!isSwiping) return;
    setIsSwiping(false);

    if (currentY !== null && currentY > 120) {
      onDismiss();
    }

    setStartY(null);
    setCurrentY(null);
  };

  const style =
    currentY !== null && currentY > 0
      ? {
          transform: `translateY(${currentY}px)`,
          transition: isSwiping ? 'none' : 'transform 0.25s ease-out',
          opacity: Math.max(0.4, 1 - currentY / 400),
        }
      : {
          transition: 'transform 0.25s ease-out, opacity 0.25s ease-out',
        };

  return (
    <div
      onClick={(e) => e.stopPropagation()}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      style={style}
      className={`${className} touch-pan-y`}
    >
      {/* iOS-style pull bar handle visible on mobile */}
      <div className="flex justify-center pb-2.5 pt-1 sm:hidden">
        <div className="w-12 h-1.5 rounded-full bg-slate-300/80 active:bg-slate-400"></div>
      </div>
      {children}
    </div>
  );
}
