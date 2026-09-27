import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  BookOpen,
  Video,
  HelpCircle,
  User,
  Compass,
  ArrowRight,
  X,
  Sparkles,
  Command,
} from 'lucide-react';
import { paymentService, CatalogCourseItem } from '../../services/paymentService';

interface QuickLinkItem {
  id: string;
  title: string;
  subtitle: string;
  category: 'NAVIGATION' | 'COURSE' | 'LIVE_CLASS' | 'HELP';
  url: string;
  badge?: string;
  badgeColor?: string;
}

export const UniversalSearchBar: React.FC = () => {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [courses, setCourses] = useState<CatalogCourseItem[]>([]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  // Load course catalog for instant search indexing
  useEffect(() => {
    paymentService.getCatalog()
      .then((res) => {
        if (res.success && res.data) {
          setCourses(res.data);
        }
      })
      .catch(() => { });
  }, []);

  // Global keyboard shortcut: Cmd+K or Ctrl+K to focus search bar
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
        setIsOpen(true);
      } else if (e.key === 'Escape') {
        setIsOpen(false);
        inputRef.current?.blur();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Static platform navigational shortcuts
  const navigationShortcuts: QuickLinkItem[] = [
    {
      id: 'nav-my-courses',
      title: 'My Enrolled Courses',
      subtitle: 'Continue your active learning tracks and lessons',
      category: 'NAVIGATION',
      url: '/student/my-courses',
    },
    {
      id: 'nav-browse',
      title: 'Course Catalog & Enrollments',
      subtitle: 'Browse all available institute engineering programs',
      category: 'NAVIGATION',
      url: '/student/browse',
    },
    {
      id: 'nav-live-classes',
      title: 'Live Webinars & Masterclasses',
      subtitle: 'Join upcoming interactive live coding sessions',
      category: 'NAVIGATION',
      url: '/student/live-classes',
    },
    {
      id: 'nav-profile',
      title: 'Student Profile & Settings',
      subtitle: 'Manage your contact details and security credentials',
      category: 'NAVIGATION',
      url: '/student/profile',
    },
    {
      id: 'nav-help',
      title: 'Help Center & Academic FAQs',
      subtitle: 'Get answers to course access, sandbox, and payments',
      category: 'HELP',
      url: '/student/help',
    },
  ];

  // Dynamic filter matching
  const trimmed = query.trim().toLowerCase();

  const matchingCourses: QuickLinkItem[] = courses
    .filter((c) =>
      c.title.toLowerCase().includes(trimmed) ||
      c.instructorName?.toLowerCase().includes(trimmed) ||
      c.shortDescription?.toLowerCase().includes(trimmed)
    )
    .slice(0, 4)
    .map((c) => ({
      id: `course-${c.id}`,
      title: c.title,
      subtitle: `${c.instructorName || 'Institute Faculty'} • ${c.durationHours || 40}h Track`,
      category: 'COURSE',
      url: `/student/browse?q=${encodeURIComponent(c.title)}`,
      badge: c.price === 0 ? 'FREE' : `₹${c.price.toLocaleString('en-IN')}`,
      badgeColor: c.price === 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-brand-100 text-brand-800',
    }));

  const matchingNavigation = navigationShortcuts.filter((n) =>
    n.title.toLowerCase().includes(trimmed) ||
    n.subtitle.toLowerCase().includes(trimmed)
  );

  const handleSelect = (url: string) => {
    setIsOpen(false);
    setQuery('');
    navigate(url);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      if (matchingCourses.length > 0) {
        handleSelect(matchingCourses[0].url);
      } else if (trimmed) {
        handleSelect(`/student/browse?q=${encodeURIComponent(query)}`);
      }
    }
  };

  return (
    <div className="relative w-full max-w-xl mx-auto md:mx-6">
      {/* Search Input Box */}
      <div className="relative flex items-center">
        <Search className="w-4 h-4 text-slate-400 absolute left-3.5 pointer-events-none" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder="Search courses, live classes, topics, help... (⌘K)"
          className="w-full pl-10 pr-20 py-2 text-xs sm:text-sm bg-slate-100/80 hover:bg-slate-100 focus:bg-white border border-slate-200 focus:border-brand-500 rounded-2xl shadow-2xs focus:outline-none focus:ring-2 focus:ring-brand-500/20 text-slate-900 placeholder:text-slate-400 transition-all"
        />

        <div className="absolute right-3 flex items-center space-x-1.5">
          {query ? (
            <button
              type="button"
              onClick={() => {
                setQuery('');
                inputRef.current?.focus();
              }}
              className="p-1 text-slate-400 hover:text-slate-600 rounded-md"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          ) : (
            <span className="hidden sm:inline-flex items-center space-x-0.5 px-2 py-0.5 rounded-lg bg-slate-200/70 border border-slate-300/60 text-[10px] font-mono font-bold text-slate-600">
              <Command className="w-3 h-3 mr-0.5" />
              <span>K</span>
            </span>
          )}
        </div>
      </div>

      {/* Floating Search Results Dropdown */}
      {isOpen && (
        <div
          ref={dropdownRef}
          className="absolute left-0 right-0 mt-2 bg-white rounded-2xl shadow-2xl border border-slate-200/90 py-3 z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150 max-h-[460px] overflow-y-auto"
        >
          {trimmed ? (
            <div className="space-y-3">
              {/* Matching Courses */}
              {matchingCourses.length > 0 && (
                <div>
                  <div className="px-4 py-1 flex items-center justify-between text-[11px] font-extrabold uppercase tracking-wider text-slate-400">
                    <span className="flex items-center gap-1.5">
                      <BookOpen className="w-3.5 h-3.5 text-brand-600" />
                      Courses ({matchingCourses.length})
                    </span>
                    <button
                      onClick={() => handleSelect(`/student/browse?q=${encodeURIComponent(query)}`)}
                      className="text-brand-600 hover:underline normal-case text-xs font-semibold"
                    >
                      View all in catalog &rarr;
                    </button>
                  </div>
                  <div className="mt-1 divide-y divide-slate-100">
                    {matchingCourses.map((c) => (
                      <button
                        key={c.id}
                        onClick={() => handleSelect(c.url)}
                        className="w-full px-4 py-2.5 flex items-center justify-between hover:bg-slate-50 transition text-left group"
                      >
                        <div className="space-y-0.5 truncate pr-2">
                          <p className="text-xs sm:text-sm font-bold text-slate-900 group-hover:text-brand-600 transition-colors truncate">
                            {c.title}
                          </p>
                          <p className="text-[11px] text-slate-500 truncate">{c.subtitle}</p>
                        </div>
                        {c.badge && (
                          <span
                            className={`shrink-0 px-2 py-0.5 rounded-full text-[10px] font-black ${c.badgeColor || 'bg-slate-100 text-slate-700'
                              }`}
                          >
                            {c.badge}
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Matching Navigation Shortcuts */}
              {matchingNavigation.length > 0 && (
                <div>
                  <div className="px-4 py-1 text-[11px] font-extrabold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                    <Compass className="w-3.5 h-3.5 text-purple-600" />
                    Quick Navigation
                  </div>
                  <div className="mt-1 divide-y divide-slate-100">
                    {matchingNavigation.map((item) => (
                      <button
                        key={item.id}
                        onClick={() => handleSelect(item.url)}
                        className="w-full px-4 py-2 flex items-center justify-between hover:bg-slate-50 transition text-left group"
                      >
                        <div>
                          <p className="text-xs font-bold text-slate-900 group-hover:text-brand-600 transition-colors">
                            {item.title}
                          </p>
                          <p className="text-[10px] text-slate-500">{item.subtitle}</p>
                        </div>
                        <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-brand-600 transition" />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Zero Match Fallback */}
              {matchingCourses.length === 0 && matchingNavigation.length === 0 && (
                <div className="px-6 py-8 text-center">
                  <Search className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  <p className="text-sm font-bold text-slate-800">No results found for "{query}"</p>
                  <p className="text-xs text-slate-500 mt-1">
                    Try searching for course names, topics, or faculty instructors.
                  </p>
                  <button
                    onClick={() => handleSelect(`/student/browse?q=${encodeURIComponent(query)}`)}
                    className="mt-3 inline-flex items-center px-3 py-1.5 rounded-xl bg-brand-50 text-brand-700 text-xs font-bold hover:bg-brand-100"
                  >
                    Search Full Course Catalog &rarr;
                  </button>
                </div>
              )}
            </div>
          ) : (
            /* Default Suggested Items when query is empty */
            <div className="space-y-3">
              <div className="px-4 py-1 text-[11px] font-extrabold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                Suggested Platform Shortcuts
              </div>
              <div className="divide-y divide-slate-100">
                {navigationShortcuts.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => handleSelect(item.url)}
                    className="w-full px-4 py-2.5 flex items-center justify-between hover:bg-slate-50 transition text-left group"
                  >
                    <div>
                      <p className="text-xs font-bold text-slate-900 group-hover:text-brand-600 transition-colors">
                        {item.title}
                      </p>
                      <p className="text-[11px] text-slate-500">{item.subtitle}</p>
                    </div>
                    <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-brand-600 group-hover:translate-x-0.5 transition-all" />
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
