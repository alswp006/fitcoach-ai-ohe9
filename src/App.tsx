import { Routes, Route } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import Home from './pages/Home';
import Onboarding from './pages/Onboarding';
import Plan from './pages/Plan';
import Workout from './pages/Workout';
import Report from './pages/Report';
import Challenge from './pages/Challenge';
import Subscribe from './pages/Subscribe';
import { AppProvider } from './lib/appContext';

// Dev-only TDS Gallery route — `import.meta.env.DEV` is statically replaced
// (true in dev, false in prod) so the entire import + Route is tree-shaken
// from production builds. Verify with: `grep -r "TdsGallery" dist/` → empty.
const DevTdsGallery = import.meta.env.DEV
  ? lazy(() => import('./pages/__TdsGallery'))
  : null;

export default function App() {
  return (
    <AppProvider>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/onboarding" element={<Onboarding />} />
        <Route path="/plan" element={<Plan />} />
        <Route path="/workout/:exerciseId" element={<Workout />} />
        <Route path="/report/:sessionId" element={<Report />} />
        <Route path="/challenge" element={<Challenge />} />
        <Route path="/subscribe" element={<Subscribe />} />
        {DevTdsGallery && (
          <Route
            path="/__tds-gallery"
            element={
              <Suspense fallback={null}>
                <DevTdsGallery />
              </Suspense>
            }
          />
        )}
      </Routes>
    </AppProvider>
  );
}
