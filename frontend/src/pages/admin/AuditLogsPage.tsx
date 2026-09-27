import React, { useState, useEffect } from 'react';
import {
  Activity,
  Search,
  Filter,
  Eye,
  X,
  Clock,
  Shield,
  FileCode,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Database,
} from 'lucide-react';
import {
  adminAnalyticsService,
  AuditLogItem,
  AuditLogsResponse,
} from '../../services/adminAnalyticsService';

export const AuditLogsPage: React.FC = () => {
  const [logs, setLogs] = useState<AuditLogItem[]>([]);
  const [distinctActions, setDistinctActions] = useState<string[]>([]);
  const [meta, setMeta] = useState({ total: 0, page: 1, limit: 25, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [selectedAction, setSelectedAction] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [currentPage, setCurrentPage] = useState<number>(1);

  // Diff Modal
  const [activeDiffLog, setActiveDiffLog] = useState<AuditLogItem | null>(null);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await adminAnalyticsService.getAuditLogs({
        page: currentPage,
        limit: 25,
        action: selectedAction || undefined,
        search: searchQuery || undefined,
      });
      setLogs(res.data);
      setDistinctActions(res.distinctActions);
      setMeta(res.meta);
    } catch (err: any) {
      console.error('Failed to load audit logs:', err);
      setError(err.message || 'Failed to load audit logs.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [currentPage, selectedAction]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1);
    fetchLogs();
  };

  const getActionBadgeColor = (action: string) => {
    if (action.includes('APPROVED') || action.includes('VERIFIED')) {
      return 'bg-emerald-50 text-emerald-800 border-emerald-200';
    }
    if (action.includes('REJECTED') || action.includes('DELETED') || action.includes('SUSPENDED')) {
      return 'bg-rose-50 text-rose-800 border-rose-200';
    }
    if (action.includes('CREATED') || action.includes('SCHEDULED') || action.includes('BROADCAST')) {
      return 'bg-brand-50 text-brand-800 border-brand-200';
    }
    if (action.includes('UPDATED') || action.includes('CHANGED')) {
      return 'bg-amber-50 text-amber-800 border-amber-200';
    }
    return 'bg-slate-100 text-slate-700 border-slate-200';
  };

  return (
    <div className="w-full space-y-6">
      {/* Title */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center space-x-2">
            <span>Governance Audit Trail</span>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-900 text-white font-bold">
              Section 33
            </span>
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Immutable chronological record of administrative actions, course modifications, payment reconciliations, and broadcasts.
          </p>
        </div>

        <div className="text-xs text-slate-500 bg-white border border-slate-200 px-3.5 py-2 rounded-xl shadow-xs">
          Total Logs Recorded: <strong className="text-slate-900">{meta.total}</strong>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        {/* Action Dropdown Filter */}
        <div className="flex items-center space-x-2 w-full sm:w-auto">
          <Filter className="w-4 h-4 text-slate-400" />
          <select
            value={selectedAction}
            onChange={(e) => {
              setSelectedAction(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full sm:w-64 px-3 py-1.5 border border-slate-200 rounded-xl text-xs bg-white font-medium focus:ring-2 focus:ring-brand-500 shadow-xs"
          >
            <option value="">All Actions ({distinctActions.length} types)</option>
            {distinctActions.map((act) => (
              <option key={act} value={act}>
                {act}
              </option>
            ))}
          </select>
        </div>

        {/* Search Input */}
        <form onSubmit={handleSearchSubmit} className="relative w-full sm:w-72">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search action, entity ID, or admin..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3.5 py-1.5 bg-white border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-brand-500 focus:outline-none shadow-xs"
          />
        </form>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs">
          {error}
        </div>
      )}

      {/* Audit Log Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-slate-400 text-xs">Loading audit trail...</div>
        ) : logs.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <Activity className="w-10 h-10 text-slate-300 mx-auto" />
            <p className="text-sm font-semibold text-slate-700">No audit logs matching query</p>
            <p className="text-xs text-slate-500">Try adjusting your action filter or search query.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Timestamp</th>
                  <th className="py-3 px-4">Action</th>
                  <th className="py-3 px-4">Target Entity</th>
                  <th className="py-3 px-4">Admin Actor</th>
                  <th className="py-3 px-4">IP Address</th>
                  <th className="py-3 px-4 text-right">Payload & Diff</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/70 transition-colors">
                    {/* Timestamp */}
                    <td className="py-3 px-4 whitespace-nowrap text-slate-500">
                      {new Date(log.createdAt).toLocaleString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit',
                      })}
                    </td>

                    {/* Action */}
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold border ${getActionBadgeColor(
                          log.action
                        )}`}
                      >
                        {log.action}
                      </span>
                    </td>

                    {/* Target Entity */}
                    <td className="py-3 px-4 whitespace-nowrap font-mono text-[11px]">
                      <span className="font-bold text-slate-900">{log.entityName}</span>
                      <span className="text-slate-400 block truncate max-w-[120px]">
                        {log.entityId}
                      </span>
                    </td>

                    {/* Admin Actor */}
                    <td className="py-3 px-4 whitespace-nowrap">
                      <div className="font-semibold text-slate-900">{log.adminName}</div>
                      <div className="text-[11px] text-slate-400">{log.adminEmail}</div>
                    </td>

                    {/* IP */}
                    <td className="py-3 px-4 whitespace-nowrap text-slate-400 font-mono text-[11px]">
                      {log.ipAddress || 'Internal'}
                    </td>

                    {/* Diff Viewer Trigger */}
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      <button
                        onClick={() => setActiveDiffLog(log)}
                        className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold text-brand-700 bg-brand-50 hover:bg-brand-100 border border-brand-200 transition-colors shadow-2xs"
                      >
                        <Eye className="w-3 h-3 mr-1" />
                        View Diff
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Footer */}
        {meta.totalPages > 1 && (
          <div className="p-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>
              Page {meta.page} of {meta.totalPages} ({meta.total} records)
            </span>
            <div className="flex items-center space-x-2">
              <button
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="p-1.5 border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-40"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                disabled={currentPage >= meta.totalPages}
                onClick={() => setCurrentPage((p) => p + 1)}
                className="p-1.5 border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-40"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* JSON DIFF MODAL */}
      {activeDiffLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <span
                  className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold border ${getActionBadgeColor(
                    activeDiffLog.action
                  )}`}
                >
                  {activeDiffLog.action}
                </span>
                <h3 className="text-sm font-bold text-slate-900 mt-1">
                  Entity: {activeDiffLog.entityName} ({activeDiffLog.entityId})
                </h3>
              </div>
              <button
                onClick={() => setActiveDiffLog(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="text-xs text-slate-500 space-y-1">
              <div>Actor: <strong className="text-slate-900">{activeDiffLog.adminEmail}</strong></div>
              <div>Timestamp: <strong className="text-slate-900">{new Date(activeDiffLog.createdAt).toLocaleString()}</strong></div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Old Values */}
              <div>
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                  Previous State (Old)
                </span>
                <pre className="bg-slate-900 text-slate-200 p-3 rounded-xl text-[11px] font-mono overflow-auto max-h-64 leading-tight">
                  {activeDiffLog.oldValues
                    ? JSON.stringify(activeDiffLog.oldValues, null, 2)
                    : '// No prior state (Created record)'}
                </pre>
              </div>

              {/* New Values */}
              <div>
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                  Updated State (New)
                </span>
                <pre className="bg-slate-900 text-emerald-400 p-3 rounded-xl text-[11px] font-mono overflow-auto max-h-64 leading-tight">
                  {activeDiffLog.newValues
                    ? JSON.stringify(activeDiffLog.newValues, null, 2)
                    : '// Record deleted / archived'}
                </pre>
              </div>
            </div>

            <div className="flex justify-end pt-3 border-t border-slate-100">
              <button
                onClick={() => setActiveDiffLog(null)}
                className="px-4 py-2 border border-slate-200 text-slate-600 hover:bg-slate-50 rounded-xl text-xs font-semibold"
              >
                Close Diff Viewer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
