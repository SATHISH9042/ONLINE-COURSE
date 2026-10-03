import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { mentorService, MentorDashboardData } from '../../services/mentorService';
import {
  Users,
  GraduationCap,
  Video,
  Clock,
  Activity,
  ArrowRight,
  Search,
  Sparkles,
  Calendar,
  CheckCircle,
  AlertCircle,
  Code2,
} from 'lucide-react';

export const MentorDashboardPage: React.FC = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<MentorDashboardData | null>(null);
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchDashboard();
  }, []);

  const fetchDashboard = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await mentorService.getDashboard();
      if (res.success && res.data) {
        setData(res.data);
      } else {
        setError(res.message || 'Failed to load mentor dashboard data.');
      }
    } catch (err: any) {
      setError(err.message || 'Error connecting to server.');
    } finally {
      setLoading(false);
    }
  };

  const filteredStudents = data?.assignedStudents?.filter((s) => {
    if (!search.trim()) return true;
    const term = search.toLowerCase();
    return (
      s.full_name?.toLowerCase().includes(term) ||
      s.email?.toLowerCase().includes(term) ||
      s.phone?.includes(term)
    );
  }) || [];

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-[500px]">
        <div className="flex flex-col items-center space-y-3">
          <div className="w-10 h-10 border-4 border-purple-500/20 border-t-purple-500 rounded-full animate-spin"></div>
          <p className="text-sm text-slate-400 font-medium">Loading mentor workspace...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8">
        <div className="p-4 bg-rose-950/40 border border-rose-800/60 rounded-xl text-rose-300 text-sm flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
            <span>{error}</span>
          </div>
          <button
            onClick={fetchDashboard}
            className="px-3 py-1 bg-rose-800/60 hover:bg-rose-700/60 text-white rounded text-xs font-semibold"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const stats = data?.stats || {
    totalStudents: 0,
    activeStudents7Days: 0,
    avgCourseProgress: 0,
    totalClassesAttended: 0,
    totalLiveClasses: 0,
    avgAttendanceRate: 0,
  };

  return (
    <div className="p-6 md:p-8 space-y-8 max-w-7xl mx-auto w-full">
      {/* Welcome Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-purple-900/60 via-indigo-900/40 to-slate-800/80 border border-purple-500/30 p-6 md:p-8 shadow-xl">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-purple-500/20 border border-purple-500/30 text-purple-300 text-xs font-semibold">
              <Sparkles className="w-3.5 h-3.5 text-purple-400" />
              <span>Dedicated Mentor Portal</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">
              Welcome back, {user?.fullName || 'Mentor'}
            </h1>
            <p className="text-sm text-slate-300 max-w-2xl">
              Track student login days, live class attendance, syllabus progress, and coding submissions for all your assigned students.
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <Link
              to="/mentor/students"
              className="inline-flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-medium text-sm shadow-lg shadow-purple-600/30 transition-all"
            >
              <Users className="w-4 h-4" />
              <span>View All Assigned Students ({stats.totalStudents})</span>
            </Link>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        {/* Card 1: Assigned Students */}
        <div className="p-5 rounded-xl bg-slate-800/90 border border-slate-700/80 shadow-lg relative overflow-hidden group hover:border-purple-500/50 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Assigned Students</span>
            <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline space-x-2">
            <span className="text-3xl font-black text-white">{stats.totalStudents}</span>
            <span className="text-xs text-purple-400 font-medium">Assigned by Admin</span>
          </div>
          <p className="mt-1 text-xs text-slate-400">Under your active academic mentorship</p>
        </div>

        {/* Card 2: Average Course Progress */}
        <div className="p-5 rounded-xl bg-slate-800/90 border border-slate-700/80 shadow-lg relative overflow-hidden group hover:border-indigo-500/50 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Avg. Course Progress</span>
            <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <GraduationCap className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline space-x-2">
            <span className="text-3xl font-black text-white">{stats.avgCourseProgress}%</span>
            <span className="text-xs text-indigo-400 font-medium">Overall syllabus</span>
          </div>
          <div className="mt-2 w-full bg-slate-700 h-1.5 rounded-full overflow-hidden">
            <div
              className="bg-indigo-500 h-full rounded-full transition-all"
              style={{ width: `${Math.min(stats.avgCourseProgress, 100)}%` }}
            />
          </div>
        </div>

        {/* Card 3: Live Class Attendance Rate */}
        <div className="p-5 rounded-xl bg-slate-800/90 border border-slate-700/80 shadow-lg relative overflow-hidden group hover:border-emerald-500/50 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Live Class Attendance</span>
            <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <Video className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline space-x-2">
            <span className="text-3xl font-black text-white">{stats.avgAttendanceRate}%</span>
            <span className="text-xs text-emerald-400 font-medium">
              {stats.totalClassesAttended} attended
            </span>
          </div>
          <p className="mt-1 text-xs text-slate-400">Students attending live lectures</p>
        </div>

        {/* Card 4: Active in Past 7 Days */}
        <div className="p-5 rounded-xl bg-slate-800/90 border border-slate-700/80 shadow-lg relative overflow-hidden group hover:border-amber-500/50 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Active (7 Days)</span>
            <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <Activity className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline space-x-2">
            <span className="text-3xl font-black text-white">{stats.activeStudents7Days}</span>
            <span className="text-xs text-amber-400 font-medium">of {stats.totalStudents} students</span>
          </div>
          <p className="mt-1 text-xs text-slate-400">Logged into platform this week</p>
        </div>
      </div>

      {/* Main Grid: Assigned Students Showcase & Activity Stream */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Assigned Students Quick Audit List (2 Cols) */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-white flex items-center space-x-2">
                <Users className="w-5 h-5 text-purple-400" />
                <span>Your Assigned Students</span>
              </h2>
              <p className="text-xs text-slate-400">
                Click on any student to inspect login days, live class attendance, and course progress.
              </p>
            </div>
            {/* Search Input */}
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search students..."
                className="w-full pl-9 pr-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-xs text-white placeholder-slate-400 focus:outline-none focus:border-purple-500"
              />
            </div>
          </div>

          {filteredStudents.length === 0 ? (
            <div className="p-8 text-center bg-slate-800/60 rounded-xl border border-slate-700/60 text-slate-400 text-sm">
              {data?.assignedStudents?.length === 0
                ? 'No students have been assigned to you by administrators yet.'
                : 'No matching students found for your search query.'}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredStudents.map((student) => (
                <div
                  key={student.id}
                  className="p-4 rounded-xl bg-slate-800/80 border border-slate-700/80 hover:border-purple-500/50 transition-all flex flex-col justify-between space-y-4 group"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-purple-600 to-indigo-600 text-white font-bold flex items-center justify-center text-sm shadow-md">
                          {student.full_name?.charAt(0) || 'S'}
                        </div>
                        <div>
                          <h3 className="font-semibold text-white text-sm group-hover:text-purple-300 transition-colors">
                            {student.full_name}
                          </h3>
                          <p className="text-xs text-slate-400">{student.email || student.phone}</p>
                        </div>
                      </div>
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        {student.status}
                      </span>
                    </div>

                    {/* Progress Bar */}
                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-slate-400">Course Progress</span>
                        <span className="text-indigo-400 font-semibold">{student.avg_progress_pct || 0}%</span>
                      </div>
                      <div className="w-full bg-slate-700 h-1.5 rounded-full overflow-hidden">
                        <div
                          className="bg-indigo-500 h-full rounded-full"
                          style={{ width: `${student.avg_progress_pct || 0}%` }}
                        />
                      </div>
                    </div>

                    {/* Quick Badges: Login Days & Live Attendance */}
                    <div className="grid grid-cols-2 gap-2 pt-1 text-xs">
                      <div className="p-2 rounded-lg bg-slate-900/60 border border-slate-700/60 flex items-center space-x-2">
                        <Calendar className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                        <div>
                          <p className="text-[10px] text-slate-400">Login Days</p>
                          <p className="font-bold text-white">{student.total_login_days || 0} Days</p>
                        </div>
                      </div>
                      <div className="p-2 rounded-lg bg-slate-900/60 border border-slate-700/60 flex items-center space-x-2">
                        <Video className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        <div>
                          <p className="text-[10px] text-slate-400">Live Classes</p>
                          <p className="font-bold text-white">{student.live_classes_attended || 0} Attended</p>
                        </div>
                      </div>
                    </div>

                    {student.admin_assignment_notes && (
                      <p className="text-[11px] text-slate-400 italic line-clamp-1">
                        &ldquo;{student.admin_assignment_notes}&rdquo;
                      </p>
                    )}
                  </div>

                  <Link
                    to={`/mentor/students/${student.id}`}
                    className="w-full py-2 px-3 rounded-lg bg-slate-700/60 hover:bg-purple-600 text-slate-200 hover:text-white text-xs font-semibold transition-all flex items-center justify-center space-x-1.5"
                  >
                    <span>Full Student Audit</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right Column: Real-Time Activity Feed */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-white flex items-center space-x-2">
              <Activity className="w-5 h-5 text-indigo-400" />
              <span>Recent Activity Feed</span>
            </h2>
            <span className="text-xs text-slate-400">Live updates</span>
          </div>

          <div className="p-4 rounded-xl bg-slate-800/80 border border-slate-700/80 space-y-4">
            {(!data?.recentActivity || data.recentActivity.length === 0) ? (
              <p className="text-xs text-slate-400 text-center py-6">
                No recent activity logged from assigned students yet.
              </p>
            ) : (
              <div className="space-y-3">
                {data.recentActivity.map((act, idx) => (
                  <div
                    key={idx}
                    className="flex items-start space-x-3 pb-3 border-b border-slate-700/50 last:border-b-0 last:pb-0"
                  >
                    <div
                      className={`p-2 rounded-lg shrink-0 ${
                        act.activity_type === 'LOGIN'
                          ? 'bg-purple-500/10 text-purple-400'
                          : 'bg-indigo-500/10 text-indigo-400'
                      }`}
                    >
                      {act.activity_type === 'LOGIN' ? (
                        <Calendar className="w-4 h-4" />
                      ) : (
                        <Code2 className="w-4 h-4" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between">
                        <Link
                          to={`/mentor/students/${act.student_id}`}
                          className="text-xs font-semibold text-white hover:text-purple-300 truncate"
                        >
                          {act.student_name}
                        </Link>
                        <span className="text-[10px] text-slate-400">
                          {new Date(act.timestamp).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-300 mt-0.5 truncate">{act.description}</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">
                        {new Date(act.timestamp).toLocaleDateString([], {
                          month: 'short',
                          day: 'numeric',
                        })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
