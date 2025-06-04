/**
 * Main App component with routing
 */
import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/authStore';

// Pages
import { LoginPage } from './pages/LoginPage';
import { StudentChaptersPage } from './pages/student/StudentChaptersPage';
import { StudentPracticePage } from './pages/student/StudentPracticePage';
import { StudentProgressPage } from './pages/student/StudentProgressPage';
import { TeacherUploadPage } from './pages/teacher/TeacherUploadPage';
import { TeacherGeneratePage } from './pages/teacher/TeacherGeneratePage';
import { TeacherAnalyticsPage } from './pages/teacher/TeacherAnalyticsPage';
import { TeacherChaptersPage } from './pages/teacher/TeacherChaptersPage';

// Private route wrapper
const PrivateRoute = ({ children, role }: { children: React.ReactNode, role?: 'teacher' | 'student' }) => {
  const { isAuthenticated, user } = useAuthStore();
  
  if (!isAuthenticated) {
    return <Navigate to="/login" />;
  }
  
  if (role && user?.role !== role) {
    return <Navigate to={user?.role === 'teacher' ? '/teacher/chapters' : '/student/chapters'} />;
  }
  
  return <>{children}</>;
};

function App() {
  const { checkSession } = useAuthStore();

  useEffect(() => {
    checkSession();
  }, [checkSession]);
  
  return (
    <BrowserRouter>
      <Routes>
        {/* Public routes */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/" element={<Navigate to="/login" />} />
        
        {/* Student routes */}
        <Route 
          path="/student/chapters" 
          element={
            <PrivateRoute role="student">
              <StudentChaptersPage />
            </PrivateRoute>
          } 
        />
        <Route 
          path="/student/practice/:chapterId" 
          element={
            <PrivateRoute role="student">
              <StudentPracticePage />
            </PrivateRoute>
          } 
        />
        <Route 
          path="/student/progress" 
          element={
            <PrivateRoute role="student">
              <StudentProgressPage />
            </PrivateRoute>
          } 
        />
        
        {/* Teacher routes */}
        <Route 
          path="/teacher/chapters" 
          element={
            <PrivateRoute role="teacher">
              <TeacherChaptersPage />
            </PrivateRoute>
          } 
        />
        <Route 
          path="/teacher/upload" 
          element={
            <PrivateRoute role="teacher">
              <TeacherUploadPage />
            </PrivateRoute>
          } 
        />
        <Route 
          path="/teacher/generate/:chapterId" 
          element={
            <PrivateRoute role="teacher">
              <TeacherGeneratePage />
            </PrivateRoute>
          } 
        />
        <Route 
          path="/teacher/analytics" 
          element={
            <PrivateRoute role="teacher">
              <TeacherAnalyticsPage />
            </PrivateRoute>
          } 
        />
        
        {/* Fallback route */}
        <Route path="*" element={<Navigate to="/login" />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;