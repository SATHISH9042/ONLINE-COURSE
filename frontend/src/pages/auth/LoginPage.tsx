import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { authService } from '../../services/authService';
import { GraduationCap, Lock, Phone, AlertCircle, ArrowRight, ShieldCheck } from 'lucide-react';

export const LoginPage: React.FC = () => {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pendingNotice, setPendingNotice] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setPendingNotice(null);

    if (!identifier.trim()) {
      setError('Please enter your phone number or email.');
      return;
    }
    if (!password) {
      setError('Please enter your password.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await authService.login({ identifier, password });

      if (res.success && res.data) {
        login(res.data.accessToken, res.data.refreshToken, res.data.user);
        if (res.data.user.role === 'ADMIN') {
          navigate('/admin/dashboard');
        } else if (res.data.user.role === 'MENTOR') {
          navigate('/mentor');
        } else {
          navigate('/student/dashboard');
        }
      } else {
        if (res.code === 'ACCOUNT_PENDING_APPROVAL') {
          setPendingNotice(res.message || 'Your registration has been submitted. Please wait for administrator approval.');
        } else {
          setError(res.message || 'Authentication failed. Please verify your credentials.');
        }
      }
    } catch {
      setError('Network error connecting to the server. Please check your connection.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDemoFill = (role: 'admin' | 'mentor' | 'pending_student') => {
    setError(null);
    setPendingNotice(null);
    if (role === 'admin') {
      setIdentifier('admin@institute.edu');
      setPassword('Admin@123');
    } else if (role === 'mentor') {
      setIdentifier('mentor@institute.edu');
      setPassword('Mentor@123');
    } else {
      setIdentifier('+919876543210');
      setPassword('Student@123');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-brand-700 to-brand-500 flex items-center justify-center text-white shadow-lg shadow-brand-500/25">
            <GraduationCap className="w-8 h-8" />
          </div>
        </div>
        <h2 className="mt-4 text-center text-3xl font-extrabold text-slate-900 tracking-tight">
          Apex Institute LMS
        </h2>
        <p className="mt-1 text-center text-sm text-slate-600">
          Sign in to your learning portal or administrative console
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow-xl shadow-slate-200/50 sm:rounded-2xl sm:px-10 border border-slate-100">
          {/* Quick Demo Fill Pills */}
          <div className="mb-6 p-3 bg-slate-50 rounded-xl border border-slate-200/80">
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 flex items-center">
              <ShieldCheck className="w-3.5 h-3.5 mr-1 text-brand-600" />
              Quick Demo Fill
            </div>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => handleDemoFill('admin')}
                className="px-2 py-1.5 text-xs font-medium bg-white text-slate-700 hover:text-brand-700 hover:bg-brand-50 rounded-lg border border-slate-200 transition-colors text-center"
              >
                Admin
              </button>
              <button
                type="button"
                onClick={() => handleDemoFill('mentor')}
                className="px-2 py-1.5 text-xs font-medium bg-purple-50 text-purple-700 hover:text-purple-900 hover:bg-purple-100 rounded-lg border border-purple-200 transition-colors text-center font-semibold"
              >
                Mentor Demo
              </button>
              <button
                type="button"
                onClick={() => handleDemoFill('pending_student')}
                className="px-2 py-1.5 text-xs font-medium bg-white text-slate-700 hover:text-amber-700 hover:bg-amber-50 rounded-lg border border-slate-200 transition-colors text-center"
              >
                Pending Student
              </button>
            </div>
          </div>

          {/* Pending Approval Alert (Section 4 & 5 Requirement) */}
          {pendingNotice && (
            <div className="mb-6 p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900">
              <div className="flex items-start">
                <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5 mr-2.5 flex-shrink-0" />
                <div className="text-sm">
                  <p className="font-semibold text-amber-800">Account Pending Approval</p>
                  <p className="mt-1 text-amber-700">{pendingNotice}</p>
                  <div className="mt-3">
                    <Link
                      to="/pending-approval"
                      className="inline-flex items-center text-xs font-semibold text-amber-800 hover:text-amber-900 underline underline-offset-2"
                    >
                      View Approval Status Details &rarr;
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* General Error Alert */}
          {error && (
            <div className="mb-6 p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-900 flex items-start">
              <AlertCircle className="w-5 h-5 text-rose-600 mt-0.5 mr-2.5 flex-shrink-0" />
              <div className="text-sm">
                <p className="font-medium">{error}</p>
              </div>
            </div>
          )}

          <form className="space-y-5" onSubmit={handleSubmit}>
            <div>
              <label className="block text-sm font-semibold text-slate-700">
                Phone Number or Email
              </label>
              <div className="mt-1.5 relative rounded-lg shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Phone className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="e.g. +919876543210 or admin@institute.edu"
                  required
                  className="block w-full pl-10 pr-3 py-2.5 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 bg-white"
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center">
                <label className="block text-sm font-semibold text-slate-700">Password</label>
              </div>
              <div className="mt-1.5 relative rounded-lg shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="block w-full pl-10 pr-3 py-2.5 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 bg-white"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full flex justify-center items-center py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-semibold text-white bg-brand-600 hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-500 disabled:opacity-50 transition-colors"
            >
              {isSubmitting ? 'Signing in...' : 'Sign In'}
              <ArrowRight className="w-4 h-4 ml-2" />
            </button>
          </form>

          <div className="mt-6 border-t border-slate-200 pt-6 text-center">
            <p className="text-sm text-slate-600">
              New student?{' '}
              <Link to="/register" className="font-semibold text-brand-600 hover:text-brand-700">
                Register here
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
