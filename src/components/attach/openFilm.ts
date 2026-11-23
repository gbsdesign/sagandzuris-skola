// The small opener of a pinned film (FilmHost draws it); kept apart so the path's code does not pull the videos' page in.
export const openFilm = (id: string, title: string) =>
  window.dispatchEvent(new CustomEvent('sg-open-film', { detail: { id, title } }));
