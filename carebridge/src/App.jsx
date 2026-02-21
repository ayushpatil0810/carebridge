// ============================================================
// App.jsx — Root Router + Auth Guard
// ============================================================

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/asha/Dashboard';
import PatientRegister from './pages/asha/PatientRegister';
import PatientSearch from './pages/asha/PatientSearch';
import PatientProfile from './pages/asha/PatientProfile';
import VisitEntry from './pages/asha/VisitEntry';
import PHCDashboard from './pages/phc/PHCDashboard';
import CaseReview from './pages/phc/CaseReview';

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

        {/* PHC routes */}
        <Route path="phc" element={<PHCDashboard />} />
        <Route path="phc/review/:visitId" element={<CaseReview />} />
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
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}
