import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { startOffline } from './utils/offlineFiles';
import { applyKhutsuri, isKhutsuri } from './utils/khutsuri';
import { markAndroidApp } from './utils/androidApp';
import { startAppUpdates } from './utils/appUpdate';

// a newly published version takes over by itself, as soon as it does not get in the way (utils/appUpdate.ts)
startAppUpdates();

// offline mode: the light data downloads by itself in the background (utils/offlineFiles.ts)
startOffline();

// ხუცური (the header's „Ⴞ“): set before the first paint, so the page doesn't flash in mkhedruli
applyKhutsuri(isKhutsuri());
markAndroidApp();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
