/**
 * App.tsx — Iragu+ (therapist CRM) root application.
 *
 * Real per-screen routing — the #1 structural fix over the old Ataraxia
 * shell, which switched ~30 "tabs" via useState inside one 1,240-line
 * component with no nested <Route>s at all (no deep links, no working back
 * button, one shared JS bundle regardless of which screen was open). Every
 * screen here is its own lazy-loaded route under <AppLayout>.
 *
 * Auth/session patterns (idle timeout, session-expired handling, Zustand
 * store) are ported from Ataraxia's App.tsx — HIPAA §164.312(a)(2)(iii)
 * requires the 15-minute automatic logoff.
 */

import { useEffect, useCallback, useRef, Suspense, lazy } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from './components/ui/sonner';
import { logger } from './utils/secureLogger';
import { ErrorBoundary } from './components/ErrorBoundary';
import { useAuthStore } from './store/authStore';
import { AppLayout } from './components/layout/AppLayout';

const LoginPage = lazy(() => import('./pages/LoginPage'));
const SignupPage = lazy(() => import('./pages/SignupPage'));
const DashboardPage = lazy(() => import('./pages/DashboardPage'));
const CalendarPage = lazy(() => import('./pages/CalendarPage'));
const ClientsPage = lazy(() => import('./pages/ClientsPage'));
const ClientDetailPage = lazy(() => import('./pages/ClientDetailPage'));
const RequestsPage = lazy(() => import('./pages/RequestsPage'));
const NotesPage = lazy(() => import('./pages/NotesPage'));
const TasksPage = lazy(() => import('./pages/TasksPage'));
const MessagesPage = lazy(() => import('./pages/MessagesPage'));
const TelehealthPage = lazy(() => import('./pages/TelehealthPage'));
const NotificationsPage = lazy(() => import('./pages/NotificationsPage'));
const EarningsPage = lazy(() => import('./pages/EarningsPage'));
const StatementsPage = lazy(() => import('./pages/StatementsPage'));
const PayoutsPage = lazy(() => import('./pages/PayoutsPage'));
const PlansPage = lazy(() => import('./pages/PlansPage'));
const AnalyticsPage = lazy(() => import('./pages/AnalyticsPage'));
const ActivityPage = lazy(() => import('./pages/ActivityPage'));
const SettingsPage = lazy(() => import('./pages/SettingsPage'));
const SupportPage = lazy(() => import('./pages/SupportPage'));

// ─── Auth Guard ───────────────────────────────────────────────────────────────
function RequireAuth({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const isLoading = useAuthStore((s) => s.isLoading);
  const role = useAuthStore((s) => s.user?.role);

  if (isLoading) return null; // App's top-level spinner covers this
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  // Iragu+ is the therapist/practice app — a client-role login belongs in
  // the separate client-facing app (iragu_saas), not here.
  if (role === 'client') return <Navigate to="/login?reason=wrong-app" replace />;
  return <>{children}</>;
}

// ─── Idle Timeout (HIPAA §164.312(a)(2)(iii)) ────────────────────────────────
function useIdleTimeout(timeoutMs: number, onTimeout: () => void) {
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const stableOnTimeout = useCallback(onTimeout, []); // eslint-disable-line react-hooks/exhaustive-deps

  const resetTimeout = useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(stableOnTimeout, timeoutMs);
  }, [stableOnTimeout, timeoutMs]);

  useEffect(() => {
    const events = ['mousedown', 'keydown', 'scroll', 'touchstart'] as const;
    events.forEach((e) => document.addEventListener(e, resetTimeout, { passive: true }));
    resetTimeout();
    return () => {
      events.forEach((e) => document.removeEventListener(e, resetTimeout));
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [resetTimeout]);
}

const PageSpinner = () => (
  <div className="flex min-h-screen items-center justify-center" style={{ background: 'var(--canvas)' }}>
    <div
      className="h-8 w-8 animate-spin rounded-full border-2 border-t-transparent"
      style={{ borderColor: 'var(--action)', borderTopColor: 'transparent' }}
    />
  </div>
);

export default function App() {
  const user = useAuthStore((s) => s.user);
  const isLoading = useAuthStore((s) => s.isLoading);
  const refreshUser = useAuthStore((s) => s.refreshUser);
  const storeLogout = useAuthStore((s) => s.logout);

  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  useEffect(() => {
    const handleExpiry = () => {
      storeLogout();
      logger.info('Session expired — cleared client state');
    };
    window.addEventListener('auth:session-expired', handleExpiry);
    return () => window.removeEventListener('auth:session-expired', handleExpiry);
  }, [storeLogout]);

  useIdleTimeout(15 * 60 * 1000, () => {
    if (user) {
      logger.info('Session timed out due to inactivity');
      storeLogout().finally(() => {
        window.location.replace('/login?reason=timeout');
      });
    }
  });

  if (isLoading) return <PageSpinner />;

  return (
    <>
      <ErrorBoundary>
        <Suspense fallback={<PageSpinner />}>
          <Routes>
            {/* ─── Public ──────────────────────────────────────────────── */}
            {/*
              A logged-in `client` role must stay on /login (it's where
              RequireAuth sends them, with an explanatory toast) rather than
              bounce to /dashboard — they have no access to this app at all.
              Redirecting them here too would create a redirect loop with
              RequireAuth's client check ("Maximum update depth exceeded").
            */}
            <Route
              path="/login"
              element={
                <ErrorBoundary>
                  {user && user.role !== 'client' ? <Navigate to="/dashboard" replace /> : <LoginPage />}
                </ErrorBoundary>
              }
            />
            <Route
              path="/signup"
              element={
                <ErrorBoundary>
                  {user && user.role !== 'client' ? <Navigate to="/dashboard" replace /> : <SignupPage />}
                </ErrorBoundary>
              }
            />

            {/* ─── Protected — one real route per screen ──────────────── */}
            <Route
              element={
                <RequireAuth>
                  <ErrorBoundary>
                    <AppLayout />
                  </ErrorBoundary>
                </RequireAuth>
              }
            >
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/calendar" element={<CalendarPage />} />
              <Route path="/clients" element={<ClientsPage />} />
              <Route path="/clients/:clientId" element={<ClientDetailPage />} />
              <Route path="/requests" element={<RequestsPage />} />
              <Route path="/notes" element={<NotesPage />} />
              <Route path="/tasks" element={<TasksPage />} />
              <Route path="/messages" element={<MessagesPage />} />
              <Route path="/telehealth" element={<TelehealthPage />} />
              <Route path="/notifications" element={<NotificationsPage />} />
              <Route path="/billing" element={<EarningsPage />} />
              <Route path="/invoices" element={<StatementsPage />} />
              <Route path="/payments" element={<PayoutsPage />} />
              <Route path="/plans" element={<PlansPage />} />
              <Route path="/analytics" element={<AnalyticsPage />} />
              <Route path="/activity" element={<ActivityPage />} />
              <Route path="/settings" element={<SettingsPage />} />
              <Route path="/settings/:section" element={<SettingsPage />} />
              <Route path="/support" element={<SupportPage />} />
              {/* /assistant intentionally deferred — see plan doc: AI Assistant scope */}
            </Route>

            <Route path="/" element={<Navigate to={user ? '/dashboard' : '/login'} replace />} />
            <Route path="*" element={<Navigate to={user ? '/dashboard' : '/login'} replace />} />
          </Routes>
        </Suspense>
      </ErrorBoundary>

      <Toaster />
    </>
  );
}
