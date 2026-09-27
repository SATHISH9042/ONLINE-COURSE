import React, { useState, useEffect } from 'react';
import { NavLink, Outlet, useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  LayoutDashboard,
  BookOpen,
  Clock,
  Users,
  CreditCard,
  Video,
  Bell,
  Activity,
  LogOut,
  Menu,
  X,
  ChevronLeft,
  ChevronRight,
  Shield,
  PlusCircle,
  CheckCircle,
  Radio,
  Send,
  Eye,
  Sparkles,
} from 'lucide-react';
import { adminAnalyticsService } from '../services/adminAnalyticsService';

export const AdminLayout: React.FC = () => {
  const { user, logout } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [pendingCount, setPendingCount] = useState<number>(0);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // Fetch pending approvals count to keep the sidebar badge live
    adminAnalyticsService.getOverview()
      .then((res) => {
        if (res?.metrics) {
          setPendingCount(res.metrics.pendingStudents);
        }
      })
      .catch(() => { });
  }, [location.pathname]);

  // Close mobile sidebar on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const navItems = [
    { label: 'Dashboard', path: '/admin/dashboard', icon: LayoutDashboard },
    { label: 'Course Studio', path: '/admin/courses', icon: BookOpen },
    {
      label: 'Pending Approvals',
      path: '/admin/pending-students',
      icon: Clock,
      badge: pendingCount > 0 ? pendingCount : undefined,
      badgeColor: 'bg-amber-500 text-white',
    },
    { label: 'Students Directory', path: '/admin/students', icon: Users },
    { label: 'Payments & QR', path: '/admin/payments', icon: CreditCard },
    { label: 'Live Masterclasses', path: '/admin/live-classes', icon: Video },
    { label: 'Broadcast Alerts', path: '/admin/notifications', icon: Bell },
    { label: 'System Audit Logs', path: '/admin/audit-logs', icon: Activity },
  ];

  const quickActions = [
    {
      label: 'Review Clearances',
      path: '/admin/pending-students',
      icon: CheckCircle,
      desc: 'Approve students',
      color: 'text-amber-600 bg-amber-50 hover:bg-amber-100 border-amber-200',
    },
    {
      label: 'Create Course',
      path: '/admin/courses',
      icon: PlusCircle,
      desc: 'Add new curriculum',
      color: 'text-brand-600 bg-brand-50 hover:bg-brand-100 border-brand-200',
    },
    {
      label: 'Schedule Webinar',
      path: '/admin/live-classes',
      icon: Radio,
      desc: 'Broadcast masterclass',
      color: 'text-purple-600 bg-purple-50 hover:bg-purple-100 border-purple-200',
    },
    {
      label: 'Send Broadcast',
      path: '/admin/notifications',
      icon: Send,
      desc: 'Push notification',
      color: 'text-sky-600 bg-sky-50 hover:bg-sky-100 border-sky-200',
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col w-full">
      {/* Top Header for Mobile & Quick Status */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs h-16 flex items-center justify-between px-4 sm:px-6 lg:px-8">
        <div className="flex items-center space-x-3">
          {/* Mobile menu trigger */}
          <button
            type="button"
            onClick={() => setMobileOpen(!mobileOpen)}
            className="lg:hidden p-2 text-slate-600 hover:text-slate-900 rounded-lg hover:bg-slate-100 focus:outline-none"
            aria-label="Toggle Navigation"
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>

          {/* Platform brand logo */}
          <Link to="/admin/dashboard" className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-brand-700 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-brand-500/25">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <span className="text-base sm:text-lg font-extrabold text-slate-900 tracking-tight block leading-tight">
                Apex Institute
              </span>
              <span className="text-[11px] font-semibold text-brand-600 uppercase tracking-wider block leading-none">
                Admin Console
              </span>
            </div>
          </Link>
        </div>

        {/* Right Header Status & Switcher */}
        <div className="flex items-center space-x-3 sm:space-x-4">
          {/* Real-time Cloud Telemetry Pill */}
          <div className="hidden md:flex items-center space-x-2 px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>Cloud Neon DB & API Active</span>
          </div>

          {/* View As Student Switcher */}
          <Link
            to="/student/home"
            className="inline-flex items-center px-3 py-1.5 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 shadow-2xs transition-colors"
            title="Preview student perspective"
          >
            <Eye className="w-3.5 h-3.5 mr-1.5 text-brand-600" />
            <span className="hidden sm:inline">Preview as Student</span>
          </Link>

          {/* Admin Avatar & Sign Out */}
          <div className="flex items-center space-x-2 pl-2 border-l border-slate-200">
            <div className="w-8 h-8 rounded-full bg-slate-900 text-white font-bold text-xs flex items-center justify-center shadow-xs">
              {user?.fullName?.charAt(0) || 'A'}
            </div>
            <div className="hidden lg:block text-left">
              <span className="text-xs font-bold text-slate-900 block leading-tight">
                {user?.fullName || 'Administrator'}
              </span>
              <span className="text-[10px] text-slate-400 block leading-tight">
                {user?.email || 'admin@institute.edu'}
              </span>
            </div>
            <button
              onClick={handleLogout}
              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors ml-1"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Container: Full Screen Width with Left Navigation Sidebar */}
      <div className="flex-1 flex w-full">
        {/* DESKTOP LEFT SIDEBAR */}
        <aside
          className={`hidden lg:flex flex-col border-r border-slate-200 bg-white shrink-0 transition-all duration-300 ${collapsed ? 'w-20' : 'w-72'
            }`}
        >
          {/* Collapse Toggle Bar */}
          <div className="px-4 py-2.5 flex items-center justify-between border-b border-slate-100">
            {!collapsed && (
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Navigation
              </span>
            )}
            <button
              onClick={() => setCollapsed(!collapsed)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 ml-auto transition-colors"
              title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-6">
            {/* 1. Main Navigation Items */}
            <div className="space-y-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    title={collapsed ? item.label : undefined}
                    className={({ isActive }) =>
                      `flex items-center px-3 py-2.5 rounded-xl text-xs font-bold transition-all ${isActive
                        ? 'bg-brand-50 text-brand-700 shadow-2xs border border-brand-200/60'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80'
                      } ${collapsed ? 'justify-center' : ''}`
                    }
                  >
                    <Icon className={`w-4 h-4 shrink-0 ${collapsed ? '' : 'mr-3'}`} />
                    {!collapsed && <span className="truncate">{item.label}</span>}
                    {!collapsed && item.badge !== undefined && (
                      <span
                        className={`ml-auto px-2 py-0.5 rounded-full text-[10px] font-black ${item.badgeColor || 'bg-brand-100 text-brand-700'
                          }`}
                      >
                        {item.badge}
                      </span>
                    )}
                  </NavLink>
                );
              })}
            </div>

            {/* 2. DEDICATED QUICK ACTIONS SECTION IN SIDEBAR */}
            <div className="pt-2 border-t border-slate-100">
              {!collapsed ? (
                <div className="space-y-2">
                  <div className="flex items-center justify-between px-1">
                    <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 flex items-center">
                      <Sparkles className="w-3 h-3 mr-1.5 text-amber-500" />
                      Quick Actions
                    </span>
                  </div>
                  <div className="space-y-1.5">
                    {quickActions.map((action) => {
                      const Icon = action.icon;
                      return (
                        <Link
                          key={action.label}
                          to={action.path}
                          className={`flex items-center p-2.5 rounded-xl border text-xs transition-all ${action.color}`}
                        >
                          <Icon className="w-4 h-4 mr-2.5 shrink-0" />
                          <div className="truncate text-left">
                            <span className="font-bold block leading-tight text-slate-900">
                              {action.label}
                            </span>
                            <span className="text-[10px] text-slate-500 block leading-tight">
                              {action.desc}
                            </span>
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center space-y-2 pt-2">
                  {quickActions.map((action) => {
                    const Icon = action.icon;
                    return (
                      <Link
                        key={action.label}
                        to={action.path}
                        title={action.label}
                        className={`p-2.5 rounded-xl border ${action.color}`}
                      >
                        <Icon className="w-4 h-4" />
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Sidebar Footer */}
          <div className="p-3 border-t border-slate-100">
            <button
              onClick={handleLogout}
              className={`w-full flex items-center px-3 py-2 rounded-xl text-xs font-bold text-rose-600 hover:bg-rose-50 transition-colors ${collapsed ? 'justify-center' : ''
                }`}
              title="Sign Out"
            >
              <LogOut className={`w-4 h-4 shrink-0 ${collapsed ? '' : 'mr-2.5'}`} />
              {!collapsed && <span>Sign Out</span>}
            </button>
          </div>
        </aside>

        {/* MOBILE SLIDE-OVER DRAWER */}
        {mobileOpen && (
          <div className="fixed inset-0 z-50 lg:hidden flex">
            <div
              className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs"
              onClick={() => setMobileOpen(false)}
            />
            <div className="relative w-72 max-w-xs bg-white h-full p-5 shadow-2xl flex flex-col z-10">
              <div className="flex justify-between items-center pb-4 mb-4 border-b border-slate-200">
                <div className="flex items-center space-x-2">
                  <Shield className="w-5 h-5 text-brand-600" />
                  <span className="font-extrabold text-slate-900 text-sm">Admin Navigation</span>
                </div>
                <button
                  onClick={() => setMobileOpen(false)}
                  className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto space-y-5">
                <div className="space-y-1">
                  {navItems.map((item) => {
                    const Icon = item.icon;
                    return (
                      <NavLink
                        key={item.path}
                        to={item.path}
                        onClick={() => setMobileOpen(false)}
                        className={({ isActive }) =>
                          `flex items-center px-3 py-2.5 rounded-xl text-xs font-bold transition-all ${isActive
                            ? 'bg-brand-50 text-brand-700'
                            : 'text-slate-600 hover:bg-slate-100'
                          }`
                        }
                      >
                        <Icon className="w-4 h-4 mr-3 shrink-0" />
                        <span>{item.label}</span>
                        {item.badge !== undefined && (
                          <span
                            className={`ml-auto px-2 py-0.5 rounded-full text-[10px] font-black ${item.badgeColor || 'bg-brand-100 text-brand-700'
                              }`}
                          >
                            {item.badge}
                          </span>
                        )}
                      </NavLink>
                    );
                  })}
                </div>

                <div className="pt-3 border-t border-slate-200">
                  <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 block mb-2 px-1">
                    Quick Actions
                  </span>
                  <div className="space-y-1.5">
                    {quickActions.map((action) => {
                      const Icon = action.icon;
                      return (
                        <Link
                          key={action.label}
                          to={action.path}
                          onClick={() => setMobileOpen(false)}
                          className={`flex items-center p-2.5 rounded-xl border text-xs font-bold ${action.color}`}
                        >
                          <Icon className="w-4 h-4 mr-2.5 shrink-0" />
                          <span>{action.label}</span>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-200">
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center px-3 py-2 rounded-xl text-xs font-bold text-rose-600 hover:bg-rose-50"
                >
                  <LogOut className="w-4 h-4 mr-2.5" />
                  <span>Sign Out</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* FULL SCREEN MAIN CONTENT AREA */}
        <main className="flex-1 w-full p-4 sm:p-6 lg:p-8 min-w-0 overflow-x-hidden">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
