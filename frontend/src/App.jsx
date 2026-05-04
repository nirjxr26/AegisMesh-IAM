import { Component, Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import AppLayout from './components/layout/AppLayout';
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import VerifyEmail from './pages/VerifyEmail';
import OAuthCallback from './pages/OAuthCallback';

const Dashboard = lazy(() => import('./pages/Dashboard'));
const UsersList = lazy(() => import('./pages/users/UsersList'));
const RolesList = lazy(() => import('./pages/rbac/RolesList'));
const PoliciesList = lazy(() => import('./pages/rbac/PoliciesList'));
const GroupsList = lazy(() => import('./pages/rbac/GroupsList'));
const UserDetail = lazy(() => import('./pages/users/UserDetail'));
const RoleDetail = lazy(() => import('./pages/rbac/RoleDetail'));
const PolicyDetail = lazy(() => import('./pages/rbac/PolicyDetail'));
const GroupDetail = lazy(() => import('./pages/rbac/GroupDetail'));
const UserPermissions = lazy(() => import('./pages/rbac/UserPermissions'));
const AuditLogsPage = lazy(() => import('./pages/audit/AuditLogsPage'));
const AuditStatsPage = lazy(() => import('./pages/audit/AuditStatsPage'));
const UserCreate = lazy(() => import('./pages/users/UserCreate'));
const UserEdit = lazy(() => import('./pages/users/UserEdit'));
const SecurityPage = lazy(() => import('./pages/security/SecurityPage'));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function RouteLoader() {
  return (
    <div className="min-h-[calc(100vh-64px)] flex items-center justify-center bg-aws-dark">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 border-3 border-aws-orange border-t-transparent rounded-full animate-spin"></div>
        <p className="text-aws-text-dim text-sm animate-pulse">Loading module...</p>
      </div>
    </div>
  );
}

function LazyRoute({ children }) {
  return <Suspense fallback={<RouteLoader />}>{children}</Suspense>;
}

class AppErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Application runtime error:', error, errorInfo);
  }

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-aws-dark px-6">
          <div className="max-w-xl w-full rounded-2xl border border-aws-border bg-aws-card p-8 shadow-xl text-center">
            <h1 className="text-2xl font-bold text-aws-text">AegisMesh hit a frontend error</h1>
            <p className="mt-3 text-sm text-aws-text-dim">
              The app crashed during rendering. Reload to recover. If this keeps happening,
              open browser DevTools and share the console error.
            </p>
            <button
              type="button"
              onClick={this.handleReload}
              className="mt-6 inline-flex items-center justify-center rounded-lg px-4 py-2 text-sm font-semibold btn-accent-glow"
            >
              Reload App
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default function App() {
  return (
    <AppErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <Toaster position="top-right" />
        <Router>
          <AuthProvider>
            <Routes>
              {/* Public Routes */}
              <Route path="/" element={<Navigate to="/login" replace />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/verify-email" element={<VerifyEmail />} />
              <Route path="/oauth/callback" element={<OAuthCallback />} />

              {/* Protected Shell + Routes */}
              <Route element={<ProtectedRoute />}>
                <Route element={<AppLayout />}>
                  <Route path="/dashboard" element={<LazyRoute><Dashboard /></LazyRoute>} />

                  {/* RBAC Dashboard Routes */}
                  <Route path="/dashboard/users" element={<LazyRoute><UsersList /></LazyRoute>} />
                  <Route path="/dashboard/security" element={<LazyRoute><SecurityPage /></LazyRoute>} />
                  <Route path="/dashboard/users/new" element={<LazyRoute><UserCreate /></LazyRoute>} />
                  <Route path="/dashboard/users/:id" element={<LazyRoute><UserDetail /></LazyRoute>} />
                  <Route path="/dashboard/users/:id/edit" element={<LazyRoute><UserEdit /></LazyRoute>} />
                  <Route path="/dashboard/roles" element={<LazyRoute><RolesList /></LazyRoute>} />
                  <Route path="/dashboard/roles/:id" element={<LazyRoute><RoleDetail /></LazyRoute>} />
                  <Route path="/dashboard/policies" element={<LazyRoute><PoliciesList /></LazyRoute>} />
                  <Route path="/dashboard/policies/:id" element={<LazyRoute><PolicyDetail /></LazyRoute>} />
                  <Route path="/dashboard/groups" element={<LazyRoute><GroupsList /></LazyRoute>} />
                  <Route path="/dashboard/groups/:id" element={<LazyRoute><GroupDetail /></LazyRoute>} />
                  <Route path="/dashboard/users/:id/permissions" element={<LazyRoute><UserPermissions /></LazyRoute>} />
                  <Route path="/dashboard/audit-logs" element={<LazyRoute><AuditLogsPage /></LazyRoute>} />
                  <Route path="/dashboard/audit-logs/stats" element={<LazyRoute><AuditStatsPage /></LazyRoute>} />

                  <Route path="/settings/mfa" element={<Navigate to="/dashboard/security" replace />} />
                  <Route path="/settings/security" element={<Navigate to="/dashboard/security" replace />} />
                  <Route path="/settings" element={<Navigate to="/dashboard" replace />} />
                  <Route path="/settings/:legacyTab" element={<Navigate to="/dashboard" replace />} />
                </Route>
              </Route>

              {/* Fallback */}
              <Route path="*" element={<Navigate to="/login" replace />} />
            </Routes>
          </AuthProvider>
        </Router>
      </QueryClientProvider>
    </AppErrorBoundary>
  );
}


