import React from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { StatusBadge } from '../../components/common/Badge';
import { CheckCircle2, BookOpen, Video, Award, Calendar, Bell, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

export const StudentDashboardPlaceholder: React.FC = () => {
  const { user } = useAuth();

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-brand-700 via-brand-600 to-indigo-700 rounded-3xl p-8 text-white shadow-xl shadow-brand-700/20 mb-8 relative overflow-hidden">
        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-white/20 text-white mb-4 backdrop-blur-sm">
            <CheckCircle2 className="w-3.5 h-3.5 mr-1.5 text-emerald-300" />
            Account Approved & Active
          </div>
          <h1 className="text-3xl sm:text-4xl font-black tracking-tight mb-2">
            Welcome back, {user?.fullName}!
          </h1>
          <p className="text-brand-100 text-sm sm:text-base leading-relaxed mb-6">
            Your registration has been approved by the institute administrator. You now have full access to your personalized learning dashboard.
          </p>

          <div className="flex flex-wrap gap-4 items-center">
            <div className="bg-white/10 backdrop-blur-md px-4 py-2 rounded-xl border border-white/20 text-xs">
              <span className="text-brand-200 block">Phone:</span>
              <span className="font-semibold">{user?.phone}</span>
            </div>
            {user?.email && (
              <div className="bg-white/10 backdrop-blur-md px-4 py-2 rounded-xl border border-white/20 text-xs">
                <span className="text-brand-200 block">Email:</span>
                <span className="font-semibold">{user?.email}</span>
              </div>
            )}
            <div className="bg-white/10 backdrop-blur-md px-4 py-2 rounded-xl border border-white/20 text-xs">
              <span className="text-brand-200 block">Account Status:</span>
              <span className="font-bold text-emerald-300">ACTIVE</span>
            </div>
          </div>
        </div>
      </div>

      {/* Phase 1 Verification Success Banner */}
      <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-6 mb-8">
        <div className="flex items-start">
          <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center mr-4 flex-shrink-0">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-base font-bold text-emerald-950">
              Phase 1 Authentication & Student Approval Engine: Active
            </h2>
            <p className="text-sm text-emerald-800 mt-1 leading-relaxed">
              This account successfully passed the backend administrative verification gate. Unauthorized or unapproved accounts are strictly blocked with HTTP 403.
            </p>
          </div>
        </div>
      </div>

      {/* Preview of Upcoming Features */}
      <div className="mb-4">
        <h3 className="text-lg font-bold text-slate-900 mb-4">Upcoming Learning Modules (Phase 2 - Phase 6)</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm opacity-85">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-brand-600 flex items-center justify-center mb-4">
              <BookOpen className="w-5 h-5" />
            </div>
            <h4 className="font-bold text-slate-900 mb-1">My Courses & Syllabus</h4>
            <p className="text-xs text-slate-500">Access purchased video lectures, topics, coding practice, and MCQs.</p>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm opacity-85">
            <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center mb-4">
              <Calendar className="w-5 h-5" />
            </div>
            <h4 className="font-bold text-slate-900 mb-1">Live Classes & Webinars</h4>
            <p className="text-xs text-slate-500">Interactive live sessions with instructors, live Q&A, and session recordings.</p>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm opacity-85">
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center mb-4">
              <Award className="w-5 h-5" />
            </div>
            <h4 className="font-bold text-slate-900 mb-1">Interactive Code Sandbox</h4>
            <p className="text-xs text-slate-500">Run and evaluate JavaScript, Python, and C++ code with automated test cases.</p>
          </div>
        </div>
      </div>
    </div>
  );
};
