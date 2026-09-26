import React from 'react';
import { Compass, Sparkles, BookOpen, Clock, Layers } from 'lucide-react';

export const BrowseCoursesPage: React.FC = () => {
  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <div className="border-b border-slate-200 pb-5">
        <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
          Browse Courses
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Explore institute curricula, technical certifications, and live interactive bootcamps.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs flex flex-col justify-between space-y-4">
          <div className="space-y-3">
            <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-brand-50 text-brand-700">
              Web Development
            </span>
            <h3 className="text-xl font-bold text-slate-900">Full Stack Web Development</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Master React, Node.js, Express, and PostgreSQL with real-world industry projects.
            </p>
            <div className="flex items-center space-x-4 text-xs text-slate-500 pt-2">
              <span className="flex items-center">
                <Clock className="w-3.5 h-3.5 mr-1 text-slate-400" /> 120 hrs
              </span>
              <span className="flex items-center">
                <Layers className="w-3.5 h-3.5 mr-1 text-slate-400" /> 2 Topics
              </span>
              <span className="font-bold text-slate-900 text-sm">₹9,999</span>
            </div>
          </div>
          <div>
            <span className="inline-flex items-center px-4 py-2 rounded-xl text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200">
              ✓ Enrolled in My Courses
            </span>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs flex flex-col justify-between space-y-4">
          <div className="space-y-3">
            <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-purple-50 text-purple-700">
              Enterprise Java
            </span>
            <h3 className="text-xl font-bold text-slate-900">Java Full Stack Development</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Enterprise backend architecture with Spring Boot, Hibernate, microservices, and React.
            </p>
            <div className="flex items-center space-x-4 text-xs text-slate-500 pt-2">
              <span className="flex items-center">
                <Clock className="w-3.5 h-3.5 mr-1 text-slate-400" /> 150 hrs
              </span>
              <span className="flex items-center">
                <Layers className="w-3.5 h-3.5 mr-1 text-slate-400" /> 2 Topics
              </span>
              <span className="font-bold text-slate-900 text-sm">₹14,999</span>
            </div>
          </div>
          <div>
            <button
              onClick={() => alert('Razorpay Checkout & QR Payment gateway will be activated in Phase 5!')}
              className="inline-flex items-center px-4 py-2 rounded-xl text-xs font-bold text-white bg-brand-600 hover:bg-brand-700 shadow-sm"
            >
              Buy Now (Razorpay / QR) &rarr;
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
