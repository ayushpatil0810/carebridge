// ============================================================
// App.jsx — Root Router + Auth Guard
// ============================================================

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ToastProvider } from './contexts/ToastContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/asha/Dashboard';
import PatientRegister from './pages/asha/PatientRegister';
import PatientSearch from './pages/asha/PatientSearch';
import PatientProfile from './pages/asha/PatientProfile';
import VisitEntry from './pages/asha/VisitEntry';
import PHCDashboard from './pages/phc/PHCDashboard';
import CaseReview from './pages/phc/CaseReview';
import PHCMaternityPanel from './pages/phc/PHCMaternityPanel';
import PHCVaccinationPanel from './pages/phc/PHCVaccinationPanel';
import ClarificationResponse from './pages/asha/ClarificationResponse';
import MessageTemplates from './pages/asha/MessageTemplates';
import MessageLog from './pages/asha/MessageLog';
import FollowUps from './pages/asha/FollowUps';
import MaternityTracker from './pages/asha/MaternityTracker';
import VaccinationTracker from './pages/asha/VaccinationTracker';
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminNotices from './pages/admin/AdminNotices';
import AdminPerformance from './pages/admin/AdminPerformance';
import AdminVaccinationPanel from './pages/admin/AdminVaccinationPanel';

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="loading-spinner" style={{ minHeight: '100vh' }}>
        <div>
          <div className="spinner"></div>
          <div className="loading-text">Loading...</div>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return children;
}

function RoleRedirect() {
  const { role, loading } = useAuth();

  if (loading) return null;

  if (role === 'admin') {
    return <Navigate to="/admin" replace />;
  }
  if (role === 'phc') {
    return <Navigate to="/phc" replace />;
  }
  return <Navigate to="/dashboard" replace />;
}

function AppRoutes() {
  const { user } = useAuth();

  return (
    <Routes>
      {/* Login */}
      <Route
        path="/login"
        element={user ? <RoleRedirect /> : <Login />}
      />

      {/* Protected routes with Layout */}
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        {/* Root redirect */}
        <Route index element={<RoleRedirect />} />

        {/* ASHA routes */}
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="register" element={<PatientRegister />} />
        <Route path="search" element={<PatientSearch />} />
        <Route path="patient/:id" element={<PatientProfile />} />
        <Route path="patient/:id/visit" element={<VisitEntry />} />
        <Route path="clarification/:visitId" element={<ClarificationResponse />} />
        <Route path="templates" element={<MessageTemplates />} />
        <Route path="message-log" element={<MessageLog />} />
        <Route path="follow-ups" element={<FollowUps />} />
        <Route path="maternity" element={<MaternityTracker />} />
        <Route path="vaccinations" element={<VaccinationTracker />} />

        {/* PHC routes */}
        <Route path="phc" element={<PHCDashboard />} />
        <Route path="phc/review/:visitId" element={<CaseReview />} />
        <Route path="phc/maternity" element={<PHCMaternityPanel />} />
        <Route path="phc/vaccinations" element={<PHCVaccinationPanel />} />

        {/* Admin routes */}
        <Route path="admin" element={<AdminDashboard />} />
        <Route path="admin/notices" element={<AdminNotices />} />
        <Route path="admin/performance" element={<AdminPerformance />} />
        <Route path="admin/vaccinations" element={<AdminVaccinationPanel />} />
      </Route>

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <AppRoutes />
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
