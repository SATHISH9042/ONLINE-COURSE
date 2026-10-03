import React, { useState } from 'react';
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  LayoutDashboard,
  Users,
  LogOut,
  Menu,
  X,
  Award,
  ChevronRight,
  Sparkles,
  BookOpen,
  Calendar,
  Radio,
} from 'lucide-react';

export const MentorLayout: React.FC = () => {
  const { user, logout } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const navItems = [
    { label: 'Dashboard', path: '/mentor', icon: LayoutDashboard, exact: true },
    { label: 'Assigned Students', path: '/mentor/students', icon: Users, exact: false },
  ];

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col md:flex-row font-sans antialiased">
      {/* Mobile Top Header */}
      <div className="md:hidden flex items-center justify-between px-4 py-3 bg-slate-800 border-b border-slate-700/80">
        <div className="flex items-center space-x-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-purple-600 to-indigo-500 flex items-center justify-center shadow-lg shadow-purple-500/20">
            <Award className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-white tracking-tight">Apex Institute</h1>
            <span className="text-[10px] font-semibold uppercase tracking-wider text-purple-400 bg-purple-950/80 px-1.5 py-0.5 rounded border border-purple-800/60">
              Mentor Portal
            </span>
          </div>
        </div>
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="p-2 rounded-lg bg-slate-700/60 text-slate-300 hover:text-white hover:bg-slate-700"
          aria-label="Toggle navigation menu"
        >
          {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Sidebar Navigation */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-64 bg-slate-800/95 backdrop-blur-xl border-r border-slate-700/80 flex flex-col transition-transform duration-300 md:translate-x-0 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        } md:static md:w-72 md:shrink-0`}
      >
        {/* Sidebar Brand Header */}
        <div className="p-5 border-b border-slate-700/60 hidden md:flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-purple-600 via-indigo-600 to-blue-500 flex items-center justify-center shadow-lg shadow-purple-500/25">
            <Award className="w-6 h-6 text-white" />
          </div>
          <div>
            <div className="flex items-center space-x-1.5">
              <h1 className="text-base font-bold text-white tracking-tight">Apex Institute</h1>
              <span className="px-1.5 py-0.5 text-[10px] font-bold uppercase rounded bg-purple-500/20 text-purple-300 border border-purple-500/30">
                Mentor
              </span>
            </div>
            <p className="text-xs text-slate-400 truncate max-w-[170px]">
              {user?.specialization || 'Academic Faculty'}
            </p>
          </div>
        </div>

        {/* Mentor Profile Overview Badge */}
        <div className="p-4 mx-3 my-3 rounded-xl bg-gradient-to-br from-purple-900/40 via-indigo-900/20 to-slate-800/80 border border-purple-500/20">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-purple-500 to-indigo-500 text-white flex items-center justify-center font-bold text-sm shadow-md shadow-purple-500/30">
              {user?.fullName?.charAt(0).toUpperCase() || 'M'}
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="text-sm font-semibold text-white truncate">{user?.fullName || 'Mentor'}</h3>
              <p className="text-xs text-slate-400 truncate">{user?.email || user?.phone}</p>
            </div>
          </div>
          {user?.specialization && (
            <div className="mt-2.5 pt-2.5 border-t border-purple-500/20 flex items-center space-x-1 text-[11px] text-purple-300">
              <Sparkles className="w-3.5 h-3.5 text-purple-400 shrink-0" />
              <span className="truncate">{user.specialization}</span>
            </div>
          )}
        </div>

        {/* Navigation Links */}
        <div className="px-3 py-2 flex-1 space-y-1">
          <div className="px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Mentor Workspace
          </div>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = item.exact
              ? location.pathname === item.path
              : location.pathname.startsWith(item.path);

            return (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={() => setMobileOpen(false)}
                className={`flex items-center justify-between px-3.5 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md shadow-purple-600/20 font-semibold'
                    : 'text-slate-300 hover:text-white hover:bg-slate-700/60'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                  <span>{item.label}</span>
                </div>
                {isActive && <ChevronRight className="w-4 h-4 text-purple-200" />}
              </NavLink>
            );
          })}
        </div>

        {/* Quick Help or Policy Notice */}
        <div className="px-4 py-3 mx-3 mb-3 bg-slate-900/60 rounded-xl border border-slate-700/60 text-xs text-slate-400">
          <p className="font-medium text-slate-300 flex items-center space-x-1.5 mb-1">
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>Scoped Access Only</span>
          </p>
          <p className="text-[11px] leading-relaxed text-slate-400">
            You have access to audit records, login days, and live attendance for your assigned students only.
          </p>
        </div>

        {/* Logout Section */}
        <div className="p-3 border-t border-slate-700/60">
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium text-rose-400 hover:bg-rose-950/30 hover:text-rose-300 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 min-w-0 flex flex-col min-h-screen bg-slate-900">
        <Outlet />
      </main>

      {/* Mobile Backdrop */}
      {mobileOpen && (
        <div
          onClick={() => setMobileOpen(false)}
          className="fixed inset-0 z-30 bg-black/60 backdrop-blur-sm md:hidden"
        />
      )}
    </div>
  );
};
