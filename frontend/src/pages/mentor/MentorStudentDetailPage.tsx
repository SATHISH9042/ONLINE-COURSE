import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { mentorService } from '../../services/mentorService';
import { StudentDetailAudit } from '../../types';
import {
  ArrowLeft,
  GraduationCap,
  Video,
  Calendar,
  Code2,
  FileCheck,
  MessageSquare,
  Clock,
  Shield,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Send,
  Trash2,
  ExternalLink,
  MapPin,
  Mail,
  Phone,
  Flame,
  Globe,
} from 'lucide-react';

export const MentorStudentDetailPage: React.FC = () => {
  const { studentId } = useParams<{ studentId: string }>();
  const [data, setData] = useState<StudentDetailAudit | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'progress' | 'live_classes' | 'login_days' | 'coding' | 'mcq' | 'notes'>('progress');

  // Feedback note form state
  const [newNote, setNewNote] = useState('');
  const [noteTag, setNoteTag] = useState('Academic Guidance');
  const [submittingNote, setSubmittingNote] = useState(false);
  const [noteSuccess, setNoteSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (studentId) {
      fetchStudentDetails(studentId);
    }
  }, [studentId]);

  const fetchStudentDetails = async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await mentorService.getStudentDetails(id);
      if (res.success && res.data) {
        setData(res.data);
      } else {
        setError(res.message || 'Unable to load student audit records.');
      }
    } catch (err: any) {
      setError(err.message || 'Network error.');
    } finally {
      setLoading(false);
    }
  };

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentId || !newNote.trim()) return;

    setSubmittingNote(true);
    setNoteSuccess(null);
    try {
      const res = await mentorService.addStudentNote(studentId, newNote.trim(), noteTag);
      if (res.success) {
        setNewNote('');
        setNoteSuccess('Guidance note added successfully.');
        fetchStudentDetails(studentId);
        setTimeout(() => setNoteSuccess(null), 3000);
      } else {
        setError(res.message || 'Failed to save note.');
      }
    } catch (err: any) {
      setError(err.message || 'Error saving note.');
    } finally {
      setSubmittingNote(false);
    }
  };

  const handleDeleteNote = async (noteId: string) => {
    if (!window.confirm('Are you sure you want to delete this note?')) return;
    try {
      const res = await mentorService.deleteStudentNote(noteId);
      if (res.success && studentId) {
        fetchStudentDetails(studentId);
      }
    } catch (err: any) {
      console.error(err);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-[500px]">
        <div className="flex flex-col items-center space-y-3">
          <div className="w-10 h-10 border-4 border-purple-500/20 border-t-purple-500 rounded-full animate-spin"></div>
          <p className="text-sm text-slate-400 font-medium">Loading comprehensive student audit data...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-8 max-w-4xl mx-auto">
        <div className="p-6 bg-rose-950/40 border border-rose-800/60 rounded-2xl text-rose-300 space-y-4">
          <div className="flex items-center space-x-3">
            <AlertCircle className="w-6 h-6 text-rose-400 shrink-0" />
            <div>
              <h3 className="font-bold text-base text-white">Access Restricted / Error</h3>
              <p className="text-xs text-rose-300 mt-0.5">
                {error || 'This student is not assigned to you, or the record does not exist.'}
              </p>
            </div>
          </div>
          <div className="pt-2">
            <Link
              to="/mentor/students"
              className="inline-flex items-center space-x-2 px-4 py-2 bg-rose-800/80 hover:bg-rose-700 text-white rounded-xl text-xs font-semibold"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to My Assigned Students</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const { student, assignment, courses, liveClasses, loginActivity, codingSubmissions, mcqAttempts, mentorNotes } = data;

  return (
    <div className="p-6 md:p-8 space-y-8 max-w-7xl mx-auto w-full">
      {/* Top Navigation */}
      <div>
        <Link
          to="/mentor/students"
          className="inline-flex items-center space-x-2 text-xs font-semibold text-purple-400 hover:text-purple-300 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Assigned Students Roster</span>
        </Link>
      </div>

      {/* Student Profile Header Banner */}
      <div className="rounded-2xl bg-gradient-to-r from-purple-900/50 via-slate-800 to-indigo-900/40 border border-slate-700/80 p-6 md:p-8 shadow-xl space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-start md:items-center space-x-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-purple-600 via-indigo-600 to-blue-500 text-white font-black text-2xl flex items-center justify-center shadow-lg shadow-purple-600/30 shrink-0">
              {student.full_name?.charAt(0) || 'S'}
            </div>
            <div className="space-y-1">
              <div className="flex items-center space-x-2 flex-wrap">
                <h1 className="text-2xl font-black text-white">{student.full_name}</h1>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  {student.status}
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-500/20 text-purple-300 border border-purple-500/30">
                  Assigned Student
                </span>
              </div>
              <div className="flex items-center space-x-4 text-xs text-slate-300 flex-wrap gap-y-1 pt-1">
                <span className="flex items-center space-x-1">
                  <Mail className="w-3.5 h-3.5 text-slate-400" />
                  <span>{student.email || 'No email registered'}</span>
                </span>
                <span className="flex items-center space-x-1">
                  <Phone className="w-3.5 h-3.5 text-slate-400" />
                  <span>{student.phone}</span>
                </span>
                {(student.city || student.state) && (
                  <span className="flex items-center space-x-1">
                    <MapPin className="w-3.5 h-3.5 text-slate-400" />
                    <span>{[student.city, student.state].filter(Boolean).join(', ')}</span>
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Admin Assignment Badge */}
          <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-700/80 text-xs text-slate-300 max-w-sm space-y-1">
            <div className="flex items-center space-x-1.5 font-semibold text-purple-300">
              <Shield className="w-4 h-4 text-purple-400" />
              <span>Admin Assignment Mandate</span>
            </div>
            <p className="text-[11px] text-slate-400">
              Assigned on: {new Date(assignment.assigned_at).toLocaleDateString([], { dateStyle: 'medium' })}
            </p>
            {assignment.notes && (
              <p className="text-[11px] text-slate-300 italic pt-1 border-t border-slate-700/50">
                &ldquo;{assignment.notes}&rdquo;
              </p>
            )}
          </div>
        </div>

        {/* 4 Core Quick Metric Tiles */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-2 border-t border-slate-700/60">
          <div className="p-3 bg-slate-900/60 rounded-xl border border-slate-700/60">
            <span className="text-[10px] uppercase font-bold text-slate-400">Enrolled Courses</span>
            <p className="text-xl font-bold text-white mt-1">{courses.length}</p>
          </div>
          <div className="p-3 bg-slate-900/60 rounded-xl border border-slate-700/60">
            <span className="text-[10px] uppercase font-bold text-slate-400">Live Class Attendance</span>
            <div className="flex items-baseline space-x-1 mt-1">
              <p className="text-xl font-bold text-emerald-400">{liveClasses.summary.attendanceRate}%</p>
              <span className="text-[11px] text-slate-400">
                ({liveClasses.summary.attended}/{liveClasses.summary.total})
              </span>
            </div>
          </div>
          <div className="p-3 bg-slate-900/60 rounded-xl border border-slate-700/60">
            <span className="text-[10px] uppercase font-bold text-slate-400">Login Days</span>
            <div className="flex items-baseline space-x-1 mt-1">
              <p className="text-xl font-bold text-purple-400">{loginActivity.summary.totalLoginDays}</p>
              <span className="text-[11px] text-slate-400">Unique Days</span>
            </div>
          </div>
          <div className="p-3 bg-slate-900/60 rounded-xl border border-slate-700/60">
            <span className="text-[10px] uppercase font-bold text-slate-400">Login Streak</span>
            <div className="flex items-center space-x-1 mt-1">
              <Flame className="w-5 h-5 text-amber-400 fill-amber-400" />
              <span className="text-xl font-bold text-amber-400">
                {loginActivity.summary.currentStreakDays} Days
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Audit Navigation Tabs */}
      <div className="flex items-center space-x-2 border-b border-slate-700/80 overflow-x-auto pb-px">
        {[
          { id: 'progress', label: 'Course Progress', icon: GraduationCap, count: courses.length },
          { id: 'live_classes', label: 'Live Classes ("Attended or Not")', icon: Video, count: liveClasses.summary.total },
          { id: 'login_days', label: 'Login Days & History', icon: Calendar, count: loginActivity.summary.totalLoginDays },
          { id: 'coding', label: 'Coding Submissions', icon: Code2, count: codingSubmissions.length },
          { id: 'mcq', label: 'MCQ Test Attempts', icon: FileCheck, count: mcqAttempts.length },
          { id: 'notes', label: 'Mentor Guidance Notes', icon: MessageSquare, count: mentorNotes.length },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center space-x-2 px-4 py-3 text-xs font-semibold rounded-t-xl border-b-2 whitespace-nowrap transition-all ${
                isActive
                  ? 'border-purple-500 bg-slate-800/80 text-purple-300'
                  : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-purple-400' : 'text-slate-400'}`} />
              <span>{tab.label}</span>
              <span
                className={`px-1.5 py-0.5 rounded-full text-[10px] ${
                  isActive ? 'bg-purple-500/20 text-purple-300' : 'bg-slate-700 text-slate-400'
                }`}
              >
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* TAB CONTENT PANELS */}
      <div className="space-y-6">
        {/* TAB 1: OVERALL COURSE PROGRESS */}
        {activeTab === 'progress' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-white">Enrolled Courses & Curriculum Progress</h3>
                <p className="text-xs text-slate-400">
                  Detailed progress breakdown per course syllabus for this student.
                </p>
              </div>
            </div>

            {courses.length === 0 ? (
              <div className="p-8 text-center bg-slate-800/60 rounded-2xl border border-slate-700/60 text-slate-400 text-xs">
                Student is not currently enrolled in any courses.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {courses.map((c) => (
                  <div
                    key={c.course_id}
                    className="p-5 rounded-2xl bg-slate-800/80 border border-slate-700/80 space-y-4 shadow-lg hover:border-purple-500/40 transition-all"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-purple-500/20 text-purple-300 border border-purple-500/30">
                          {c.enrollment_status}
                        </span>
                        <h4 className="text-base font-bold text-white mt-1.5">{c.title}</h4>
                        <p className="text-xs text-slate-400">Instructor: {c.instructor_name}</p>
                      </div>
                      <div className="text-right">
                        <span className="text-2xl font-black text-indigo-400">{c.progress_percentage}%</span>
                        <p className="text-[10px] text-slate-400">Completed</p>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full bg-slate-700 h-2.5 rounded-full overflow-hidden">
                      <div
                        className="bg-gradient-to-r from-purple-500 to-indigo-500 h-full rounded-full transition-all"
                        style={{ width: `${c.progress_percentage}%` }}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs pt-1 border-t border-slate-700/60">
                      <div>
                        <span className="text-[10px] text-slate-400">Subtopics Completed</span>
                        <p className="font-semibold text-slate-200">
                          {c.completed_subtopics} / {c.total_subtopics}
                        </p>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400">Enrolled On</span>
                        <p className="font-semibold text-slate-200">
                          {new Date(c.enrolled_at).toLocaleDateString([], { dateStyle: 'medium' })}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: LIVE CLASS ATTENDANCE ("each student class they can see or not") */}
        {activeTab === 'live_classes' && (
          <div className="space-y-6">
            {/* Attendance Summary Banner */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 p-5 rounded-2xl bg-gradient-to-r from-emerald-950/40 via-slate-800 to-slate-800 border border-emerald-500/30 shadow-lg">
              <div>
                <span className="text-xs text-slate-400 font-medium">Total Live Classes</span>
                <p className="text-2xl font-black text-white mt-1">{liveClasses.summary.total}</p>
              </div>
              <div>
                <span className="text-xs text-slate-400 font-medium">Classes Attended</span>
                <p className="text-2xl font-black text-emerald-400 mt-1 flex items-center space-x-1.5">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                  <span>{liveClasses.summary.attended}</span>
                </p>
              </div>
              <div>
                <span className="text-xs text-slate-400 font-medium">Classes Absent</span>
                <p className="text-2xl font-black text-rose-400 mt-1 flex items-center space-x-1.5">
                  <XCircle className="w-5 h-5 text-rose-400" />
                  <span>{liveClasses.summary.absent}</span>
                </p>
              </div>
              <div>
                <span className="text-xs text-slate-400 font-medium">Attendance Rate</span>
                <p className="text-2xl font-black text-indigo-400 mt-1">{liveClasses.summary.attendanceRate}%</p>
              </div>
            </div>

            {/* Attendance Matrix Table */}
            <div className="bg-slate-800/80 rounded-2xl border border-slate-700/80 overflow-hidden shadow-xl">
              <div className="p-4 border-b border-slate-700/80 flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold text-white">Live Classes Attendance Log</h4>
                  <p className="text-xs text-slate-400">
                    Mentors can see for every scheduled class whether the student attended or was absent.
                  </p>
                </div>
              </div>

              {liveClasses.records.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-xs">
                  No live masterclasses scheduled yet in the institute.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-slate-700/80 bg-slate-800 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                        <th className="py-3 px-4">Live Class Title</th>
                        <th className="py-3 px-4">Instructor</th>
                        <th className="py-3 px-4">Scheduled Date & Time</th>
                        <th className="py-3 px-4">Session Status</th>
                        <th className="py-3 px-4">Attendance Status</th>
                        <th className="py-3 px-4">Session Duration</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-700/50">
                      {liveClasses.records.map((cls) => (
                        <tr
                          key={cls.live_class_id}
                          className="hover:bg-slate-700/30 transition-colors"
                        >
                          <td className="py-3.5 px-4 font-semibold text-white">
                            {cls.title}
                          </td>
                          <td className="py-3.5 px-4 text-slate-300">
                            {cls.instructor_name}
                          </td>
                          <td className="py-3.5 px-4 text-slate-300">
                            {new Date(cls.start_time).toLocaleString([], {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </td>
                          <td className="py-3.5 px-4">
                            <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-700 text-slate-300">
                              {cls.status}
                            </span>
                          </td>
                          <td className="py-3.5 px-4">
                            {cls.attended ? (
                              <div className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold text-[11px]">
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                                <span>Attended</span>
                              </div>
                            ) : (
                              <div className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30 font-bold text-[11px]">
                                <XCircle className="w-3.5 h-3.5 text-rose-400" />
                                <span>Absent / Did Not Join</span>
                              </div>
                            )}
                          </td>
                          <td className="py-3.5 px-4 text-slate-300">
                            {cls.attended && cls.duration_minutes ? (
                              <span className="font-medium text-slate-200">{cls.duration_minutes} mins attended</span>
                            ) : (
                              <span className="text-slate-400">-</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 3: LOGIN DAYS & ACTIVITY ("login days all of the option") */}
        {activeTab === 'login_days' && (
          <div className="space-y-6">
            {/* Login Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 p-5 rounded-2xl bg-gradient-to-r from-purple-950/40 via-slate-800 to-slate-800 border border-purple-500/30 shadow-lg">
              <div>
                <span className="text-xs text-slate-400 font-medium">Total Unique Login Days</span>
                <p className="text-2xl font-black text-purple-400 mt-1">
                  {loginActivity.summary.totalLoginDays} Days
                </p>
              </div>
              <div>
                <span className="text-xs text-slate-400 font-medium">Total Login Sessions</span>
                <p className="text-2xl font-black text-white mt-1">{loginActivity.summary.totalLogins}</p>
              </div>
              <div>
                <span className="text-xs text-slate-400 font-medium">Current Login Streak</span>
                <p className="text-2xl font-black text-amber-400 mt-1 flex items-center space-x-1.5">
                  <Flame className="w-6 h-6 text-amber-400 fill-amber-400" />
                  <span>{loginActivity.summary.currentStreakDays} Days</span>
                </p>
              </div>
              <div>
                <span className="text-xs text-slate-400 font-medium">Last Login Recorded</span>
                <p className="text-xs font-semibold text-slate-200 mt-1">
                  {loginActivity.summary.lastLoginAt
                    ? new Date(loginActivity.summary.lastLoginAt).toLocaleString([], {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })
                    : 'None'}
                </p>
              </div>
            </div>

            {/* Unique Login Dates Calendar Badges */}
            <div className="p-5 rounded-2xl bg-slate-800/80 border border-slate-700/80 space-y-3">
              <h4 className="text-sm font-bold text-white flex items-center space-x-2">
                <Calendar className="w-4 h-4 text-purple-400" />
                <span>Active Login Calendar Days ({loginActivity.uniqueDays.length} Days)</span>
              </h4>
              <p className="text-xs text-slate-400">
                All distinct calendar days this student logged into the platform:
              </p>
              <div className="flex flex-wrap gap-2 pt-2">
                {loginActivity.uniqueDays.map((d, idx) => (
                  <div
                    key={idx}
                    className="p-2.5 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center space-x-2"
                  >
                    <Calendar className="w-4 h-4 text-purple-400" />
                    <div>
                      <span className="text-xs font-bold text-white block">
                        {new Date(d.login_date).toLocaleDateString([], {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </span>
                      <span className="text-[10px] text-purple-300">
                        {d.login_count} session{d.login_count > 1 ? 's' : ''}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Detailed Login Log Audit Table */}
            <div className="bg-slate-800/80 rounded-2xl border border-slate-700/80 overflow-hidden shadow-xl">
              <div className="p-4 border-b border-slate-700/80">
                <h4 className="text-sm font-bold text-white">Full Login Activity Audit Trail</h4>
                <p className="text-xs text-slate-400">
                  Granular timestamp, IP address, and browser client metadata for each login event.
                </p>
              </div>

              {loginActivity.history.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-xs">No logins recorded yet.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-slate-700/80 bg-slate-800 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                        <th className="py-3 px-4">Login Timestamp</th>
                        <th className="py-3 px-4">Date</th>
                        <th className="py-3 px-4">Client IP Address</th>
                        <th className="py-3 px-4">Device & Browser</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-700/50">
                      {loginActivity.history.map((log) => (
                        <tr key={log.id} className="hover:bg-slate-700/30 transition-colors">
                          <td className="py-3 px-4 font-mono text-slate-200">
                            {new Date(log.login_at).toLocaleString([], {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                              second: '2-digit',
                            })}
                          </td>
                          <td className="py-3 px-4 text-purple-300 font-medium">{log.login_date}</td>
                          <td className="py-3 px-4 font-mono text-slate-400">{log.ip_address || '127.0.0.1'}</td>
                          <td className="py-3 px-4 text-slate-400 truncate max-w-xs">{log.user_agent}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 4: CODING SUBMISSIONS */}
        {activeTab === 'coding' && (
          <div className="bg-slate-800/80 rounded-2xl border border-slate-700/80 overflow-hidden shadow-xl space-y-4">
            <div className="p-4 border-b border-slate-700/80">
              <h4 className="text-sm font-bold text-white">Coding Challenges & Problem Submissions</h4>
              <p className="text-xs text-slate-400">
                Performance across automated test cases and execution benchmarks.
              </p>
            </div>

            {codingSubmissions.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs">
                Student has not submitted any code solutions yet.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-700/80 bg-slate-800 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                      <th className="py-3 px-4">Problem Title</th>
                      <th className="py-3 px-4">Language</th>
                      <th className="py-3 px-4">Status / Verdict</th>
                      <th className="py-3 px-4">Test Cases Passed</th>
                      <th className="py-3 px-4">Runtime (ms)</th>
                      <th className="py-3 px-4">Submitted At</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-700/50">
                    {codingSubmissions.map((sub) => (
                      <tr key={sub.id} className="hover:bg-slate-700/30 transition-colors">
                        <td className="py-3 px-4 font-semibold text-white">{sub.problem_title}</td>
                        <td className="py-3 px-4 uppercase font-mono text-indigo-300">{sub.language}</td>
                        <td className="py-3 px-4">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              sub.status === 'ACCEPTED'
                                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                            }`}
                          >
                            {sub.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-slate-200">
                          {sub.test_cases_passed} / {sub.total_test_cases}
                        </td>
                        <td className="py-3 px-4 font-mono text-slate-400">{sub.execution_time_ms} ms</td>
                        <td className="py-3 px-4 text-slate-400">
                          {new Date(sub.submitted_at).toLocaleString([], {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* TAB 5: MCQ TEST ATTEMPTS */}
        {activeTab === 'mcq' && (
          <div className="bg-slate-800/80 rounded-2xl border border-slate-700/80 overflow-hidden shadow-xl space-y-4">
            <div className="p-4 border-b border-slate-700/80">
              <h4 className="text-sm font-bold text-white">MCQ Quiz & Assessment Attempts</h4>
              <p className="text-xs text-slate-400">
                Evaluation results and concept test scores per subtopic.
              </p>
            </div>

            {mcqAttempts.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs">
                No MCQ assessments attempted by this student yet.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-700/80 bg-slate-800 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                      <th className="py-3 px-4">Subtopic / Topic</th>
                      <th className="py-3 px-4">Attempt #</th>
                      <th className="py-3 px-4">Score</th>
                      <th className="py-3 px-4">Percentage</th>
                      <th className="py-3 px-4">Result</th>
                      <th className="py-3 px-4">Attempted Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-700/50">
                    {mcqAttempts.map((test) => (
                      <tr key={test.id} className="hover:bg-slate-700/30 transition-colors">
                        <td className="py-3 px-4 font-semibold text-white">{test.subtopic_title}</td>
                        <td className="py-3 px-4 text-slate-400">Attempt {test.attempt_number}</td>
                        <td className="py-3 px-4 font-bold text-slate-200">
                          {test.score} / {test.total_questions}
                        </td>
                        <td className="py-3 px-4 font-bold text-indigo-400">{test.percentage}%</td>
                        <td className="py-3 px-4">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              test.passed
                                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                            }`}
                          >
                            {test.passed ? 'PASSED' : 'FAILED'}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-slate-400">
                          {new Date(test.created_at).toLocaleString([], {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* TAB 6: MENTOR GUIDANCE NOTES */}
        {activeTab === 'notes' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* New Note Form */}
            <div className="lg:col-span-1 p-5 rounded-2xl bg-slate-800/80 border border-slate-700/80 space-y-4 shadow-lg h-fit">
              <h4 className="text-sm font-bold text-white flex items-center space-x-2">
                <MessageSquare className="w-4 h-4 text-purple-400" />
                <span>Add Guidance Note</span>
              </h4>
              <p className="text-xs text-slate-400">
                Record feedback, intervention points, or guidance notes for this student.
              </p>

              {noteSuccess && (
                <div className="p-3 bg-emerald-950/40 border border-emerald-800/60 rounded-xl text-emerald-300 text-xs">
                  {noteSuccess}
                </div>
              )}

              <form onSubmit={handleAddNote} className="space-y-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                    Note Category Tag
                  </label>
                  <select
                    value={noteTag}
                    onChange={(e) => setNoteTag(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-purple-500"
                  >
                    <option value="Academic Guidance">Academic Guidance</option>
                    <option value="Attendance Warning">Attendance Warning</option>
                    <option value="Performance Commendation">Performance Commendation</option>
                    <option value="Doubt Resolution">Doubt Resolution</option>
                    <option value="Project Feedback">Project Feedback</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                    Observation & Guidance Details
                  </label>
                  <textarea
                    rows={4}
                    value={newNote}
                    onChange={(e) => setNewNote(e.target.value)}
                    placeholder="Enter actionable feedback for student..."
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-purple-500 resize-none"
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={submittingNote || !newNote.trim()}
                  className="w-full py-2.5 px-4 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center justify-center space-x-1.5"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{submittingNote ? 'Saving...' : 'Post Guidance Note'}</span>
                </button>
              </form>
            </div>

            {/* Past Notes Timeline */}
            <div className="lg:col-span-2 space-y-4">
              <h4 className="text-sm font-bold text-white flex items-center space-x-2">
                <FileCheck className="w-4 h-4 text-indigo-400" />
                <span>Mentor Guidance History ({mentorNotes.length})</span>
              </h4>

              {mentorNotes.length === 0 ? (
                <div className="p-8 text-center bg-slate-800/60 rounded-2xl border border-slate-700/60 text-slate-400 text-xs">
                  No guidance notes recorded for this student yet. Use the form to add the first note.
                </div>
              ) : (
                <div className="space-y-3">
                  {mentorNotes.map((note) => (
                    <div
                      key={note.id}
                      className="p-4 rounded-xl bg-slate-800/80 border border-slate-700/80 space-y-2 hover:border-purple-500/40 transition-all"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30">
                            {note.tag}
                          </span>
                          <span className="text-xs font-semibold text-slate-300">
                            By {note.author_name || 'Mentor'}
                          </span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className="text-[10px] text-slate-400">
                            {new Date(note.created_at).toLocaleDateString([], {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                            })}
                          </span>
                          {note.is_own_note && (
                            <button
                              onClick={() => handleDeleteNote(note.id)}
                              className="p-1 text-slate-400 hover:text-rose-400 transition-colors"
                              title="Delete note"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                      <p className="text-xs text-slate-200 leading-relaxed whitespace-pre-wrap">
                        {note.note}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
