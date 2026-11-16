import { Suspense, lazy } from 'react';
import { Routes, Route } from 'react-router-dom';
import { MotionConfig } from 'framer-motion';
import Home from './pages/Home';
import Login from './pages/Login';
import ParticipantView from './pages/ParticipantView';

const Dashboard = lazy(() => import('./pages/Dashboard'));
const LivePresentation = lazy(() => import('./pages/LivePresentation'));
const RemoteControl = lazy(() => import('./pages/RemoteControl'));
const ReportView = lazy(() => import('./pages/ReportView'));
const NotFound = lazy(() => import('./pages/NotFound'));

function RouteFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center text-white/75 text-sm" role="status" aria-live="polite">
      Loading...
    </div>
  );
}

function App() {
  return (
    <MotionConfig reducedMotion="user">
      <Suspense fallback={<RouteFallback />}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/live/:code" element={<LivePresentation />} />
          <Route path="/live/:code/report" element={<ReportView />} />
          <Route path="/remote/:code" element={<RemoteControl />} />
          <Route path="/:code" element={<ParticipantView />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
    </MotionConfig>
  );
}

export default App;
