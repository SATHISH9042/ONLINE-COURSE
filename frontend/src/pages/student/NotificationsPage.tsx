import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bell,
  CheckCircle2,
  Video,
  BookOpen,
  Megaphone,
  CreditCard,
  ShieldAlert,
  Clock,
  CheckCheck,
  Search,
  ExternalLink,
  Inbox,
  AlertCircle,
  X,
} from 'lucide-react';
import { notificationService, NotificationItem } from '../../services/notificationService';

export const NotificationsPage: React.FC = () => {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterUnreadOnly, setFilterUnreadOnly] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeModalItem, setActiveModalItem] = useState<NotificationItem | null>(null);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await notificationService.getStudentNotifications(filterUnreadOnly);
      setNotifications(data.notifications);
      setUnreadCount(data.unreadCount);
    } catch (err: any) {
      console.error('Failed to load notifications:', err);
      setError(err.message || 'Failed to load notifications.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, [filterUnreadOnly]);

  const handleMarkAsRead = async (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    try {
      await notificationService.markAsRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: true, readAt: new Date().toISOString() } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (err: any) {
      console.error('Failed to mark read:', err);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await notificationService.markAllAsRead();
      setNotifications((prev) =>
        prev.map((n) => ({ ...n, isRead: true, readAt: new Date().toISOString() }))
      );
      setUnreadCount(0);
    } catch (err: any) {
      console.error('Failed to mark all read:', err);
    }
  };

  const handleNotificationClick = (item: NotificationItem) => {
    if (!item.isRead) {
      handleMarkAsRead(item.id);
    }
    setActiveModalItem(item);
  };

  const formatTime = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      const now = new Date();
      const diffMs = now.getTime() - d.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMins / 60);
      const diffDays = Math.floor(diffHours / 24);

      if (diffMins < 1) return 'Just now';
      if (diffMins < 60) return `${diffMins}m ago`;
      if (diffHours < 24) return `${diffHours}h ago`;
      if (diffDays < 7) return `${diffDays}d ago`;

      return d.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'LIVE_CLASS':
        return <Video className="w-5 h-5 text-red-600" />;
      case 'COURSE':
        return <BookOpen className="w-5 h-5 text-brand-600" />;
      case 'PAYMENT':
        return <CreditCard className="w-5 h-5 text-emerald-600" />;
      case 'ANNOUNCEMENT':
        return <Megaphone className="w-5 h-5 text-indigo-600" />;
      case 'SYSTEM':
      default:
        return <CheckCircle2 className="w-5 h-5 text-blue-600" />;
    }
  };

  const getTypeBadgeClass = (type: string) => {
    switch (type) {
      case 'LIVE_CLASS':
        return 'bg-red-50 text-red-700 border-red-200';
      case 'COURSE':
        return 'bg-brand-50 text-brand-700 border-brand-200';
      case 'PAYMENT':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'ANNOUNCEMENT':
        return 'bg-indigo-50 text-indigo-700 border-indigo-200';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  const filteredNotifications = notifications.filter(
    (n) =>
      n.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      n.message.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (n.courseTitle && n.courseTitle.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="space-y-6 max-w-4xl mx-auto animate-in fade-in duration-200">
      {/* Top Header */}
      <div className="border-b border-slate-200 pb-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center space-x-3">
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
              Notification Center
            </h1>
            {unreadCount > 0 && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-brand-100 text-brand-700">
                {unreadCount} unread
              </span>
            )}
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Stay updated on faculty webinars, syllabus updates, exam results, and institutional broadcasts.
          </p>
        </div>

        {unreadCount > 0 && (
          <button
            onClick={handleMarkAllRead}
            className="inline-flex items-center justify-center px-4 py-2 rounded-xl text-xs font-semibold text-brand-700 bg-brand-50 hover:bg-brand-100 border border-brand-200 transition-colors shadow-xs"
          >
            <CheckCheck className="w-4 h-4 mr-1.5 text-brand-600" />
            Mark All as Read
          </button>
        )}
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 flex items-center space-x-3 text-xs">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setFilterUnreadOnly(false)}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              !filterUnreadOnly
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            All Notifications
          </button>
          <button
            onClick={() => setFilterUnreadOnly(true)}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              filterUnreadOnly
                ? 'bg-brand-600 text-white shadow-xs'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            Unread Only ({unreadCount})
          </button>
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search notifications..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3.5 py-1.5 bg-white border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-brand-500 focus:outline-none shadow-xs"
          />
        </div>
      </div>

      {/* Notification List */}
      <div className="space-y-3">
        {loading ? (
          <div className="space-y-3 animate-pulse">
            <div className="h-20 bg-slate-200 rounded-2xl"></div>
            <div className="h-20 bg-slate-200 rounded-2xl"></div>
            <div className="h-20 bg-slate-200 rounded-2xl"></div>
          </div>
        ) : filteredNotifications.length === 0 ? (
          <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center max-w-lg mx-auto space-y-3 shadow-xs">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto text-slate-400">
              <Inbox className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900">
              {filterUnreadOnly ? 'No unread notifications' : 'No notifications in your inbox'}
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              {filterUnreadOnly
                ? "You've caught up with all your updates! Check 'All Notifications' to review past announcements."
                : 'When administrators broadcast announcements, live classes, or academic notices, they will appear here.'}
            </p>
          </div>
        ) : (
          filteredNotifications.map((item) => (
            <div
              key={item.id}
              onClick={() => handleNotificationClick(item)}
              className={`p-4 sm:p-5 rounded-2xl border transition-all cursor-pointer flex items-start gap-4 ${
                !item.isRead
                  ? 'bg-brand-50/20 border-brand-200/80 shadow-xs hover:border-brand-300'
                  : 'bg-white border-slate-200 hover:border-slate-300'
              }`}
            >
              {/* Type Icon */}
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${getTypeBadgeClass(
                  item.type
                )}`}
              >
                {getTypeIcon(item.type)}
              </div>

              {/* Notification Content */}
              <div className="flex-1 min-w-0 space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center space-x-2">
                    <span
                      className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md border ${getTypeBadgeClass(
                        item.type
                      )}`}
                    >
                      {item.type}
                    </span>
                    {item.courseTitle && (
                      <span className="text-[11px] text-slate-500 font-semibold truncate max-w-[180px]">
                        {item.courseTitle}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center space-x-2 shrink-0">
                    <span className="text-[11px] text-slate-400 flex items-center">
                      <Clock className="w-3 h-3 mr-1 text-slate-400" />
                      {formatTime(item.createdAt)}
                    </span>
                    {!item.isRead && (
                      <span className="w-2 h-2 rounded-full bg-brand-600" title="Unread"></span>
                    )}
                  </div>
                </div>

                <h3
                  className={`text-sm ${
                    !item.isRead ? 'font-bold text-slate-900' : 'font-medium text-slate-800'
                  }`}
                >
                  {item.title}
                </h3>

                <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                  {item.message}
                </p>

                {/* Bottom Context Buttons */}
                <div className="pt-2 flex items-center justify-between text-xs">
                  <div className="flex items-center space-x-3">
                    {item.type === 'LIVE_CLASS' && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (!item.isRead) handleMarkAsRead(item.id);
                          navigate('/student/live-classes');
                        }}
                        className="inline-flex items-center font-bold text-red-600 hover:text-red-700"
                      >
                        <Video className="w-3.5 h-3.5 mr-1" />
                        Join Live Class
                      </button>
                    )}
                    {item.type === 'COURSE' && item.targetCourseId && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (!item.isRead) handleMarkAsRead(item.id);
                          navigate(`/student/courses/${item.targetCourseId}/learn`);
                        }}
                        className="inline-flex items-center font-bold text-brand-600 hover:text-brand-700"
                      >
                        <BookOpen className="w-3.5 h-3.5 mr-1" />
                        Open Course
                      </button>
                    )}
                  </div>

                  {!item.isRead && (
                    <button
                      onClick={(e) => handleMarkAsRead(item.id, e)}
                      className="text-[11px] text-slate-400 hover:text-brand-600 font-semibold"
                    >
                      Mark as read
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* DETAIL MODAL */}
      {activeModalItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2">
                <div className={`p-2 rounded-xl border ${getTypeBadgeClass(activeModalItem.type)}`}>
                  {getTypeIcon(activeModalItem.type)}
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    {activeModalItem.type}
                  </span>
                  <span className="text-xs text-slate-500 font-medium">
                    {activeModalItem.courseTitle || 'Apex Institute Notice'}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setActiveModalItem(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <h2 className="text-base font-bold text-slate-900 leading-snug">
                {activeModalItem.title}
              </h2>
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 text-xs text-slate-700 leading-relaxed whitespace-pre-line">
                {activeModalItem.message}
              </div>
              <div className="text-[11px] text-slate-400">
                Received: {new Date(activeModalItem.createdAt).toLocaleString()}
              </div>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-slate-100">
              <div>
                {activeModalItem.type === 'LIVE_CLASS' && (
                  <button
                    onClick={() => {
                      setActiveModalItem(null);
                      navigate('/student/live-classes');
                    }}
                    className="inline-flex items-center px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold shadow-xs"
                  >
                    <Video className="w-3.5 h-3.5 mr-1.5" />
                    Go to Live Classes
                  </button>
                )}
                {activeModalItem.type === 'COURSE' && activeModalItem.targetCourseId && (
                  <button
                    onClick={() => {
                      setActiveModalItem(null);
                      navigate(`/student/courses/${activeModalItem.targetCourseId}/learn`);
                    }}
                    className="inline-flex items-center px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-bold shadow-xs"
                  >
                    <BookOpen className="w-3.5 h-3.5 mr-1.5" />
                    Open Course
                  </button>
                )}
              </div>

              <button
                onClick={() => setActiveModalItem(null)}
                className="px-4 py-2 border border-slate-200 text-slate-600 hover:bg-slate-50 rounded-xl text-xs font-semibold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
