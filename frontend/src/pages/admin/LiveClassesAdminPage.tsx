import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Video,
  Calendar,
  Clock,
  ExternalLink,
  Plus,
  Trash2,
  Edit2,
  Film,
  Radio,
  CheckCircle2,
  AlertCircle,
  X,
  Users,
  Search,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import {
  liveClassService,
  AdminLiveClass,
  CreateLiveClassPayload,
  UpdateLiveClassPayload,
  AddRecordingPayload,
} from '../../services/liveClassService';
import { adminCourseService, AdminCourseItem } from '../../services/adminCourseService';

export const LiveClassesAdminPage: React.FC = () => {
  const [classes, setClasses] = useState<AdminLiveClass[]>([]);
  const [courses, setCourses] = useState<AdminCourseItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Modals state
  const [scheduleModalOpen, setScheduleModalOpen] = useState(false);
  const [editModalClass, setEditModalClass] = useState<AdminLiveClass | null>(null);
  const [recordingModalClass, setRecordingModalClass] = useState<AdminLiveClass | null>(null);
  const [expandedClassId, setExpandedClassId] = useState<string | null>(null);

  // Form states
  const [formData, setFormData] = useState<CreateLiveClassPayload>({
    title: '',
    courseId: '',
    instructorName: '',
    description: '',
    startTime: '',
    endTime: '',
    meetingLink: '',
    maxParticipants: 500,
  });

  const [editFormData, setEditFormData] = useState<UpdateLiveClassPayload>({
    title: '',
    courseId: '',
    instructorName: '',
    description: '',
    startTime: '',
    endTime: '',
    meetingLink: '',
    status: 'UPCOMING',
    maxParticipants: 500,
  });

  const [recordingFormData, setRecordingFormData] = useState({
    title: '',
    storageKey: '',
    durationMinutes: 60,
  });

  const [submitting, setSubmitting] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [classesData, coursesRes] = await Promise.all([
        liveClassService.getAdminLiveClasses(),
        adminCourseService.listCourses().catch(() => ({ data: [] })),
      ]);
      setClasses(classesData);
      setCourses(coursesRes.data || []);
    } catch (err: any) {
      console.error('Failed to load admin live classes:', err);
      setError(err.response?.data?.message || 'Failed to load live classes.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleOpenScheduleModal = () => {
    const now = new Date();
    const defaultStart = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    defaultStart.setMinutes(0, 0, 0);
    const defaultEnd = new Date(defaultStart.getTime() + 90 * 60 * 1000);

    const toLocalISO = (d: Date) => {
      const pad = (n: number) => (n < 10 ? '0' + n : n);
      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
    };

    setFormData({
      title: '',
      courseId: courses.length > 0 ? courses[0].id : '',
      instructorName: '',
      description: '',
      startTime: toLocalISO(defaultStart),
      endTime: toLocalISO(defaultEnd),
      meetingLink: 'https://meet.google.com/',
      maxParticipants: 500,
    });
    setScheduleModalOpen(true);
  };

  const handleScheduleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      setError(null);

      const payload: CreateLiveClassPayload = {
        title: formData.title,
        courseId: formData.courseId || null,
        instructorName: formData.instructorName,
        description: formData.description || undefined,
        startTime: new Date(formData.startTime).toISOString(),
        endTime: new Date(formData.endTime).toISOString(),
        meetingLink: formData.meetingLink,
        maxParticipants: Number(formData.maxParticipants) || 500,
      };

      await liveClassService.createLiveClass(payload);
      setScheduleModalOpen(false);
      setSuccessMsg('Live class scheduled successfully!');
      setTimeout(() => setSuccessMsg(null), 4000);
      await fetchData();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to schedule live class.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenEditModal = (c: AdminLiveClass) => {
    const toLocalISO = (dStr: string) => {
      const d = new Date(dStr);
      const pad = (n: number) => (n < 10 ? '0' + n : n);
      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
    };

    setEditModalClass(c);
    setEditFormData({
      title: c.title,
      courseId: c.course_id || '',
      instructorName: c.instructor_name,
      description: c.description || '',
      startTime: toLocalISO(c.start_time),
      endTime: toLocalISO(c.end_time),
      meetingLink: c.meeting_link,
      status: c.status,
      maxParticipants: c.max_participants,
    });
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editModalClass) return;

    try {
      setSubmitting(true);
      setError(null);

      const payload: UpdateLiveClassPayload = {
        title: editFormData.title,
        courseId: editFormData.courseId || null,
        instructorName: editFormData.instructorName,
        description: editFormData.description || undefined,
        startTime: editFormData.startTime ? new Date(editFormData.startTime).toISOString() : undefined,
        endTime: editFormData.endTime ? new Date(editFormData.endTime).toISOString() : undefined,
        meetingLink: editFormData.meetingLink,
        status: editFormData.status,
        maxParticipants: Number(editFormData.maxParticipants) || 500,
      };

      await liveClassService.updateLiveClass(editModalClass.id, payload);
      setEditModalClass(null);
      setSuccessMsg('Live class updated successfully!');
      setTimeout(() => setSuccessMsg(null), 4000);
      await fetchData();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to update live class.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleStatusChange = async (classId: string, newStatus: 'UPCOMING' | 'LIVE' | 'COMPLETED' | 'CANCELLED') => {
    try {
      setError(null);
      await liveClassService.updateLiveClass(classId, { status: newStatus });
      setSuccessMsg(`Class status transitioned to ${newStatus}`);
      setTimeout(() => setSuccessMsg(null), 3000);
      await fetchData();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to change status.');
    }
  };

  const handleDeleteClass = async (id: string, title: string) => {
    if (!window.confirm(`Are you sure you want to permanently delete the live class "${title}"?`)) {
      return;
    }

    try {
      setError(null);
      await liveClassService.deleteLiveClass(id);
      setSuccessMsg('Live class deleted.');
      setTimeout(() => setSuccessMsg(null), 3000);
      await fetchData();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to delete live class.');
    }
  };

  const handleOpenRecordingModal = (c: AdminLiveClass) => {
    setRecordingModalClass(c);
    setRecordingFormData({
      title: `Recording: ${c.title}`,
      storageKey: `recordings/live-session-${Date.now()}.mp4`,
      durationMinutes: 75,
    });
  };

  const handleRecordingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recordingModalClass) return;

    try {
      setSubmitting(true);
      setError(null);

      const payload: AddRecordingPayload = {
        title: recordingFormData.title,
        storageKey: recordingFormData.storageKey,
        durationSeconds: Math.round(Number(recordingFormData.durationMinutes) * 60),
      };

      await liveClassService.addRecording(recordingModalClass.id, payload);
      setRecordingModalClass(null);
      setSuccessMsg('Recording attached and live class marked COMPLETED!');
      setTimeout(() => setSuccessMsg(null), 4000);
      await fetchData();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to attach recording.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteRecording = async (recId: string) => {
    if (!window.confirm('Delete this recorded session?')) return;
    try {
      setError(null);
      await liveClassService.deleteRecording(recId);
      setSuccessMsg('Recording deleted.');
      setTimeout(() => setSuccessMsg(null), 3000);
      await fetchData();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to delete recording.');
    }
  };

  const formatDateTime = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      });
    } catch {
      return dateStr;
    }
  };

  const filteredClasses = classes.filter(
    (c) =>
      c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.instructor_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.course_title && c.course_title.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const liveCount = classes.filter((c) => c.status === 'LIVE').length;
  const upcomingCount = classes.filter((c) => c.status === 'UPCOMING').length;
  const completedCount = classes.filter((c) => c.status === 'COMPLETED').length;
  const totalRecordings = classes.reduce((acc, c) => acc + (c.recordingCount || 0), 0);

  return (
    <div className="w-full space-y-6">
      {/* Page Title & Action Bar */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center space-x-2">
            <span>Live Classes & Recordings</span>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-brand-100 text-brand-700 font-bold">
              Section 28
            </span>
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Schedule live video lectures, manage status transitions, broadcast links, and publish recorded masterclasses.
          </p>
        </div>

        <button
          onClick={handleOpenScheduleModal}
          className="inline-flex items-center justify-center px-4 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs shadow-sm hover:shadow transition-all"
        >
          <Plus className="w-4 h-4 mr-1.5" />
          Schedule Live Class
        </button>
      </div>

      {/* Alert Banners */}
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

      {/* Metrics Dashboard */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Broadcasting Now</span>
            <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping"></span>
          </div>
          <div className="text-2xl font-black text-slate-900 mt-2">{liveCount}</div>
          <span className="text-[11px] text-red-600 font-medium">Active sessions</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Upcoming</span>
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-black text-slate-900 mt-2">{upcomingCount}</div>
          <span className="text-[11px] text-amber-600 font-medium">Scheduled</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Completed</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-black text-slate-900 mt-2">{completedCount}</div>
          <span className="text-[11px] text-emerald-600 font-medium">Archived classes</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Video Recordings</span>
            <Film className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="text-2xl font-black text-slate-900 mt-2">{totalRecordings}</div>
          <span className="text-[11px] text-indigo-600 font-medium">Available to students</span>
        </div>
      </div>

      {/* Filter / Search Bar */}
      <div className="flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Filter by title, instructor, or course..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-brand-500 shadow-xs"
          />
        </div>
        <span className="text-xs text-slate-500 font-medium">
          Showing {filteredClasses.length} of {classes.length} classes
        </span>
      </div>

      {/* Classes Table / List */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-slate-400 text-xs">Loading sessions...</div>
        ) : filteredClasses.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <Video className="w-10 h-10 text-slate-300 mx-auto" />
            <p className="text-sm font-semibold text-slate-700">No live classes found</p>
            <p className="text-xs text-slate-500">Click "+ Schedule Live Class" to organize your first session.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filteredClasses.map((item) => {
              const isExpanded = expandedClassId === item.id;
              const hasRecordings = item.recordings && item.recordings.length > 0;

              return (
                <div key={item.id} className="p-5 hover:bg-slate-50/60 transition-colors">
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    {/* Left: Class metadata */}
                    <div className="space-y-1.5 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        {/* Status Badge */}
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-extrabold ${item.status === 'LIVE'
                            ? 'bg-red-100 text-red-700 border border-red-300 animate-pulse'
                            : item.status === 'UPCOMING'
                              ? 'bg-amber-100 text-amber-800 border border-amber-200'
                              : item.status === 'COMPLETED'
                                ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                : 'bg-slate-100 text-slate-600'
                            }`}
                        >
                          {item.status === 'LIVE' && <span className="w-1.5 h-1.5 rounded-full bg-red-600 mr-1"></span>}
                          {item.status}
                        </span>

                        <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                          {item.course_title || 'General Webinar'}
                        </span>

                        {hasRecordings && (
                          <span className="inline-flex items-center text-[11px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-md">
                            <Film className="w-3 h-3 mr-1" />
                            {item.recordings.length} {item.recordings.length === 1 ? 'Recording' : 'Recordings'}
                          </span>
                        )}
                      </div>

                      <h3 className="text-base font-bold text-slate-900">{item.title}</h3>

                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
                        <div>
                          Instructor: <strong className="text-slate-700">{item.instructor_name}</strong>
                        </div>
                        <div className="flex items-center">
                          <Calendar className="w-3.5 h-3.5 mr-1 text-slate-400" />
                          <span>{formatDateTime(item.start_time)}</span>
                        </div>
                        <div>
                          Max: <strong className="text-slate-700">{item.max_participants}</strong>
                        </div>
                      </div>
                    </div>

                    {/* Right: Actions */}
                    <div className="flex flex-wrap items-center gap-2">
                      {/* Status Quick Changer */}
                      <select
                        value={item.status}
                        onChange={(e) =>
                          handleStatusChange(
                            item.id,
                            e.target.value as 'UPCOMING' | 'LIVE' | 'COMPLETED' | 'CANCELLED'
                          )
                        }
                        className="text-xs border border-slate-200 rounded-xl px-2.5 py-1.5 bg-white font-medium focus:ring-1 focus:ring-brand-500 text-slate-700 shadow-xs"
                      >
                        <option value="UPCOMING">UPCOMING</option>
                        <option value="LIVE">🔴 LIVE</option>
                        <option value="COMPLETED">✓ COMPLETED</option>
                        <option value="CANCELLED">✕ CANCELLED</option>
                      </select>

                      {/* Attach Recording Button */}
                      <button
                        onClick={() => handleOpenRecordingModal(item)}
                        title="Attach Recorded Session"
                        className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-xl border border-indigo-200 transition-colors text-xs font-semibold inline-flex items-center"
                      >
                        <Film className="w-3.5 h-3.5 mr-1" />
                        <span className="hidden sm:inline">Add Recording</span>
                      </button>

                      {/* In-Platform Host Live Studio */}
                      <Link
                        to={`/live/${item.id}`}
                        title="Enter / Host Native Live Studio"
                        className="px-3 py-1.5 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white rounded-xl shadow-xs text-xs font-bold inline-flex items-center space-x-1.5 transition-all hover:scale-[1.02]"
                      >
                        <Radio className="w-3.5 h-3.5 animate-pulse" />
                        <span>Host Studio</span>
                      </Link>

                      {/* Edit Button */}
                      <button
                        onClick={() => handleOpenEditModal(item)}
                        title="Edit Details"
                        className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl border border-slate-200 transition-colors"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>

                      {/* Delete Button */}
                      <button
                        onClick={() => handleDeleteClass(item.id, item.title)}
                        title="Delete Class"
                        className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-xl border border-red-200 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>

                      {/* Toggle Recordings Details */}
                      {hasRecordings && (
                        <button
                          onClick={() => setExpandedClassId(isExpanded ? null : item.id)}
                          className="p-2 text-slate-400 hover:text-slate-700 rounded-xl"
                        >
                          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Expanded Recordings List */}
                  {isExpanded && hasRecordings && (
                    <div className="mt-4 pt-3 border-t border-slate-100 pl-4 space-y-2">
                      <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                        Attached Video Recordings:
                      </h4>
                      <div className="space-y-2">
                        {item.recordings.map((rec) => (
                          <div
                            key={rec.id}
                            className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex items-center justify-between text-xs"
                          >
                            <div className="flex items-center space-x-2">
                              <Film className="w-4 h-4 text-indigo-600" />
                              <span className="font-semibold text-slate-900">{rec.title}</span>
                              <span className="text-slate-500">({rec.durationFormatted})</span>
                              <span className="text-[11px] text-slate-400 font-mono">[{rec.storage_key}]</span>
                            </div>
                            <button
                              onClick={() => handleDeleteRecording(rec.id)}
                              className="text-red-600 hover:text-red-800 p-1 hover:bg-red-50 rounded-lg transition-colors"
                              title="Delete Recording"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* --------------------------------------------------------------------- */}
      {/* 1. SCHEDULE LIVE CLASS MODAL */}
      {/* --------------------------------------------------------------------- */}
      {scheduleModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-lg font-bold text-slate-900 flex items-center space-x-2">
                <Video className="w-5 h-5 text-brand-600" />
                <span>Schedule New Live Class</span>
              </h3>
              <button
                onClick={() => setScheduleModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleScheduleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Class Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Distributed Consensus & Paxos Deep Dive"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-brand-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Instructor Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Dr. Rajesh Verma"
                    value={formData.instructorName}
                    onChange={(e) => setFormData({ ...formData, instructorName: e.target.value })}
                    className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-brand-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Associated Course
                  </label>
                  <select
                    value={formData.courseId || ''}
                    onChange={(e) => setFormData({ ...formData, courseId: e.target.value })}
                    className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-brand-500 focus:outline-none bg-white"
                  >
                    <option value="">General Institute Masterclass</option>
                    {courses.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.title}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Start Date & Time <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="datetime-local"
                    required
                    value={formData.startTime}
                    onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                    className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-brand-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    End Date & Time <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="datetime-local"
                    required
                    value={formData.endTime}
                    onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                    className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-brand-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Meeting Link URL <span className="text-red-500">*</span>
                </label>
                <input
                  type="url"
                  required
                  placeholder="https://meet.google.com/xyz-abcd-efg or Zoom URL"
                  value={formData.meetingLink}
                  onChange={(e) => setFormData({ ...formData, meetingLink: e.target.value })}
                  className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-brand-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Description / Agenda</label>
                <textarea
                  rows={3}
                  placeholder="Overview of topics and lab exercises covered in this session..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-brand-500 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setScheduleModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl text-xs font-semibold hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-bold shadow-xs disabled:opacity-50"
                >
                  {submitting ? 'Scheduling...' : 'Schedule Class'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --------------------------------------------------------------------- */}
      {/* 2. EDIT LIVE CLASS MODAL */}
      {/* --------------------------------------------------------------------- */}
      {editModalClass && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-lg font-bold text-slate-900 flex items-center space-x-2">
                <Edit2 className="w-5 h-5 text-brand-600" />
                <span>Edit Live Class Details</span>
              </h3>
              <button
                onClick={() => setEditModalClass(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Title</label>
                <input
                  type="text"
                  required
                  value={editFormData.title}
                  onChange={(e) => setEditFormData({ ...editFormData, title: e.target.value })}
                  className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-brand-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Instructor</label>
                  <input
                    type="text"
                    required
                    value={editFormData.instructorName}
                    onChange={(e) => setEditFormData({ ...editFormData, instructorName: e.target.value })}
                    className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-brand-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Status</label>
                  <select
                    value={editFormData.status}
                    onChange={(e) =>
                      setEditFormData({
                        ...editFormData,
                        status: e.target.value as 'UPCOMING' | 'LIVE' | 'COMPLETED' | 'CANCELLED',
                      })
                    }
                    className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-brand-500 focus:outline-none bg-white"
                  >
                    <option value="UPCOMING">UPCOMING</option>
                    <option value="LIVE">LIVE</option>
                    <option value="COMPLETED">COMPLETED</option>
                    <option value="CANCELLED">CANCELLED</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Start Time</label>
                  <input
                    type="datetime-local"
                    value={editFormData.startTime}
                    onChange={(e) => setEditFormData({ ...editFormData, startTime: e.target.value })}
                    className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-brand-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">End Time</label>
                  <input
                    type="datetime-local"
                    value={editFormData.endTime}
                    onChange={(e) => setEditFormData({ ...editFormData, endTime: e.target.value })}
                    className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-brand-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Meeting Link</label>
                <input
                  type="url"
                  required
                  value={editFormData.meetingLink}
                  onChange={(e) => setEditFormData({ ...editFormData, meetingLink: e.target.value })}
                  className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-brand-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Description</label>
                <textarea
                  rows={3}
                  value={editFormData.description}
                  onChange={(e) => setEditFormData({ ...editFormData, description: e.target.value })}
                  className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-brand-500 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditModalClass(null)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl text-xs font-semibold hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-bold shadow-xs disabled:opacity-50"
                >
                  {submitting ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --------------------------------------------------------------------- */}
      {/* 3. ATTACH RECORDED SESSION MODAL */}
      {/* --------------------------------------------------------------------- */}
      {recordingModalClass && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-lg font-bold text-slate-900 flex items-center space-x-2">
                <Film className="w-5 h-5 text-indigo-600" />
                <span>Attach Recorded Session</span>
              </h3>
              <button
                onClick={() => setRecordingModalClass(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-500">
              Attach the processed cloud storage recording for <strong>"{recordingModalClass.title}"</strong>. Attaching a recording will automatically mark the live class status as <span className="font-bold text-emerald-700">COMPLETED</span>.
            </p>

            <form onSubmit={handleRecordingSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Recording Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={recordingFormData.title}
                  onChange={(e) => setRecordingFormData({ ...recordingFormData, title: e.target.value })}
                  className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-brand-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Storage Key / Object URI <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. recordings/system-design-live-2026.mp4"
                  value={recordingFormData.storageKey}
                  onChange={(e) => setRecordingFormData({ ...recordingFormData, storageKey: e.target.value })}
                  className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-brand-500 focus:outline-none font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Recording Duration (Minutes) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  min={1}
                  required
                  value={recordingFormData.durationMinutes}
                  onChange={(e) =>
                    setRecordingFormData({ ...recordingFormData, durationMinutes: Number(e.target.value) })
                  }
                  className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-brand-500 focus:outline-none"
                />
                <span className="text-[11px] text-slate-400 mt-1 block">
                  e.g. 75 minutes will be formatted as "1h 15m" for students.
                </span>
              </div>

              <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setRecordingModalClass(null)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl text-xs font-semibold hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-xs disabled:opacity-50"
                >
                  {submitting ? 'Attaching...' : 'Attach & Complete Class'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
