import React from 'react';
import { Video, Calendar, Clock, ExternalLink } from 'lucide-react';

export const LiveClassesPage: React.FC = () => {
  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <div className="border-b border-slate-200 pb-5">
        <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
          Live Classes & Webinars
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Attend live lectures with instructors, ask questions in real-time, and watch past recordings.
        </p>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4 max-w-2xl">
        <div className="flex items-center justify-between">
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200">
            <span className="w-1.5 h-1.5 mr-1.5 rounded-full bg-amber-500 animate-ping"></span>
            UPCOMING LIVE SESSION
          </span>
          <span className="text-xs text-slate-500 font-semibold">Full Stack Web Development</span>
        </div>

        <div>
          <h3 className="text-lg font-bold text-slate-900">
            JavaScript Live Masterclass: Closures & Scope Chain
          </h3>
          <p className="text-xs text-slate-600 mt-1 leading-relaxed">
            Interactive live coding session deep-diving into execution contexts, closures, lexical environments, and memory optimization.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 pt-2 border-t border-slate-100">
          <div className="flex items-center">
            <Calendar className="w-3.5 h-3.5 mr-1 text-slate-400" />
            <span>Mon, 7:00 PM – 8:30 PM IST</span>
          </div>
          <div>
            <span>Instructor: <strong className="text-slate-700">Dr. Rajesh Verma</strong></span>
          </div>
        </div>

        <div className="pt-2">
          <a
            href="https://meet.jit.si/ApexInstitute_JS_Live_Masterclass"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-slate-900 hover:bg-brand-600 transition-colors shadow-sm"
          >
            <Video className="w-3.5 h-3.5 mr-2" />
            Join Class
            <ExternalLink className="w-3.5 h-3.5 ml-1.5 opacity-70" />
          </a>
        </div>
      </div>
    </div>
  );
};
