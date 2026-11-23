import React, { useEffect, useState } from 'react';
import { VideoPlayer } from '../../pages/v2/khalkhuri/videos';

// A film pinned on a path (`v:<YouTube id>`, 2026-11-23) plays in the videos' own window wherever the path is — the films
// live in many lists, so the path opens it alone. `openFilm` (attach/openFilm) asks for it; App draws this host.

const EVENT = 'sg-open-film';

export const FilmHost: React.FC = () => {
  const [film, setFilm] = useState<{ id: string; title: string } | null>(null);
  useEffect(() => {
    const on = (e: Event) => setFilm((e as CustomEvent<{ id: string; title: string }>).detail);
    window.addEventListener(EVENT, on);
    return () => window.removeEventListener(EVENT, on);
  }, []);
  if (!film) return null;
  return (
    <VideoPlayer
      films={[{ id: film.id, title: film.title, sub: '', secs: 0 }]}
      open={film.id}
      onMove={() => {}}
      onClose={() => setFilm(null)}
    />
  );
};
