import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from './ProtectedRoute';
import Login from '../views/auth/Login';
import Register from '../views/auth/Register';

import Dashboard from '../views/participant/Dashboard';
import MapelList from '../views/participant/MapelList';
import BundleList from '../views/participant/BundleList';
import CBTWorkspace from '../views/participant/CBTWorkspace';
import History from '../views/participant/History';
import Review from '../views/participant/Review';
import AdminDashboard from '../views/admin/AdminDashboard';
import SubmissionList from '../views/admin/SubmissionList';
import GradeDetail from '../views/admin/GradeDetail';

import StudentManagement from '../views/admin/StudentManagement';
import SessionManagement from '../views/admin/SessionManagement';

const AppRouter: React.FC = () => {
  return (
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

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

export default AppRouter;
