import React from 'react';

// A class's logo, or its first letter on a wine disc when no logo was uploaded.
export const ClassLogo: React.FC<{ name: string; logo?: string; className?: string }> = ({ name, logo, className = 'w-9 h-9' }) =>
  logo ? (
    <img src={logo} alt={name} className={`${className} rounded-full object-cover bg-white ring-1 ring-[#e8dcc8]`} />
  ) : (
    <span className={`${className} rounded-full bg-[#7a2028] text-[#fbf6ec] font-serif-ge font-bold flex items-center justify-center select-none`}>
      {name.trim().charAt(0) || '?'}
    </span>
  );
