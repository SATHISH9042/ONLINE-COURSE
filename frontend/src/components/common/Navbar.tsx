import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { GraduationCap, LogOut, User as UserIcon, Shield, Users, Clock, BookOpen } from 'lucide-react';
import { StatusBadge } from './Badge';

export const Navbar: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          {/* Brand Logo & Name */}
          <div className="flex items-center space-x-3">
            <Link to="/" className="flex items-center space-x-3 group">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-brand-700 to-brand-500 flex items-center justify-center text-white shadow-md shadow-brand-500/20 group-hover:scale-105 transition-transform">
                <GraduationCap className="w-6 h-6" />
              </div>
              <div>
                <span className="text-xl font-bold text-slate-900 tracking-tight block leading-tight">
                  Apex Institute
                </span>
                <span className="text-xs font-medium text-slate-500 block leading-none">
                  Learning Management Platform
                </span>
              </div>
            </Link>
          </div>

          {/* Navigation Links based on role */}
          {user && (
            <nav className="hidden md:flex items-center space-x-1">
              {user.role === 'ADMIN' ? (
                <>
                  <Link
                    to="/admin/courses"
                    className="flex items-center space-x-1.5 px-3 py-2 rounded-lg text-sm font-medium text-slate-700 hover:text-brand-600 hover:bg-slate-50"
                  >
                    <BookOpen className="w-4 h-4 text-brand-600" />
                    <span>Courses</span>
                  </Link>
                  <Link
                    to="/admin/pending-students"
                    className="flex items-center space-x-1.5 px-3 py-2 rounded-lg text-sm font-medium text-slate-700 hover:text-brand-600 hover:bg-slate-50"
                  >
                    <Clock className="w-4 h-4 text-amber-500" />
                    <span>Pending Approvals</span>
                  </Link>
                  <Link
                    to="/admin/students"
                    className="flex items-center space-x-1.5 px-3 py-2 rounded-lg text-sm font-medium text-slate-700 hover:text-brand-600 hover:bg-slate-50"
                  >
                    <Users className="w-4 h-4 text-slate-500" />
                    <span>All Students</span>
                  </Link>
                </>
              ) : (
                <>
                  <Link
                    to="/student/dashboard"
                    className="px-3 py-2 rounded-lg text-sm font-medium text-slate-700 hover:text-brand-600 hover:bg-slate-50"
                  >
                    Dashboard
                  </Link>
                </>
              )}
            </nav>
          )}

          {/* User Profile & Actions */}
          <div className="flex items-center space-x-4">
            {user ? (
              <div className="flex items-center space-x-3">
                <div className="text-right hidden sm:block">
                  <div className="flex items-center justify-end space-x-2">
                    <span className="text-sm font-semibold text-slate-900">{user.fullName}</span>
                    {user.role === 'ADMIN' ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-indigo-100 text-indigo-800">
                        <Shield className="w-3 h-3 mr-1" />
                        Admin
                      </span>
                    ) : (
                      <StatusBadge status={user.status} />
                    )}
                  </div>
                  <span className="text-xs text-slate-500 block">{user.phone}</span>
                </div>

                <div className="w-9 h-9 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-600 font-semibold text-sm">
                  {user.fullName.charAt(0).toUpperCase()}
                </div>

                <button
                  onClick={handleLogout}
                  title="Sign out"
                  className="p-2 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                >
                  <LogOut className="w-5 h-5" />
                </button>
              </div>
            ) : (
              <div className="flex items-center space-x-3">
                <Link
                  to="/login"
                  className="text-sm font-semibold text-slate-700 hover:text-brand-600 px-3 py-2"
                >
                  Sign In
                </Link>
                <Link
                  to="/register"
                  className="text-sm font-semibold text-white bg-brand-600 hover:bg-brand-700 px-4 py-2 rounded-lg shadow-sm shadow-brand-600/20 transition-colors"
                >
                  Register
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
