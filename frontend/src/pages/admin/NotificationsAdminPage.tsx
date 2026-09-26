import React, { useState, useEffect } from 'react';
import {
  Bell,
  Megaphone,
  Video,
  BookOpen,
  Send,
  Trash2,
  Users,
  Search,
  CheckCircle2,
  AlertCircle,
  X,
  Filter,
  Eye,
} from 'lucide-react';
import {
  notificationService,
  AdminNotificationItem,
  SendBroadcastPayload,
} from '../../services/notificationService';
import { adminCourseService, AdminCourseItem } from '../../services/adminCourseService';
import { adminService } from '../../services/adminService';
import { StudentListItem } from '../../types';

export const NotificationsAdminPage: React.FC = () => {
  const [notifications, setNotifications] = useState<AdminNotificationItem[]>([]);
  const [courses, setCourses] = useState<AdminCourseItem[]>([]);
  const [students, setStudents] = useState<StudentListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Modal State
  const [broadcastModalOpen, setBroadcastModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form State
  const [formData, setFormData] = useState<SendBroadcastPayload>({
    title: '',
    message: '',
    type: 'ANNOUNCEMENT',
    targetAudience: 'ALL',
    targetCourseId: '',
    targetStudentId: '',
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [notifsData, coursesRes, studentsRes] = await Promise.all([
        notificationService.listAdminNotifications(),
        adminCourseService.listCourses().catch(() => ({ data: [] })),
        adminService.getAllStudents(1, 100, 'ACTIVE').catch(() => ({ data: [] })),
      ]);

      setNotifications(notifsData);
      setCourses(coursesRes.data || []);
      setStudents(studentsRes.data || []);
    } catch (err: any) {
      console.error('Failed to load admin notifications:', err);
      setError(err.message || 'Failed to load notifications.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleOpenModal = () => {
    setFormData({
      title: '',
      message: '',
      type: 'ANNOUNCEMENT',
      targetAudience: 'ALL',
      targetCourseId: courses.length > 0 ? courses[0].id : '',
      targetStudentId: students.length > 0 ? students[0].id : '',
    });
    setBroadcastModalOpen(true);
  };

  const handleBroadcastSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      setError(null);

      const payload: SendBroadcastPayload = {
        title: formData.title,
        message: formData.message,
        type: formData.type,
        targetAudience: formData.targetAudience,
        targetCourseId: formData.targetAudience === 'COURSE' ? formData.targetCourseId : undefined,
        targetStudentId: formData.targetAudience === 'STUDENT' ? formData.targetStudentId : undefined,
      };

      await notificationService.sendBroadcast(payload);
      setBroadcastModalOpen(false);
      setSuccessMsg('Broadcast notification sent successfully!');
      setTimeout(() => setSuccessMsg(null), 4000);
      await fetchData();
    } catch (err: any) {
      setError(err.message || 'Failed to send broadcast.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteNotification = async (id: string, title: string) => {
    if (!window.confirm(`Delete broadcast "${title}"? This will remove it from all recipient inboxes.`)) {
      return;
    }

    try {
      setError(null);
      await notificationService.deleteNotification(id);
      setSuccessMsg('Notification revoked and deleted.');
      setTimeout(() => setSuccessMsg(null), 3000);
      await fetchData();
    } catch (err: any) {
      setError(err.message || 'Failed to delete notification.');
    }
  };

  const filteredNotifications = notifications.filter(
    (n) =>
      n.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      n.message.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (n.courseTitle && n.courseTitle.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const totalDelivered = notifications.reduce((acc, n) => acc + (n.recipientsCount || 0), 0);
  const totalRead = notifications.reduce((acc, n) => acc + (n.readCount || 0), 0);
  const overallReadRate = totalDelivered > 0 ? Math.round((totalRead / totalDelivered) * 100) : 0;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Title & Action Bar */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center space-x-2">
            <span>Institutional Broadcasts & Notifications</span>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-brand-100 text-brand-700 font-bold">
              Section 29
            </span>
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Publish targeted announcements, course alerts, and live masterclass reminders to students.
          </p>
        </div>

        <button
          onClick={handleOpenModal}
          className="inline-flex items-center justify-center px-4 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs shadow-sm hover:shadow transition-all"
        >
          <Send className="w-4 h-4 mr-1.5" />
          Send Broadcast
        </button>
      </div>

      {/* Alert Messages */}
      {error && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 flex items-center justify-between text-xs">
          <div className="flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
          <button onClick={() => setError(null)} className="p-1 hover:bg-red-100 rounded-lg">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {successMsg && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 flex items-center justify-between text-xs">
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-emerald-600" />
            <span>{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg(null)} className="p-1 hover:bg-emerald-100 rounded-lg">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Analytics Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Broadcasts Dispatched</span>
            <Megaphone className="w-4 h-4 text-brand-600" />
          </div>
          <div className="text-2xl font-black text-slate-900 mt-2">{notifications.length}</div>
          <span className="text-[11px] text-slate-400">Total institutional notices</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Recipients Delivered</span>
            <Users className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="text-2xl font-black text-slate-900 mt-2">{totalDelivered}</div>
          <span className="text-[11px] text-indigo-600 font-medium">Inboxes notified</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Overall Read Rate</span>
            <Eye className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-black text-slate-900 mt-2">{overallReadRate}%</div>
          <span className="text-[11px] text-emerald-600 font-medium">
            {totalRead} of {totalDelivered} read
          </span>
        </div>
      </div>

      {/* Search & Filter */}
      <div className="flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by title, message, or course..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-brand-500 focus:outline-none shadow-xs"
          />
        </div>
        <span className="text-xs text-slate-500 font-medium">
          {filteredNotifications.length} broadcast records
        </span>
      </div>

      {/* Broadcast History Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-slate-400 text-xs">Loading broadcasts...</div>
        ) : filteredNotifications.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <Bell className="w-10 h-10 text-slate-300 mx-auto" />
            <p className="text-sm font-semibold text-slate-700">No broadcasts sent yet</p>
            <p className="text-xs text-slate-500">
              Click "+ Send Broadcast" to send announcements to your students.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Title & Details</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4">Target Audience</th>
                  <th className="py-3 px-4">Read Engagement</th>
                  <th className="py-3 px-4">Dispatched At</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {filteredNotifications.map((n) => {
                  const rate =
                    n.recipientsCount > 0
                      ? Math.round((n.readCount / n.recipientsCount) * 100)
                      : 0;

                  return (
                    <tr key={n.id} className="hover:bg-slate-50/70 transition-colors">
                      {/* Title & Preview */}
                      <td className="py-3.5 px-4 max-w-sm">
                        <div className="font-bold text-slate-900 leading-snug">{n.title}</div>
                        <div className="text-slate-500 line-clamp-1 mt-0.5">{n.message}</div>
                        {n.courseTitle && (
                          <span className="text-[11px] text-brand-600 font-semibold block mt-1">
                            Course: {n.courseTitle}
                          </span>
                        )}
                      </td>

                      {/* Type Badge */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold ${n.type === 'LIVE_CLASS'
                              ? 'bg-red-50 text-red-700 border border-red-200'
                              : n.type === 'COURSE'
                                ? 'bg-brand-50 text-brand-700 border border-brand-200'
                                : n.type === 'PAYMENT'
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                  : 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                            }`}
                        >
                          {n.type}
                        </span>
                      </td>

                      {/* Audience Badge */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-semibold text-[11px]">
                          {n.targetAudience === 'ALL'
                            ? 'All Students'
                            : n.targetAudience === 'COURSE'
                              ? 'Enrolled Course'
                              : 'Specific Student'}
                        </span>
                      </td>

                      {/* Read Engagement */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="flex items-center space-x-2">
                          <span className="font-bold text-slate-900">
                            {n.readCount} / {n.recipientsCount}
                          </span>
                          <span className="text-[11px] text-slate-400 font-medium">({rate}%)</span>
                        </div>
                        <div className="w-24 h-1.5 bg-slate-100 rounded-full mt-1 overflow-hidden">
                          <div
                            className="h-full bg-emerald-500 rounded-full"
                            style={{ width: `${rate}%` }}
                          ></div>
                        </div>
                      </td>

                      {/* Sent At */}
                      <td className="py-3.5 px-4 whitespace-nowrap text-slate-500">
                        {new Date(n.createdAt).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          hour: 'numeric',
                          minute: '2-digit',
                        })}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <button
                          onClick={() => handleDeleteNotification(n.id, n.title)}
                          title="Revoke / Delete Notification"
                          className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* --------------------------------------------------------------------- */}
      {/* SEND BROADCAST MODAL */}
      {/* --------------------------------------------------------------------- */}
      {broadcastModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-lg font-bold text-slate-900 flex items-center space-x-2">
                <Send className="w-5 h-5 text-brand-600" />
                <span>Send Institutional Broadcast</span>
              </h3>
              <button
                onClick={() => setBroadcastModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleBroadcastSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Broadcast Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Schedule Change: Advanced JavaScript Workshop"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-brand-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Notification Type
                  </label>
                  <select
                    value={formData.type}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        type: e.target.value as 'ANNOUNCEMENT' | 'LIVE_CLASS' | 'COURSE' | 'SYSTEM',
                      })
                    }
                    className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-brand-500 focus:outline-none bg-white"
                  >
                    <option value="ANNOUNCEMENT">ANNOUNCEMENT</option>
                    <option value="LIVE_CLASS">LIVE_CLASS</option>
                    <option value="COURSE">COURSE UPDATE</option>
                    <option value="SYSTEM">SYSTEM NOTICE</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Target Audience
                  </label>
                  <select
                    value={formData.targetAudience}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        targetAudience: e.target.value as 'ALL' | 'COURSE' | 'STUDENT',
                      })
                    }
                    className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-brand-500 focus:outline-none bg-white font-medium"
                  >
                    <option value="ALL">All Active Students</option>
                    <option value="COURSE">Enrolled Students of Course</option>
                    <option value="STUDENT">Specific Individual Student</option>
                  </select>
                </div>
              </div>

              {/* Conditional: Course Dropdown */}
              {formData.targetAudience === 'COURSE' && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Select Target Course <span className="text-red-500">*</span>
                  </label>
                  <select
                    required
                    value={formData.targetCourseId || ''}
                    onChange={(e) => setFormData({ ...formData, targetCourseId: e.target.value })}
                    className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-brand-500 focus:outline-none bg-white"
                  >
                    <option value="">Select course...</option>
                    {courses.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.title}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Conditional: Student Dropdown */}
              {formData.targetAudience === 'STUDENT' && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Select Individual Student <span className="text-red-500">*</span>
                  </label>
                  <select
                    required
                    value={formData.targetStudentId || ''}
                    onChange={(e) => setFormData({ ...formData, targetStudentId: e.target.value })}
                    className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-brand-500 focus:outline-none bg-white"
                  >
                    <option value="">Select student...</option>
                    {students.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.student_name} ({s.phone}) - {s.email || 'No email'}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Message Content <span className="text-red-500">*</span>
                </label>
                <textarea
                  rows={4}
                  required
                  placeholder="Enter the complete notification body message for students..."
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-brand-500 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setBroadcastModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl text-xs font-semibold hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-bold shadow-xs disabled:opacity-50 inline-flex items-center"
                >
                  <Send className="w-3.5 h-3.5 mr-1.5" />
                  {submitting ? 'Broadcasting...' : 'Broadcast Now'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
