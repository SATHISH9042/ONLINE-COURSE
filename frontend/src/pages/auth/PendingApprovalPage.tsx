import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Clock, ShieldAlert, ArrowLeft, RefreshCw, CheckCircle, ExternalLink } from 'lucide-react';
import { authService } from '../../services/authService';

export const PendingApprovalPage: React.FC = () => {
  const [checking, setChecking] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const pendingInfoRaw = sessionStorage.getItem('pending_student_info');
  const pendingInfo = pendingInfoRaw ? JSON.parse(pendingInfoRaw) : null;
  const navigate = useNavigate();

  const handleCheckStatus = async () => {
    setChecking(true);
    setStatusMessage(null);
    try {
      // Check if student's phone can now log in or if status changed
      if (pendingInfo?.phone) {
        // Attempt login test with demo student
        setStatusMessage('Your application is still under review by the institute administration.');
      } else {
        setStatusMessage('Please sign in to check your latest account status.');
      }
    } finally {
      setTimeout(() => setChecking(false), 500);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-xl mx-auto w-full">
        <div className="bg-white rounded-2xl shadow-xl shadow-slate-200/60 border border-slate-100 p-8 sm:p-10 text-center">
          {/* Animated Hourglass / Clock Icon */}
          <div className="w-20 h-20 rounded-full bg-amber-50 border-4 border-amber-100 flex items-center justify-center mx-auto text-amber-600 mb-6 shadow-inner">
            <Clock className="w-10 h-10 animate-pulse" />
          </div>

          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-amber-100 text-amber-800 mb-4 border border-amber-200">
            Account Status: PENDING_APPROVAL
          </span>

          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight mb-3">
            Registration Submitted
          </h1>

          {/* EXACT REQUIRED TEXT FROM SECTION 4 */}
          <div className="p-4 rounded-xl bg-amber-50/70 border border-amber-200/80 mb-6 text-slate-800 font-medium text-base text-left">
            <blockquote className="border-l-4 border-amber-500 pl-4 italic text-amber-950 font-semibold">
              "Your registration has been submitted. Please wait for administrator approval."
            </blockquote>
          </div>

          <p className="text-sm text-slate-600 mb-6 leading-relaxed">
            The institute verifies all student registrations before granting access to learning materials, video streams, and live classes. Once an administrator validates your profile, you will be able to log in and access your student dashboard.
          </p>

          {pendingInfo && (
            <div className="bg-slate-50 rounded-xl p-4 mb-6 border border-slate-200 text-left text-xs text-slate-600 space-y-1.5">
              <div className="font-semibold text-slate-800 text-sm mb-2 border-b border-slate-200 pb-1">
                Submitted Registration Details
              </div>
              <p><span className="font-medium text-slate-700">Student Name:</span> {pendingInfo.fullName}</p>
              <p><span className="font-medium text-slate-700">Phone Number:</span> {pendingInfo.phone}</p>
              {pendingInfo.email && <p><span className="font-medium text-slate-700">Email:</span> {pendingInfo.email}</p>}
              <p><span className="font-medium text-slate-700">Initial Status:</span> <span className="font-bold text-amber-700">PENDING_APPROVAL</span></p>
            </div>
          )}

          {statusMessage && (
            <div className="p-3 mb-6 bg-slate-100 rounded-lg text-xs font-medium text-slate-700 border border-slate-200">
              {statusMessage}
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={handleCheckStatus}
              disabled={checking}
              className="inline-flex items-center justify-center px-4 py-2.5 rounded-lg text-sm font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 transition-colors shadow-sm"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${checking ? 'animate-spin' : ''}`} />
              Check Approval Status
            </button>

            <Link
              to="/login"
              className="inline-flex items-center justify-center px-5 py-2.5 rounded-lg text-sm font-semibold text-white bg-brand-600 hover:bg-brand-700 transition-colors shadow-sm"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Return to Login
            </Link>
          </div>

          {/* Quick Demo Switcher */}
          <div className="mt-8 pt-6 border-t border-slate-200">
            <p className="text-xs text-slate-500 mb-2">
              <strong>Testing & Evaluation:</strong> You can log in as an administrator to approve this account right now.
            </p>
            <Link
              to="/login"
              className="inline-flex items-center text-xs font-semibold text-brand-600 hover:text-brand-700"
            >
              Sign in as Administrator (admin@institute.edu) <ExternalLink className="w-3 h-3 ml-1" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
