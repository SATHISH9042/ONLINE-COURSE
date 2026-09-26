import React, { useState, useRef, useEffect } from 'react';
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  GraduationCap,
  Home,
  BookOpen,
  Compass,
  Video,
  Bell,
  User as UserIcon,
  HelpCircle,
  LogOut,
  ChevronDown,
  Menu,
  X,
  Sparkles,
} from 'lucide-react';
import { StatusBadge } from '../components/common/Badge';
import { notificationService } from '../services/notificationService';

export const StudentLayout: React.FC = () => {
  const { user, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const location = useLocation();

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch unread notifications count on route change
  useEffect(() => {
    notificationService.getUnreadCount().then(setUnreadCount).catch(() => {});
  }, [location.pathname]);

  // Close mobile sidebar on route change
  useEffect(() => {
    setMobileSidebarOpen(false);
  }, [location.pathname]);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  // Section 6: Sidebar Navigation items
  const navItems = [
    { label: 'Home', path: '/student/home', icon: Home },
    { label: 'My Courses', path: '/student/my-courses', icon: BookOpen },
    { label: 'Browse Courses', path: '/student/browse', icon: Compass },
    { label: 'Live Classes', path: '/student/live-classes', icon: Video },
    { label: 'Notifications', path: '/student/notifications', icon: Bell, badge: unreadCount > 0 ? unreadCount : undefined },
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* SECTION 6: TOP NAVIGATION */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-xs">
        <div className="px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            {/* Left: Mobile Menu button + Institute logo + Institute name */}
            <div className="flex items-center space-x-3">
              <button
                type="button"
                onClick={() => setMobileSidebarOpen(!mobileSidebarOpen)}
                className="lg:hidden p-2 text-slate-600 hover:text-slate-900 rounded-lg hover:bg-slate-100"
              >
                {mobileSidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>

              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-brand-700 to-brand-500 flex items-center justify-center text-white shadow-md shadow-brand-500/25">
                  <GraduationCap className="w-6 h-6" />
                </div>
                <div>
                  <span className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight block leading-tight">
                    Apex Institute
                  </span>
                  <span className="text-xs font-medium text-slate-500 block leading-none">
                    Student Portal
                  </span>
                </div>
              </div>
            </div>

            {/* Right: Notifications + Student Profile Picture + Profile Menu */}
            <div className="flex items-center space-x-4">
              <NavLink
                to="/student/notifications"
                className="relative p-2 text-slate-500 hover:text-brand-600 hover:bg-slate-100 rounded-xl transition-colors"
                title="Notifications"
              >
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 min-w-[18px] h-[18px] px-1 rounded-full bg-red-600 text-white text-[10px] font-black flex items-center justify-center ring-2 ring-white">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </NavLink>

              {/* Profile Menu Dropdown */}
              <div className="relative" ref={dropdownRef}>
                <button
                  type="button"
                  onClick={() => setMenuOpen(!menuOpen)}
                  className="flex items-center space-x-3 p-1.5 rounded-xl hover:bg-slate-100 transition-colors focus:outline-none"
                >
                  <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-brand-600 to-indigo-600 text-white font-bold text-sm flex items-center justify-center shadow-xs">
                    {user?.fullName ? user.fullName.charAt(0).toUpperCase() : 'S'}
                  </div>
                  <div className="text-left hidden md:block">
                    <span className="text-sm font-semibold text-slate-900 block leading-tight">
                      {user?.fullName}
                    </span>
                    <span className="text-xs text-slate-500 block leading-tight">
                      {user?.phone}
                    </span>
                  </div>
                  <ChevronDown className="w-4 h-4 text-slate-400 hidden md:block" />
                </button>

                {/* Profile menu dropdown panel */}
                {menuOpen && (
                  <div className="absolute right-0 mt-2 w-56 rounded-2xl bg-white shadow-xl shadow-slate-200/60 border border-slate-100 py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                    <div className="px-4 py-3 border-b border-slate-100">
                      <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Signed in as</p>
                      <p className="text-sm font-bold text-slate-900 truncate">{user?.fullName}</p>
                      <div className="mt-1">
                        <StatusBadge status={user?.status || 'ACTIVE'} />
                      </div>
                    </div>

                    <div className="py-1">
                      {/* Section 6 Profile Menu: Edit Profile */}
                      <NavLink
                        to="/student/profile"
                        onClick={() => setMenuOpen(false)}
                        className="flex items-center px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 hover:text-brand-600"
                      >
                        <UserIcon className="w-4 h-4 mr-3 text-slate-400" />
                        Edit Profile
                      </NavLink>

                      {/* Section 6 Profile Menu: Help */}
                      <NavLink
                        to="/student/help"
                        onClick={() => setMenuOpen(false)}
                        className="flex items-center px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 hover:text-brand-600"
                      >
                        <HelpCircle className="w-4 h-4 mr-3 text-slate-400" />
                        Help & FAQs
                      </NavLink>
                    </div>

                    <div className="border-t border-slate-100 pt-1">
                      {/* Section 6 Profile Menu: Logout */}
                      <button
                        onClick={handleLogout}
                        className="w-full flex items-center px-4 py-2.5 text-sm text-rose-600 hover:bg-rose-50"
                      >
                        <LogOut className="w-4 h-4 mr-3 text-rose-500" />
                        Sign Out
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* BODY WITH LEFT SIDEBAR + MAIN CONTENT AREA */}
      <div className="flex-1 flex max-w-7xl w-full mx-auto">
        {/* SECTION 6: LEFT SIDEBAR (Desktop) */}
        <aside className="hidden lg:block w-64 border-r border-slate-200/80 bg-white p-4 shrink-0">
          <div className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className={({ isActive }) =>
                    `flex items-center px-3.5 py-3 rounded-xl text-sm font-semibold transition-all ${isActive
                      ? 'bg-brand-50 text-brand-700 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                    }`
                  }
                >
                  <Icon className="w-5 h-5 mr-3 shrink-0" />
                  <span>{item.label}</span>
                  {item.badge !== undefined && (
                    <span className="ml-auto px-2 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-700">
                      {item.badge}
                    </span>
                  )}
                </NavLink>
              );
            })}
          </div>

          {/* Quick Help Callout Box in Sidebar */}
          <div className="mt-10 p-4 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-800 text-white shadow-md">
            <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center mb-3">
              <Sparkles className="w-4 h-4 text-amber-300" />
            </div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300">Need Guidance?</h4>
            <p className="text-xs text-slate-400 mt-1 leading-relaxed">
              Explore FAQs or contact your academic instructor anytime.
            </p>
            <NavLink
              to="/student/help"
              className="inline-block mt-3 text-xs font-semibold text-brand-300 hover:text-brand-200 underline underline-offset-2"
            >
              Visit Help Center &rarr;
            </NavLink>
          </div>
        </aside>

        {/* Mobile Slide-Over Sidebar */}
        {mobileSidebarOpen && (
          <div className="fixed inset-0 z-50 lg:hidden flex">
            <div
              className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs"
              onClick={() => setMobileSidebarOpen(false)}
            />
            <div className="relative w-72 max-w-xs bg-white h-full p-6 shadow-2xl flex flex-col z-10">
              <div className="flex justify-between items-center pb-4 mb-4 border-b border-slate-200">
                <span className="font-bold text-slate-900">Platform Menu</span>
                <button
                  onClick={() => setMobileSidebarOpen(false)}
                  className="p-1 rounded-lg text-slate-500 hover:bg-slate-100"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="space-y-1">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <NavLink
                      key={item.path}
                      to={item.path}
                      onClick={() => setMobileSidebarOpen(false)}
                      className={({ isActive }) =>
                        `flex items-center px-4 py-3 rounded-xl text-sm font-semibold transition-all ${isActive
                          ? 'bg-brand-50 text-brand-700'
                          : 'text-slate-600 hover:bg-slate-50'
                        }`
                      }
                    >
                      <Icon className="w-5 h-5 mr-3 shrink-0" />
                      <span>{item.label}</span>
                      {item.badge !== undefined && (
                        <span className="ml-auto px-2 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-700">
                          {item.badge}
                        </span>
                      )}
                    </NavLink>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* MAIN CONTENT AREA */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 min-w-0">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
