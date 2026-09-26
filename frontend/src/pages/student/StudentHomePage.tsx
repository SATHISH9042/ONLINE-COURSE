import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { studentService, DashboardSummaryData } from '../../services/studentService';
import {
  Play,
  BookOpen,
  Calendar,
  Award,
  ArrowRight,
  Clock,
  Video,
  CheckCircle2,
  RefreshCw,
  Compass,
} from 'lucide-react';

export const StudentHomePage: React.FC = () => {
  const { user } = useAuth();
  const [data, setData] = useState<DashboardSummaryData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchDashboard = async () => {
    setLoading(true);
    try {
      const res = await studentService.getDashboardSummary();
      if (res.success && res.data) {
        setData(res.data);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 animate-spin text-brand-600 mx-auto mb-3" />
          <p className="text-sm font-semibold text-slate-600">Loading your learning space...</p>
        </div>
      </div>
    );
  }

  const continueItem = data?.continueLearning;
  const enrolledCourses = data?.enrolledCourses || [];
  const upcomingClasses = data?.upcomingLiveClasses || [];
  const stats = data?.stats || {
    enrolledCoursesCount: 0,
    completedLessonsCount: 0,
    totalLessonsCount: 0,
    overallProgressPercent: 0,
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      {/* Welcome Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Welcome back, {user?.fullName?.split(' ')[0]}! 👋
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Pick up where you left off and keep your learning streak going strong.
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <Link
            to="/student/browse"
            className="inline-flex items-center px-4 py-2 rounded-xl text-sm font-semibold text-brand-700 bg-brand-50 hover:bg-brand-100 transition-colors"
          >
            <Compass className="w-4 h-4 mr-2" />
            Explore New Courses
          </Link>
        </div>
      </div>

      {/* SECTION 7: CONTINUE LEARNING CARD */}
      {continueItem ? (
        <div className="bg-gradient-to-r from-slate-900 via-brand-950 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl shadow-slate-900/10 border border-slate-800 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-96 h-96 bg-brand-600/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20"></div>

          <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div className="max-w-xl space-y-3">
              <div className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-brand-500/20 text-brand-300 border border-brand-500/30">
                <Play className="w-3 h-3 mr-1.5 fill-current" />
                Continue Learning
              </div>

              <div>
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
                  {continueItem.courseTitle}
                </span>
                <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight mt-1">
                  {continueItem.subtopicTitle}
                </h2>
                <p className="text-sm text-brand-200 mt-0.5">
                  Topic: <span className="font-semibold text-white">{continueItem.topicTitle}</span>
                </p>
              </div>

              {/* Progress indicator */}
              <div className="space-y-1.5 max-w-md pt-2">
                <div className="flex justify-between text-xs font-semibold">
                  <span className="text-slate-300">Course Progress</span>
                  <span className="text-brand-400 font-bold">{continueItem.progressPercent}%</span>
                </div>
                <div className="w-full h-2.5 bg-slate-800 rounded-full overflow-hidden border border-slate-700/50">
                  <div
                    className="h-full bg-gradient-to-r from-brand-500 to-emerald-400 rounded-full transition-all duration-500"
                    style={{ width: `${Math.max(continueItem.progressPercent, 5)}%` }}
                  ></div>
                </div>
              </div>
            </div>

            <div className="flex sm:shrink-0 items-center">
              <Link
                to={`/student/courses/${continueItem.courseId}/learn`}
                className="w-full sm:w-auto inline-flex items-center justify-center px-6 py-3.5 rounded-2xl text-sm font-bold text-slate-900 bg-brand-400 hover:bg-brand-300 shadow-lg shadow-brand-400/25 transition-all hover:scale-[1.02] active:scale-[0.98]"
              >
                <Play className="w-4 h-4 mr-2 fill-current" />
                Continue Learning
              </Link>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm text-center">
          <BookOpen className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-lg font-bold text-slate-800">Ready to start your journey?</h3>
          <p className="text-sm text-slate-500 max-w-md mx-auto mt-1 mb-4">
            You do not have any enrolled courses in progress. Browse our institute catalogue to enroll!
          </p>
          <Link
            to="/student/browse"
            className="inline-flex items-center px-5 py-2.5 rounded-xl text-sm font-bold text-white bg-brand-600 hover:bg-brand-700 shadow-md shadow-brand-600/20"
          >
            Browse Courses <ArrowRight className="w-4 h-4 ml-2" />
          </Link>
        </div>
      )}

      {/* Quick Metrics Bar */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Enrolled Courses
            </span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-brand-600 flex items-center justify-center">
              <BookOpen className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-2">
            {stats.enrolledCoursesCount}
          </p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Lessons Done
            </span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-2">
            {stats.completedLessonsCount}{' '}
            <span className="text-xs font-medium text-slate-400">/ {stats.totalLessonsCount}</span>
          </p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Overall Progress
            </span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <Award className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-2">
            {stats.overallProgressPercent}%
          </p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Live Sessions
            </span>
            <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
              <Video className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-2">
            {upcomingClasses.length}
          </p>
        </div>
      </div>

      {/* Grid: Recently Accessed Courses + Upcoming Live Classes */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Recently Accessed Courses (2 cols) */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-bold text-slate-900">Recently Enrolled Courses</h3>
            <Link
              to="/student/my-courses"
              className="text-xs font-bold text-brand-600 hover:text-brand-700"
            >
              View All ({enrolledCourses.length}) &rarr;
            </Link>
          </div>

          <div className="space-y-4">
            {enrolledCourses.map((c) => (
              <div
                key={c.id}
                className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs hover:shadow-md transition-shadow flex flex-col sm:flex-row gap-5 items-center"
              >
                <img
                  src={c.thumbnail_url}
                  alt={c.title}
                  className="w-full sm:w-36 h-24 object-cover rounded-xl shrink-0 border border-slate-100"
                />
                <div className="flex-1 min-w-0 space-y-2 w-full">
                  <div>
                    <h4 className="text-base font-bold text-slate-900 truncate">{c.title}</h4>
                    <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">
                      Instructor: {c.instructor_name} • {c.duration_hours}h total
                    </p>
                  </div>

                  {/* Progress bar */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs text-slate-600 font-medium">
                      <span>{c.completed_subtopics} of {c.total_subtopics} lessons</span>
                      <span className="font-bold text-brand-600">{c.progress_percent}%</span>
                    </div>
                    <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-brand-600 rounded-full"
                        style={{ width: `${c.progress_percent}%` }}
                      ></div>
                    </div>
                  </div>
                </div>

                <Link
                  to={`/student/courses/${c.id}/learn`}
                  className="w-full sm:w-auto px-4 py-2 rounded-xl text-xs font-bold text-slate-700 bg-slate-100 hover:bg-brand-50 hover:text-brand-700 transition-colors shrink-0 text-center"
                >
                  Continue
                </Link>
              </div>
            ))}
          </div>
        </div>

        {/* Right Column: Upcoming Live Classes */}
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-bold text-slate-900">Upcoming Live Classes</h3>
            <Link
              to="/student/live-classes"
              className="text-xs font-bold text-brand-600 hover:text-brand-700"
            >
              Calendar &rarr;
            </Link>
          </div>

          <div className="space-y-4">
            {upcomingClasses.length === 0 ? (
              <div className="bg-white p-6 rounded-2xl border border-slate-200 text-center text-slate-500 text-sm">
                <Calendar className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                No live classes scheduled for this week.
              </div>
            ) : (
              upcomingClasses.map((cls) => (
                <div
                  key={cls.id}
                  className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-3"
                >
                  <div className="flex items-center space-x-2 text-xs font-bold text-brand-600">
                    <Video className="w-3.5 h-3.5" />
                    <span>{cls.course_title || 'Webinar'}</span>
                  </div>

                  <h4 className="text-sm font-bold text-slate-900 leading-snug">{cls.title}</h4>

                  <div className="flex items-center text-xs text-slate-500 space-x-2">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    <span>
                      {new Date(cls.start_time).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>

                  <a
                    href={cls.meeting_link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block w-full text-center py-2 rounded-xl text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 transition-colors"
                  >
                    Join Class
                  </a>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
