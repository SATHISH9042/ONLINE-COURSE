import React, { useState, useRef, useEffect } from 'react';
import { NavLink, Outlet, useNavigate, useLocation, Link } from 'react-router-dom';
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
  ChevronLeft,
  ChevronRight,
  Menu,
  X,
  Sparkles,
  PlayCircle,
  Award,
  Radio,
  Search,
} from 'lucide-react';
import { StatusBadge } from '../components/common/Badge';
import { notificationService } from '../services/notificationService';
import { UniversalSearchBar } from '../components/common/UniversalSearchBar';

export const StudentLayout: React.FC = () => {
  const { user, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
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

  // Section 6: Sidebar Primary Navigation items
  const navItems = [
    { label: 'Home', path: '/student/home', icon: Home },
    { label: 'My Courses', path: '/student/my-courses', icon: BookOpen },
    { label: 'Browse Courses', path: '/student/browse', icon: Compass },
    { label: 'Live Classes', path: '/student/live-classes', icon: Video },
    {
      label: 'Notifications',
      path: '/student/notifications',
      icon: Bell,
      badge: unreadCount > 0 ? unreadCount : undefined,
    },
  ];

  // Quick Action navigation shortcuts on the left sidebar
  const quickActions = [
    {
      label: 'Resume Learning',
      path: '/student/my-courses',
      icon: PlayCircle,
      desc: 'Continue active lessons',
      color: 'text-brand-600 bg-brand-50 hover:bg-brand-100 border-brand-200',
    },
    {
      label: 'Explore Catalog',
      path: '/student/browse',
      icon: Compass,
      desc: 'Browse new bootcamps',
      color: 'text-purple-600 bg-purple-50 hover:bg-purple-100 border-purple-200',
    },
    {
      label: 'Live Masterclasses',
      path: '/student/live-classes',
      icon: Radio,
      desc: 'Join upcoming webinar',
      color: 'text-rose-600 bg-rose-50 hover:bg-rose-100 border-rose-200',
    },
    {
      label: 'My Profile',
      path: '/student/profile',
      icon: UserIcon,
      desc: 'Account & certificates',
      color: 'text-emerald-600 bg-emerald-50 hover:bg-emerald-100 border-emerald-200',
    },
    {
      label: 'Help & FAQs',
      path: '/student/help',
      icon: HelpCircle,
      desc: 'Academic assistance',
      color: 'text-sky-600 bg-sky-50 hover:bg-sky-100 border-sky-200',
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col w-full">
      {/* SECTION 6: TOP NAVIGATION WITH UNIVERSAL SEARCH BAR */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-xs h-16 flex items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Left: Mobile Menu toggle + Institute Logo & Portal Title */}
        <div className="flex items-center space-x-3 shrink-0">
          <button
            type="button"
            onClick={() => setMobileSidebarOpen(!mobileSidebarOpen)}
            className="lg:hidden p-2 text-slate-600 hover:text-slate-900 rounded-lg hover:bg-slate-100 focus:outline-none"
            aria-label="Toggle Navigation"
          >
            {mobileSidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>

          <Link to="/student/home" className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-brand-700 to-brand-500 flex items-center justify-center text-white shadow-md shadow-brand-500/25">
              <GraduationCap className="w-5 h-5" />
            </div>
            <div className="hidden sm:block">
              <span className="text-base sm:text-lg font-extrabold text-slate-900 tracking-tight block leading-tight">
                Apex Institute
              </span>
              <span className="text-[11px] font-semibold text-brand-600 uppercase tracking-wider block leading-none">
                Student Portal
              </span>
            </div>
          </Link>
        </div>

        {/* Middle: Universal Search Bar */}
        <div className="flex-1 max-w-xl mx-2 sm:mx-6">
          <UniversalSearchBar />
        </div>

        {/* Right: Notifications + Student Profile Menu */}
        <div className="flex items-center space-x-3 sm:space-x-4 shrink-0">
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
              className="flex items-center space-x-2 sm:space-x-3 p-1.5 rounded-xl hover:bg-slate-100 transition-colors focus:outline-none"
            >
              <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-gradient-to-tr from-brand-600 to-indigo-600 text-white font-bold text-xs sm:text-sm flex items-center justify-center shadow-xs">
                {user?.fullName ? user.fullName.charAt(0).toUpperCase() : 'S'}
              </div>
              <div className="text-left hidden md:block">
                <span className="text-xs sm:text-sm font-semibold text-slate-900 block leading-tight">
                  {user?.fullName}
                </span>
                <span className="text-[11px] text-slate-500 block leading-tight">
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
                  <NavLink
                    to="/student/profile"
                    onClick={() => setMenuOpen(false)}
                    className="flex items-center px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 hover:text-brand-600"
                  >
                    <UserIcon className="w-4 h-4 mr-3 text-slate-400" />
                    Edit Profile
                  </NavLink>

                  <NavLink
                    to="/student/help"
                    onClick={() => setMenuOpen(false)}
                    className="flex items-center px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 hover:text-brand-600"
                  >
                    <HelpCircle className="w-4 h-4 mr-3 text-slate-400" />
                    Help & FAQs
                  </NavLink>
                </div>

                <div className="border-t border-slate-100 pt-1">
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center px-4 py-2 text-sm text-rose-600 hover:bg-rose-50"
                  >
                    <LogOut className="w-4 h-4 mr-3 text-rose-500" />
                    Sign Out
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* BODY WITH LEFT SIDEBAR + FULL SCREEN MAIN CONTENT AREA */}
      <div className="flex-1 flex w-full">
        {/* DESKTOP LEFT SIDEBAR */}
        <aside
          className={`hidden lg:flex flex-col border-r border-slate-200/80 bg-white shrink-0 transition-all duration-300 ${
            sidebarCollapsed ? 'w-20' : 'w-72'
          }`}
        >
          {/* Collapse Toggle Header */}
          <div className="px-4 py-2.5 flex items-center justify-between border-b border-slate-100">
            {!sidebarCollapsed && (
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Navigation
              </span>
            )}
            <button
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 ml-auto transition-colors"
              title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {sidebarCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-6">
            {/* 1. Primary Navigation Items */}
            <div className="space-y-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    title={sidebarCollapsed ? item.label : undefined}
                    className={({ isActive }) =>
                      `flex items-center px-3 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all ${
                        isActive
                          ? 'bg-brand-50 text-brand-700 shadow-2xs border border-brand-200/60'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80'
                      } ${sidebarCollapsed ? 'justify-center' : ''}`
                    }
                  >
                    <Icon className={`w-4 h-4 shrink-0 ${sidebarCollapsed ? '' : 'mr-3'}`} />
                    {!sidebarCollapsed && <span className="truncate">{item.label}</span>}
                    {!sidebarCollapsed && item.badge !== undefined && (
                      <span className="ml-auto px-2 py-0.5 rounded-full text-[10px] font-black bg-red-100 text-red-700">
                        {item.badge}
                      </span>
                    )}
                  </NavLink>
                );
              })}
            </div>

            {/* 2. DEDICATED QUICK SECTIONS / QUICK ACTIONS IN SIDEBAR */}
            <div className="pt-2 border-t border-slate-100">
              {!sidebarCollapsed ? (
                <div className="space-y-2">
                  <div className="flex items-center justify-between px-1">
                    <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 flex items-center">
                      <Sparkles className="w-3 h-3 mr-1.5 text-amber-500" />
                      Quick Sections
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
              className={`w-full flex items-center px-3 py-2 rounded-xl text-xs font-bold text-rose-600 hover:bg-rose-50 transition-colors ${
                sidebarCollapsed ? 'justify-center' : ''
              }`}
              title="Sign Out"
            >
              <LogOut className={`w-4 h-4 shrink-0 ${sidebarCollapsed ? '' : 'mr-2.5'}`} />
              {!sidebarCollapsed && <span>Sign Out</span>}
            </button>
          </div>
        </aside>

        {/* MOBILE SLIDE-OVER SIDEBAR */}
        {mobileSidebarOpen && (
          <div className="fixed inset-0 z-50 lg:hidden flex">
            <div
              className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs"
              onClick={() => setMobileSidebarOpen(false)}
            />
            <div className="relative w-72 max-w-xs bg-white h-full p-5 shadow-2xl flex flex-col z-10">
              <div className="flex justify-between items-center pb-4 mb-4 border-b border-slate-200">
                <div className="flex items-center space-x-2">
                  <GraduationCap className="w-5 h-5 text-brand-600" />
                  <span className="font-extrabold text-slate-900 text-sm">Student Navigation</span>
                </div>
                <button
                  onClick={() => setMobileSidebarOpen(false)}
                  className="p-1 rounded-lg text-slate-500 hover:bg-slate-100"
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
                        onClick={() => setMobileSidebarOpen(false)}
                        className={({ isActive }) =>
                          `flex items-center px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                            isActive
                              ? 'bg-brand-50 text-brand-700'
                              : 'text-slate-600 hover:bg-slate-100'
                          }`
                        }
                      >
                        <Icon className="w-4 h-4 mr-3 shrink-0" />
                        <span>{item.label}</span>
                        {item.badge !== undefined && (
                          <span className="ml-auto px-2 py-0.5 rounded-full text-[10px] font-black bg-red-100 text-red-700">
                            {item.badge}
                          </span>
                        )}
                      </NavLink>
                    );
                  })}
                </div>

                <div className="pt-3 border-t border-slate-200">
                  <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 block mb-2 px-1">
                    Quick Sections
                  </span>
                  <div className="space-y-1.5">
                    {quickActions.map((action) => {
                      const Icon = action.icon;
                      return (
                        <Link
                          key={action.label}
                          to={action.path}
                          onClick={() => setMobileSidebarOpen(false)}
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
