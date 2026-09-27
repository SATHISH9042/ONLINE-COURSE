import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Users,
  Clock,
  BookOpen,
  IndianRupee,
  TrendingUp,
  Video,
  Activity,
  ArrowRight,
  ShieldCheck,
  Server,
  Cpu,
  CheckCircle2,
  Calendar,
  CreditCard,
} from 'lucide-react';
import {
  adminAnalyticsService,
  AnalyticsOverviewData,
} from '../../services/adminAnalyticsService';

export const AdminDashboardOverviewPage: React.FC = () => {
  const [data, setData] = useState<AnalyticsOverviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchOverview = async () => {
      try {
        setLoading(true);
        const res = await adminAnalyticsService.getOverview();
        setData(res);
      } catch (err: any) {
        console.error('Failed to load dashboard overview:', err);
        setError(err.message || 'Failed to load executive dashboard.');
      } finally {
        setLoading(false);
      }
    };

    fetchOverview();
  }, []);

  if (loading) {
    return (
      <div className="w-full space-y-6 animate-pulse">
        <div className="h-10 bg-slate-200 rounded-lg w-1/4"></div>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          <div className="h-32 bg-slate-200 rounded-2xl"></div>
          <div className="h-32 bg-slate-200 rounded-2xl"></div>
          <div className="h-32 bg-slate-200 rounded-2xl"></div>
          <div className="h-32 bg-slate-200 rounded-2xl"></div>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="w-full">
        <div className="bg-red-50 border border-red-200 text-red-700 p-6 rounded-2xl">
          {error || 'Unable to retrieve analytics summary.'}
        </div>
      </div>
    );
  }

  const { metrics, recentStudents, recentOrders, monthlyTrends, systemHealth } = data;

  return (
    <div className="w-full space-y-8 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center space-x-2">
            <span>Executive Institutional Dashboard</span>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-indigo-100 text-indigo-700 font-bold">
              Section 25
            </span>
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Real-time analytics across admissions, gross tuition revenue, course enrollments, and infrastructure telemetry.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <Link
            to="/admin/audit-logs"
            className="inline-flex items-center px-4 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 shadow-xs"
          >
            <Activity className="w-3.5 h-3.5 mr-1.5 text-slate-500" />
            Audit Logs
          </Link>
          <Link
            to="/admin/pending-students"
            className="inline-flex items-center px-4 py-2 rounded-xl text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 shadow-xs"
          >
            <Clock className="w-3.5 h-3.5 mr-1.5" />
            Review Pending ({metrics.pendingStudents})
          </Link>
        </div>
      </div>

      {/* 1. TOP METRICS GRID */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
        {/* Total Students */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold">Total Students</span>
            <Users className="w-4 h-4 text-brand-600" />
          </div>
          <div className="text-2xl font-black text-slate-900">{metrics.totalStudents}</div>
          <div className="flex items-center text-[11px] text-emerald-600 font-semibold space-x-1">
            <span>{metrics.activeStudents} active</span>
            <span className="text-slate-300">•</span>
            <span className="text-amber-600">{metrics.pendingStudents} pending</span>
          </div>
        </div>

        {/* Total Revenue */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold">Gross Tuition Revenue</span>
            <IndianRupee className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-black text-slate-900">
            ₹{metrics.totalRevenue.toLocaleString('en-IN')}
          </div>
          <div className="text-[11px] text-emerald-600 font-semibold">
            ₹{metrics.todaySales.toLocaleString('en-IN')} earned today
          </div>
        </div>

        {/* Active Courses & Enrollments */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold">Courses & Enrollments</span>
            <BookOpen className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="text-2xl font-black text-slate-900">{metrics.totalEnrollments}</div>
          <div className="text-[11px] text-slate-500">
            Across <strong className="text-slate-700">{metrics.activeCourses}</strong> active published courses
          </div>
        </div>

        {/* Live Webinars */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold">Live Masterclasses</span>
            <Video className="w-4 h-4 text-purple-600" />
          </div>
          <div className="text-2xl font-black text-slate-900">
            {metrics.activeLiveClasses + metrics.upcomingLiveClasses}
          </div>
          <div className="flex items-center text-[11px] font-semibold space-x-1">
            {metrics.activeLiveClasses > 0 ? (
              <span className="text-red-600 animate-pulse">{metrics.activeLiveClasses} live now</span>
            ) : (
              <span className="text-slate-400">0 live now</span>
            )}
            <span className="text-slate-300">•</span>
            <span className="text-slate-600">{metrics.upcomingLiveClasses} scheduled</span>
          </div>
        </div>
      </div>

      {/* 2. RECENT ACTIVITY SPLIT: REGISTRATIONS & ORDERS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Registrations */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-5 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Users className="w-4 h-4 text-brand-600" />
              <h2 className="text-sm font-bold text-slate-900">Recent Registrations</h2>
            </div>
            <Link
              to="/admin/students"
              className="text-xs font-semibold text-brand-600 hover:text-brand-700 flex items-center"
            >
              View all &rarr;
            </Link>
          </div>

          <div className="divide-y divide-slate-100">
            {recentStudents.map((s) => (
              <div key={s.id} className="p-4 flex items-center justify-between hover:bg-slate-50/60 transition">
                <div className="space-y-0.5">
                  <div className="flex items-center space-x-2">
                    <span className="text-xs font-bold text-slate-900">{s.name}</span>
                    <span
                      className={`text-[10px] font-extrabold px-2 py-0.2 rounded-full ${s.status === 'ACTIVE'
                          ? 'bg-emerald-100 text-emerald-800'
                          : s.status === 'PENDING_APPROVAL'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}
                    >
                      {s.status}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-500">{s.phone} • {s.email || 'No email'}</div>
                </div>

                <div className="text-right space-y-1">
                  <div className="text-[11px] text-slate-400">
                    {new Date(s.registeredAt).toLocaleDateString()}
                  </div>
                  <Link
                    to={`/admin/students/${s.id}/progress`}
                    className="text-[11px] font-bold text-brand-600 hover:underline block"
                  >
                    Progress &rarr;
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Course Purchases / Orders */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-5 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <CreditCard className="w-4 h-4 text-emerald-600" />
              <h2 className="text-sm font-bold text-slate-900">Recent Purchases & Orders</h2>
            </div>
            <Link
              to="/admin/payments"
              className="text-xs font-semibold text-brand-600 hover:text-brand-700 flex items-center"
            >
              Payment Audit &rarr;
            </Link>
          </div>

          <div className="divide-y divide-slate-100">
            {recentOrders.map((o) => (
              <div key={o.id} className="p-4 flex items-center justify-between hover:bg-slate-50/60 transition">
                <div className="space-y-0.5">
                  <div className="flex items-center space-x-2">
                    <span className="text-xs font-bold text-slate-900">{o.studentName}</span>
                    <span
                      className={`text-[10px] font-extrabold px-2 py-0.2 rounded-full ${o.status === 'SUCCESS' || o.status === 'MANUALLY_VERIFIED'
                          ? 'bg-emerald-100 text-emerald-800'
                          : o.status === 'PENDING'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}
                    >
                      {o.status}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-600 font-medium truncate max-w-xs">
                    {o.courseTitle}
                  </div>
                </div>

                <div className="text-right space-y-0.5">
                  <div className="text-xs font-black text-slate-900">
                    ₹{o.amount.toLocaleString('en-IN')}
                  </div>
                  <span className="text-[10px] font-mono text-slate-400 block uppercase">
                    {o.paymentMethod}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 3. SYSTEM HEALTH & TELEMETRY */}
      <div className="bg-slate-900 text-white rounded-3xl p-6 shadow-xl border border-slate-800">
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center space-x-2">
            <Server className="w-5 h-5 text-emerald-400" />
            <h3 className="text-sm font-bold tracking-tight">System Infrastructure Telemetry</h3>
          </div>
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mr-1.5 animate-pulse"></span>
            ALL SYSTEMS NORMAL
          </span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-5">
          <div className="bg-slate-800/60 p-4 rounded-xl border border-slate-700/50">
            <span className="text-slate-400 text-xs font-semibold block">PostgreSQL Database</span>
            <span className="text-sm font-bold text-emerald-400 mt-1 block">Connected & Healthy</span>
          </div>

          <div className="bg-slate-800/60 p-4 rounded-xl border border-slate-700/50">
            <span className="text-slate-400 text-xs font-semibold block">Node Server Uptime</span>
            <span className="text-sm font-bold text-white mt-1 block font-mono">
              {systemHealth.uptimeFormatted}
            </span>
          </div>

          <div className="bg-slate-800/60 p-4 rounded-xl border border-slate-700/50">
            <span className="text-slate-400 text-xs font-semibold block">Memory RSS Usage</span>
            <span className="text-sm font-bold text-white mt-1 block font-mono">
              {systemHealth.memoryRssMb} MB
            </span>
          </div>

          <div className="bg-slate-800/60 p-4 rounded-xl border border-slate-700/50">
            <span className="text-slate-400 text-xs font-semibold block">Runtime Environment</span>
            <span className="text-sm font-bold text-indigo-400 mt-1 block font-mono uppercase">
              {systemHealth.nodeEnv}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
