import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { studentService, EnrolledCourseItem } from '../../services/studentService';
import { BookOpen, Play, CheckCircle2, Clock, RefreshCw, ArrowRight, Layers } from 'lucide-react';

export const MyCoursesPage: React.FC = () => {
  const [courses, setCourses] = useState<EnrolledCourseItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchCourses = async () => {
    setLoading(true);
    try {
      const res = await studentService.getMyCourses();
      if (res.success && res.data) {
        setCourses(res.data);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCourses();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <RefreshCw className="w-8 h-8 animate-spin text-brand-600 mx-auto" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            My Courses
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            All programs and courses assigned to your student account.
          </p>
        </div>
        <div>
          <Link
            to="/student/browse"
            className="inline-flex items-center px-4 py-2 rounded-xl text-sm font-semibold text-white bg-brand-600 hover:bg-brand-700 shadow-sm"
          >
            Browse More Courses
            <ArrowRight className="w-4 h-4 ml-1.5" />
          </Link>
        </div>
      </div>

      {courses.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 shadow-sm max-w-lg mx-auto my-8">
          <div className="w-16 h-16 rounded-2xl bg-brand-50 text-brand-600 flex items-center justify-center mx-auto mb-4">
            <BookOpen className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-slate-900">No Purchased Courses Found</h3>
          <p className="text-sm text-slate-500 mt-1 mb-6">
            You do not own any courses yet. Explore our curriculum to enroll and get started immediately.
          </p>
          <Link
            to="/student/browse"
            className="inline-flex items-center px-5 py-2.5 rounded-xl text-sm font-bold text-white bg-brand-600 hover:bg-brand-700 shadow-md shadow-brand-600/20"
          >
            Browse Course Catalog
          </Link>
        </div>
      ) : (
        /* SECTION 8: COURSE CARDS GRID */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {courses.map((course) => (
            <div
              key={course.id}
              className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs hover:shadow-lg transition-all duration-200 flex flex-col group"
            >
              {/* Course Thumbnail Image */}
              <div className="relative h-48 w-full overflow-hidden bg-slate-100">
                <img
                  src={course.thumbnailUrl}
                  alt={course.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <div className="absolute top-3 right-3 px-2.5 py-1 rounded-full text-xs font-bold bg-slate-900/80 text-white backdrop-blur-xs">
                  {course.durationHours} hrs
                </div>
              </div>

              {/* Course Details */}
              <div className="p-6 flex-1 flex flex-col justify-between space-y-4">
                <div className="space-y-2">
                  <div className="text-xs font-semibold text-brand-600 uppercase tracking-wider">
                    {course.instructorName}
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 leading-snug group-hover:text-brand-600 transition-colors">
                    {course.title}
                  </h3>
                  <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                    {course.shortDescription}
                  </p>
                </div>

                {/* Section 8: Progress and Lessons */}
                <div className="space-y-3 pt-2 border-t border-slate-100">
                  <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
                    <span className="flex items-center">
                      <Layers className="w-3.5 h-3.5 mr-1 text-slate-400" />
                      {course.completedSubtopics} / {course.totalSubtopics} lessons completed
                    </span>
                    <span className="font-bold text-brand-600">{course.progressPercent}%</span>
                  </div>

                  {/* Progress bar */}
                  <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-brand-600 rounded-full transition-all duration-300"
                      style={{ width: `${course.progressPercent}%` }}
                    ></div>
                  </div>

                  {/* Last Accessed Lesson */}
                  <div className="flex items-center text-xs text-slate-500 pt-1">
                    <Clock className="w-3.5 h-3.5 mr-1.5 text-slate-400 shrink-0" />
                    <span className="truncate">
                      Last: <span className="font-medium text-slate-700">{course.lastAccessedLesson}</span>
                    </span>
                  </div>

                  {/* Continue Button */}
                  <div className="pt-2">
                    <button
                      onClick={() => alert(`Starting Course: ${course.title}\n(Learning Player will open in Phase 4)`)}
                      className="w-full flex items-center justify-center py-2.5 px-4 rounded-xl text-xs font-bold text-white bg-slate-900 hover:bg-brand-600 transition-colors shadow-sm"
                    >
                      <Play className="w-3.5 h-3.5 mr-1.5 fill-current" />
                      Continue Course
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
