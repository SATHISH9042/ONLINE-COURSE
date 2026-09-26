import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { Navbar } from './components/common/Navbar';
import { LoginPage } from './pages/auth/LoginPage';
import { RegisterPage } from './pages/auth/RegisterPage';
import { PendingApprovalPage } from './pages/auth/PendingApprovalPage';
import { PendingStudentsPage } from './pages/admin/PendingStudentsPage';
import { AllStudentsPage } from './pages/admin/AllStudentsPage';
import { CourseListPage } from './pages/admin/CourseListPage';
import { CurriculumEditorPage } from './pages/admin/CurriculumEditorPage';
import { StudentLayout } from './layouts/StudentLayout';
import { StudentHomePage } from './pages/student/StudentHomePage';
import { MyCoursesPage } from './pages/student/MyCoursesPage';
import { BrowseCoursesPage } from './pages/student/BrowseCoursesPage';
import { LiveClassesPage } from './pages/student/LiveClassesPage';
import { NotificationsPage } from './pages/student/NotificationsPage';
import { StudentProfilePage } from './pages/student/StudentProfilePage';
import { HelpPage } from './pages/student/HelpPage';
import { CourseLearningPage } from './pages/learning/CourseLearningPage';
import { CourseCheckoutPage } from './pages/student/CourseCheckoutPage';
import { PaymentAuditPage } from './pages/admin/PaymentAuditPage';

// Protected route guard for Admin
const AdminRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="w-8 h-8 border-4 border-brand-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (user.role !== 'ADMIN') {
    return <Navigate to="/student/home" replace />;
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <Navbar />
      <main className="flex-1">{children}</main>
    </div>
  );
};

// Protected route guard for Student
const StudentRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="w-8 h-8 border-4 border-brand-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (user.status === 'PENDING_APPROVAL') {
    return <Navigate to="/pending-approval" replace />;
  }

  if (user.role === 'ADMIN') {
    return <Navigate to="/admin/pending-students" replace />;
  }

  return <>{children}</>;
};

// Root index redirector
const RootRedirect: React.FC = () => {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="w-8 h-8 border-4 border-brand-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (user.role === 'ADMIN') {
    return <Navigate to="/admin/pending-students" replace />;
  }

  if (user.status === 'PENDING_APPROVAL') {
    return <Navigate to="/pending-approval" replace />;
  }

  return <Navigate to="/student/home" replace />;
};

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* Root redirector */}
          <Route path="/" element={<RootRedirect />} />

          {/* Public auth routes */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/pending-approval" element={<PendingApprovalPage />} />

          {/* Protected Admin Routes */}
          <Route
            path="/admin/courses"
            element={
              <AdminRoute>
                <CourseListPage />
              </AdminRoute>
            }
          />
          <Route
            path="/admin/courses/:id/curriculum"
            element={
              <AdminRoute>
                <CurriculumEditorPage />
              </AdminRoute>
            }
          />
          <Route
            path="/admin/pending-students"
            element={
              <AdminRoute>
                <PendingStudentsPage />
              </AdminRoute>
            }
          />
          <Route
            path="/admin/students"
            element={
              <AdminRoute>
                <AllStudentsPage />
              </AdminRoute>
            }
          />
          <Route
            path="/admin/payments"
            element={
              <AdminRoute>
                <PaymentAuditPage />
              </AdminRoute>
            }
          />

          {/* SECTION 6: Protected Student Routes under StudentLayout */}
          <Route
            path="/student"
            element={
              <StudentRoute>
                <StudentLayout />
              </StudentRoute>
            }
          >
            <Route index element={<Navigate to="/student/home" replace />} />
            <Route path="home" element={<StudentHomePage />} />
            <Route path="dashboard" element={<Navigate to="/student/home" replace />} />
            <Route path="my-courses" element={<MyCoursesPage />} />
            <Route path="browse" element={<BrowseCoursesPage />} />
            <Route path="live-classes" element={<LiveClassesPage />} />
            <Route path="notifications" element={<NotificationsPage />} />
            <Route path="profile" element={<StudentProfilePage />} />
            <Route path="help" element={<HelpPage />} />
          </Route>

          {/* Section 10: Course Purchase Confirmation & Payment Checkout */}
          <Route
            path="/student/courses/:courseId/checkout"
            element={
              <StudentRoute>
                <CourseCheckoutPage />
              </StudentRoute>
            }
          />

          {/* Section 12-17: Dedicated Course Learning Interface */}
          <Route
            path="/student/courses/:courseId/learn"
            element={
              <StudentRoute>
                <CourseLearningPage />
              </StudentRoute>
            }
          />

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
};
export default App;
