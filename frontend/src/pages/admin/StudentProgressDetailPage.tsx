import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ArrowLeft,
  User,
  BookOpen,
  CheckCircle2,
  Code2,
  HelpCircle,
  Clock,
  Calendar,
  Award,
  AlertCircle,
  ExternalLink,
} from 'lucide-react';
import {
  adminAnalyticsService,
  StudentProgressData,
} from '../../services/adminAnalyticsService';

export const StudentProgressDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<StudentProgressData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    const fetchProgress = async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await adminAnalyticsService.getStudentProgress(id);
        setData(res);
      } catch (err: any) {
        console.error('Failed to load student progress:', err);
        setError(err.message || 'Failed to load student progress details.');
      } finally {
        setLoading(false);
      }
    };

    fetchProgress();
  }, [id]);

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-8 space-y-6 animate-pulse">
        <div className="h-6 bg-slate-200 rounded w-32"></div>
        <div className="h-40 bg-slate-200 rounded-3xl"></div>
        <div className="h-64 bg-slate-200 rounded-3xl"></div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-8 space-y-4">
        <Link
          to="/admin/students"
          className="inline-flex items-center text-xs font-bold text-slate-500 hover:text-slate-900"
        >
          <ArrowLeft className="w-4 h-4 mr-1" />
          Back to Students Directory
        </Link>
        <div className="bg-red-50 border border-red-200 text-red-700 p-6 rounded-2xl text-xs">
          {error || 'Student not found.'}
        </div>
      </div>
    );
  }

  const { student, courses, codingStats, mcqStats } = data;

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-in fade-in duration-200">
      {/* Back button */}
      <div>
        <Link
          to="/admin/students"
          className="inline-flex items-center text-xs font-bold text-slate-500 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft className="w-4 h-4 mr-1.5" />
          Back to All Students Directory
        </Link>
      </div>

      {/* 1. STUDENT PROFILE SUMMARY CARD */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center space-x-4">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-brand-600 to-indigo-600 text-white font-extrabold text-2xl flex items-center justify-center shadow-md">
            {student.name ? student.name.charAt(0).toUpperCase() : 'S'}
          </div>
          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <h1 className="text-xl font-extrabold text-slate-900">{student.name}</h1>
              <span
                className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full ${
                  student.status === 'ACTIVE'
                    ? 'bg-emerald-100 text-emerald-800'
                    : student.status === 'PENDING_APPROVAL'
                    ? 'bg-amber-100 text-amber-800'
                    : 'bg-rose-100 text-rose-800'
                }`}
              >
                {student.status}
              </span>
            </div>
            <p className="text-xs text-slate-500 font-medium">
              Phone: {student.phone} • Email: {student.email || 'No email provided'}
            </p>
            {student.city && (
              <p className="text-xs text-slate-400">
                Location: {student.city}, {student.state}
              </p>
            )}
          </div>
        </div>

        <div className="text-xs text-slate-400 border-t md:border-t-0 md:border-l border-slate-100 pt-4 md:pt-0 md:pl-6 space-y-1">
          <div>Enrolled Courses: <strong className="text-slate-900">{courses.length}</strong></div>
          <div>Registered: <strong className="text-slate-900">{new Date(student.registeredAt).toLocaleDateString()}</strong></div>
        </div>
      </div>

      {/* 2. TELEMETRY CARDS (CODING & MCQS) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Course Enrollments */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold">Active Enrollments</span>
            <BookOpen className="w-4 h-4 text-brand-600" />
          </div>
          <div className="text-2xl font-black text-slate-900">{courses.length}</div>
          <span className="text-[11px] text-slate-400">Curricula in progress</span>
        </div>

        {/* Coding Telemetry */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold">Coding Practice</span>
            <Code2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-black text-slate-900">
            {codingStats.acceptedSubmissions} / {codingStats.totalSubmissions}
          </div>
          <span className="text-[11px] text-emerald-600 font-semibold">
            {codingStats.avgScore}% Average Test Score
          </span>
        </div>

        {/* MCQ Telemetry */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold">MCQ Assessments</span>
            <HelpCircle className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="text-2xl font-black text-slate-900">
            {mcqStats.passedAttempts} / {mcqStats.totalAttempts}
          </div>
          <span className="text-[11px] text-indigo-600 font-semibold">
            {mcqStats.avgScore}% Average Quiz Score
          </span>
        </div>
      </div>

      {/* 3. ENROLLED COURSES & PROGRESS BARS */}
      <div className="space-y-4">
        <div className="flex items-center justify-between border-b border-slate-200 pb-3">
          <h2 className="text-base font-bold text-slate-900">
            Enrolled Course Progress & Telemetry (Section 32)
          </h2>
          <span className="text-xs text-slate-500">{courses.length} courses</span>
        </div>

        {courses.length === 0 ? (
          <div className="bg-white rounded-3xl border border-slate-200 p-8 text-center text-xs text-slate-500">
            This student has not enrolled in any courses yet.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {courses.map((c) => (
              <div
                key={c.enrollmentId}
                className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs flex flex-col justify-between space-y-5"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-500">
                      Instructor: {c.instructorName}
                    </span>
                    <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                      {c.enrollmentStatus}
                    </span>
                  </div>

                  <h3 className="text-base font-bold text-slate-900 mt-2">{c.courseTitle}</h3>

                  {/* Progress Bar */}
                  <div className="mt-4 space-y-1.5">
                    <div className="flex items-center justify-between text-xs font-bold">
                      <span className="text-slate-700">Course Progress</span>
                      <span className="text-brand-600">{c.progressPercent}%</span>
                    </div>
                    <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-brand-600 to-indigo-600 rounded-full transition-all duration-500"
                        style={{ width: `${c.progressPercent}%` }}
                      ></div>
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
                      <span>{c.completedSubtopics} / {c.totalSubtopics} lessons completed</span>
                      <span>Enrolled: {new Date(c.enrolledAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>

                <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 text-xs space-y-1">
                  <div className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider">
                    Last Accessed Activity:
                  </div>
                  <div className="font-bold text-slate-800 truncate">
                    {c.lastAccessedLesson}
                  </div>
                  {c.lastAccessedAt && (
                    <div className="text-[11px] text-slate-500 flex items-center">
                      <Clock className="w-3 h-3 mr-1 text-slate-400" />
                      {new Date(c.lastAccessedAt).toLocaleString()}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
