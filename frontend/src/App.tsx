import React from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
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
import { LiveClassesAdminPage } from './pages/admin/LiveClassesAdminPage';
import { NotificationsAdminPage } from './pages/admin/NotificationsAdminPage';
import { AdminDashboardOverviewPage } from './pages/admin/AdminDashboardOverviewPage';
import { StudentProgressDetailPage } from './pages/admin/StudentProgressDetailPage';
import { AuditLogsPage } from './pages/admin/AuditLogsPage';
import { FinancialDashboardPage } from './pages/admin/FinancialDashboardPage';
import { AdminMentorsPage } from './pages/admin/AdminMentorsPage';
import { LiveRoomPage } from './pages/live/LiveRoomPage';

import { AdminLayout } from './layouts/AdminLayout';
import { MentorLayout } from './layouts/MentorLayout';
import { MentorDashboardPage } from './pages/mentor/MentorDashboardPage';
import { MentorStudentsPage } from './pages/mentor/MentorStudentsPage';
import { MentorStudentDetailPage } from './pages/mentor/MentorStudentDetailPage';

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

  return <>{children}</>;
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
    return <Navigate to="/admin/dashboard" replace />;
  }

  if (user.role === 'MENTOR') {
    return <Navigate to="/mentor" replace />;
  }

  return <>{children}</>;
};

// Protected route guard for Mentor
const MentorRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <div className="w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (user.role !== 'MENTOR') {
    if (user.role === 'ADMIN') return <Navigate to="/admin/dashboard" replace />;
    return <Navigate to="/student/home" replace />;
  }

  return <>{children}</>;
};

// Protected route guard for In-Platform Live Session Studio (Admins and Approved Students)
const LiveSessionRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950">
        <div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (user.status === 'PENDING_APPROVAL') {
    return <Navigate to="/pending-approval" replace />;
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
    return <Navigate to="/admin/dashboard" replace />;
  }

  if (user.role === 'MENTOR') {
    return <Navigate to="/mentor" replace />;
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

          {/* Protected Admin Routes under AdminLayout with Left Navigation Sidebar */}
          <Route
            path="/admin"
            element={
              <AdminRoute>
                <AdminLayout />
              </AdminRoute>
            }
          >
            <Route index element={<Navigate to="/admin/dashboard" replace />} />
            <Route path="dashboard" element={<AdminDashboardOverviewPage />} />
            <Route path="finances" element={<FinancialDashboardPage />} />
            <Route path="courses" element={<CourseListPage />} />
            <Route path="courses/:id/curriculum" element={<CurriculumEditorPage />} />
            <Route path="pending-students" element={<PendingStudentsPage />} />
            <Route path="students" element={<AllStudentsPage />} />
            <Route path="students/:id/progress" element={<StudentProgressDetailPage />} />
            <Route path="payments" element={<PaymentAuditPage />} />
            <Route path="live-classes" element={<LiveClassesAdminPage />} />
            <Route path="notifications" element={<NotificationsAdminPage />} />
            <Route path="mentors" element={<AdminMentorsPage />} />
            <Route path="audit-logs" element={<AuditLogsPage />} />
          </Route>

          {/* Protected Mentor Routes under MentorLayout */}
          <Route
            path="/mentor"
            element={
              <MentorRoute>
                <MentorLayout />
              </MentorRoute>
            }
          >
            <Route index element={<MentorDashboardPage />} />
            <Route path="students" element={<MentorStudentsPage />} />
            <Route path="students/:studentId" element={<MentorStudentDetailPage />} />
          </Route>

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

          {/* Native In-Platform Live Virtual Classroom Studio (Google Meet alternative) */}
          <Route
            path="/live/:id"
            element={
              <LiveSessionRoute>
                <LiveRoomPage />
              </LiveSessionRoute>
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
