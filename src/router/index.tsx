import React, { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from './ProtectedRoute';

// Auth Views
const Login = lazy(() => import('../views/auth/Login'));
const Register = lazy(() => import('../views/auth/Register'));

// Participant Views
const Dashboard = lazy(() => import('../views/participant/Dashboard'));
const MapelList = lazy(() => import('../views/participant/MapelList'));
const BundleList = lazy(() => import('../views/participant/BundleList'));
const CBTWorkspace = lazy(() => import('../views/participant/CBTWorkspace'));
const History = lazy(() => import('../views/participant/History'));
const Review = lazy(() => import('../views/participant/Review'));

// Admin Views
const AdminDashboard = lazy(() => import('../views/admin/AdminDashboard'));
const SubmissionList = lazy(() => import('../views/admin/SubmissionList'));
const GradeDetail = lazy(() => import('../views/admin/GradeDetail'));
const StudentManagement = lazy(() => import('../views/admin/StudentManagement'));
const SessionAll = lazy(() => import('../views/admin/SessionAll'));
const SessionManagement = lazy(() => import('../views/admin/SessionManagement'));
const Invoice = lazy(() => import('../views/admin/Invoice'));
const Report = lazy(() => import('../views/admin/Report'));

const AppRouter: React.FC = () => {
  return (
    <Suspense fallback={
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        Loading...
      </div>
    }>
      <Routes>
        {/* Public Routes */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* Participant Routes */}
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/jenjang/:id/mapel"
          element={
            <ProtectedRoute>
              <MapelList />
            </ProtectedRoute>
          }
        />
        <Route
          path="/mapel/:id/bundles"
          element={
            <ProtectedRoute>
              <BundleList />
            </ProtectedRoute>
          }
        />
        <Route
          path="/ujian/:id"
          element={
            <ProtectedRoute>
              <CBTWorkspace />
            </ProtectedRoute>
          }
        />
        <Route
          path="/history"
          element={
            <ProtectedRoute>
              <History />
            </ProtectedRoute>
          }
        />
        <Route
          path="/review/:id"
          element={
            <ProtectedRoute>
              <Review />
            </ProtectedRoute>
          }
        />

        {/* Admin Routes */}
        <Route
          path="/admin/dashboard"
          element={
            <ProtectedRoute requiredRole="admin">
              <AdminDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/students"
          element={
            <ProtectedRoute requiredRole="admin">
              <StudentManagement />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/sessions"
          element={
            <ProtectedRoute requiredRole="admin">
              <SessionAll />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/sessions/form"
          element={
            <ProtectedRoute requiredRole="admin">
              <SessionManagement />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/koreksi"
          element={
            <ProtectedRoute requiredRole="admin">
              <SubmissionList />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/koreksi/:id"
          element={
            <ProtectedRoute requiredRole="admin">
              <GradeDetail />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/invoice"
          element={
            <ProtectedRoute requiredRole="admin">
              <Invoice />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/report"
          element={
            <ProtectedRoute requiredRole="admin">
              <Report />
            </ProtectedRoute>
          }
        />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
};

export default AppRouter;
