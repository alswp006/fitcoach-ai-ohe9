import type { ReactElement } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import Home from './pages/Home';
import Onboarding from './pages/Onboarding';
import Plan from './pages/Plan';
import Workout from './pages/Workout';
import Report from './pages/Report';
import Challenge from './pages/Challenge';
import Subscribe from './pages/Subscribe';
import { AppProvider, useApp } from './lib/appContext';

// Dev-only TDS Gallery route — `import.meta.env.DEV` is statically replaced
// (true in dev, false in prod) so the entire import + Route is tree-shaken
// from production builds. Verify with: `grep -r "TdsGallery" dist/` → empty.
const DevTdsGallery = import.meta.env.DEV
  ? lazy(() => import('./pages/__TdsGallery'))
  : null;

// 온보딩 가드: /onboarding을 제외한 모든 라우트의 element를 이걸로 감싼다.
// react-router가 이미 경로를 매치한 뒤 렌더하는 element라서 useLocation 없이도
// "이 라우트가 /onboarding이 아니다"를 알 수 있다(현재 경로 파싱 불필요).
function RequireOnboarded({ children }: { children: ReactElement }) {
  const { flags } = useApp();
  if (!flags.onboarded) {
    return <Navigate to="/onboarding" replace />;
  }
  return children;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<RequireOnboarded><Home /></RequireOnboarded>} />
      <Route path="/onboarding" element={<Onboarding />} />
      <Route path="/plan" element={<RequireOnboarded><Plan /></RequireOnboarded>} />
      <Route
        path="/workout/:exerciseId"
        element={
          <RequireOnboarded>
            <Workout />
          </RequireOnboarded>
        }
      />
      <Route
        path="/report/:sessionId"
        element={
          <RequireOnboarded>
            <Report />
          </RequireOnboarded>
        }
      />
      <Route path="/challenge" element={<RequireOnboarded><Challenge /></RequireOnboarded>} />
      <Route path="/subscribe" element={<RequireOnboarded><Subscribe /></RequireOnboarded>} />
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
  );
}

export default function App() {
  return (
    <AppProvider>
      <AppRoutes />
    </AppProvider>
  );
}
