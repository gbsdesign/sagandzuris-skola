import { useEffect, useState } from 'react';

/** a side-by-side screen for a board game: a phone on its side or a computer (ოქროს ხანა, ქარავანი, ორი ტახტი) */
export const useTwoCols = () => {
  const read = () => window.innerHeight <= 500 || window.innerWidth >= 1024;
  const [two, setTwo] = useState(read);
  useEffect(() => {
    const on = () => setTwo(read());
    window.addEventListener('resize', on);
    return () => window.removeEventListener('resize', on);
  }, []);
  return two;
};
