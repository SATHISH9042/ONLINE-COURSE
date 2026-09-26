import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { paymentService, CatalogCourseItem } from '../../services/paymentService';
import { Compass, BookOpen, Clock, Layers, CheckCircle2, ArrowRight, ShoppingCart, UserCheck, ShieldCheck } from 'lucide-react';

export const BrowseCoursesPage: React.FC = () => {
  const [courses, setCourses] = useState<CatalogCourseItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    async function loadCatalog() {
      setLoading(true);
      setError(null);
      const res = await paymentService.getCatalog();
      if (res.success && res.data) {
        setCourses(res.data);
      } else {
        setError(res.message || 'Failed to load course catalog.');
      }
      setLoading(false);
    }

    loadCatalog();
  }, []);

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="border-b border-slate-200 pb-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <Compass className="w-6 h-6 text-brand-600" />
            Browse Courses
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Discover premier engineering tracks, live masterclasses, and certified institute bootcamps.
          </p>
        </div>
      </div>

      {loading ? (
        <div className="py-20 flex justify-center items-center">
          <div className="w-8 h-8 border-4 border-brand-600 border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : error ? (
        <div className="bg-rose-50 border border-rose-200 rounded-2xl p-6 text-center text-rose-800 text-sm">
          {error}
        </div>
      ) : courses.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 border border-slate-200 text-center shadow-xs">
          <BookOpen className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-800">No courses currently available</h3>
          <p className="text-xs text-slate-500 mt-1">Please check back soon for newly published institute courses.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {courses.map((course) => (
            <div
              key={course.id}
              className="bg-white rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-lg transition-all duration-300 flex flex-col justify-between overflow-hidden group"
            >
              {/* Thumbnail */}
              <div className="relative aspect-video bg-slate-100 overflow-hidden">
                <img
                  src={
                    course.thumbnailUrl ||
                    'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=600&q=80'
                  }
                  alt={course.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute top-3 right-3">
                  <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-slate-900/80 backdrop-blur-md text-white">
                    ₹{course.price.toLocaleString('en-IN')}
                  </span>
                </div>
              </div>

              {/* Body */}
              <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                <div className="space-y-2">
                  <div className="text-xs font-semibold text-brand-600 uppercase tracking-wider">
                    {course.instructorName}
                  </div>
                  <h3 className="text-base font-bold text-slate-900 leading-snug line-clamp-2">
                    {course.title}
                  </h3>
                  <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                    {course.shortDescription}
                  </p>
                </div>

                {/* Course Metadata (Section 9) */}
                <div className="pt-3 border-t border-slate-100 space-y-3">
                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <span className="flex items-center">
                      <Clock className="w-3.5 h-3.5 mr-1 text-slate-400" />
                      {course.durationHours} hrs
                    </span>
                    <span className="flex items-center">
                      <Layers className="w-3.5 h-3.5 mr-1 text-slate-400" />
                      {course.topicCount} Topics
                    </span>
                    <span className="font-extrabold text-slate-900 text-sm">
                      ₹{course.price.toLocaleString('en-IN')}
                    </span>
                  </div>

                  {/* Section 9: Purchased vs Buy Now Button */}
                  {course.isEnrolled ? (
                    <button
                      onClick={() => navigate(`/student/courses/${course.id}/learn`)}
                      className="w-full py-2.5 px-4 rounded-xl text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 transition-colors flex items-center justify-center gap-1.5 shadow-xs"
                    >
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      Purchased &mdash; Continue Learning
                    </button>
                  ) : (
                    <button
                      onClick={() => navigate(`/student/courses/${course.id}/checkout`)}
                      className="w-full py-2.5 px-4 rounded-xl text-xs font-bold text-white bg-brand-600 hover:bg-brand-700 transition-colors flex items-center justify-center gap-1.5 shadow-sm shadow-brand-600/20"
                    >
                      <ShoppingCart className="w-4 h-4" />
                      Buy Now &rarr;
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
