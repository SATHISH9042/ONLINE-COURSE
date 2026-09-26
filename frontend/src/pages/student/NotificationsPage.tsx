import React from 'react';
import { Bell, CheckCircle2, Video, Info } from 'lucide-react';

export const NotificationsPage: React.FC = () => {
  const sampleNotifications = [
    {
      id: '1',
      title: 'Account Approved!',
      message: 'Welcome to the institute! Your account has been reviewed and approved. You now have full access to student courses.',
      time: 'Just now',
      type: 'SYSTEM',
    },
    {
      id: '2',
      title: 'New Live Class Scheduled',
      message: 'JavaScript Live Masterclass: Closures & Scope Chain is scheduled for Monday at 7:00 PM IST.',
      time: '2 hours ago',
      type: 'LIVE_CLASS',
    },
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <div className="border-b border-slate-200 pb-5">
        <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
          Notification Center
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Stay updated on course announcements, scheduled live webinars, and administrative notices.
        </p>
      </div>

      <div className="space-y-3 max-w-3xl">
        {sampleNotifications.map((n) => (
          <div
            key={n.id}
            className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-start space-x-4"
          >
            <div className="w-10 h-10 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center shrink-0">
              {n.type === 'LIVE_CLASS' ? <Video className="w-5 h-5" /> : <CheckCircle2 className="w-5 h-5 text-emerald-600" />}
            </div>
            <div className="flex-1 space-y-1">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-bold text-slate-900">{n.title}</h4>
                <span className="text-xs text-slate-400">{n.time}</span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">{n.message}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
