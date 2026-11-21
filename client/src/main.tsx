import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.tsx';
import { AuthProvider } from './context/AuthContext';

// Keep --app-height synced to the true visible viewport across mobile WebViews
// (LinkedIn / WhatsApp in-app browsers, Android Custom Tabs, iOS Safari & soft keyboards)
const syncAppViewportHeight = () => {
  const vv = window.visualViewport;
  const visibleHeight = vv ? vv.height : window.innerHeight;
  if (visibleHeight > 0) {
    document.documentElement.style.setProperty('--app-height', `${Math.round(visibleHeight)}px`);
  }
  // Keep fixed root anchored to the top of the visual viewport when mobile keyboards appear
  if (vv && vv.offsetTop > 0) {
    window.scrollTo(0, 0);
  }
};

syncAppViewportHeight();
window.addEventListener('resize', syncAppViewportHeight, { passive: true });
window.addEventListener(
  'orientationchange',
  () => {
    window.setTimeout(syncAppViewportHeight, 150);
  },
  { passive: true },
);
if (window.visualViewport) {
  window.visualViewport.addEventListener('resize', syncAppViewportHeight, { passive: true });
  window.visualViewport.addEventListener('scroll', syncAppViewportHeight, { passive: true });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  </StrictMode>,
);
