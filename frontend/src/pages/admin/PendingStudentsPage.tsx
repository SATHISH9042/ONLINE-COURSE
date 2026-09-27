import React, { useState, useEffect } from 'react';
import { adminService } from '../../services/adminService';
import { StudentListItem } from '../../types';
import { StatusBadge } from '../../components/common/Badge';
import {
  Clock,
  CheckCircle2,
  XCircle,
  Ban,
  RefreshCw,
  Search,
  UserCheck,
  AlertTriangle,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';
import { Link } from 'react-router-dom';

export const PendingStudentsPage: React.FC = () => {
  const [students, setStudents] = useState<StudentListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const fetchPending = async () => {
    setLoading(true);
    try {
      const res = await adminService.getPendingStudents();
      if (res.success && res.data) {
        setStudents(res.data);
      }
    } catch {
      setFeedback({ type: 'error', message: 'Failed to fetch pending students list.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPending();
  }, []);

  const handleApprove = async (id: string, name: string) => {
    setProcessingId(id);
    setFeedback(null);
    try {
      const res = await adminService.approveStudent(id);
      if (res.success) {
        setFeedback({
          type: 'success',
          message: `Student "${name}" approved successfully! Status transitioned: PENDING_APPROVAL → ACTIVE.`,
        });
        setStudents((prev) => prev.filter((s) => s.id !== id));
      } else {
        setFeedback({ type: 'error', message: res.message || 'Failed to approve student.' });
      }
    } catch {
      setFeedback({ type: 'error', message: 'Network error while approving student.' });
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to reject registration for "${name}"?`)) {
      return;
    }
    setProcessingId(id);
    setFeedback(null);
    try {
      const res = await adminService.rejectStudent(id, 'Registration rejected by administrator');
      if (res.success) {
        setFeedback({
          type: 'success',
          message: `Student "${name}" rejected. Status transitioned: PENDING_APPROVAL → REJECTED.`,
        });
        setStudents((prev) => prev.filter((s) => s.id !== id));
      } else {
        setFeedback({ type: 'error', message: res.message || 'Failed to reject student.' });
      }
    } catch {
      setFeedback({ type: 'error', message: 'Network error while rejecting student.' });
    } finally {
      setProcessingId(null);
    }
  };

  const handleSuspend = async (id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to suspend account for "${name}"?`)) {
      return;
    }
    setProcessingId(id);
    setFeedback(null);
    try {
      const res = await adminService.suspendStudent(id, 'Suspended by admin review');
      if (res.success) {
        setFeedback({
          type: 'success',
          message: `Student "${name}" suspended. Status transitioned: PENDING_APPROVAL → SUSPENDED.`,
        });
        setStudents((prev) => prev.filter((s) => s.id !== id));
      } else {
        setFeedback({ type: 'error', message: res.message || 'Failed to suspend student.' });
      }
    } catch {
      setFeedback({ type: 'error', message: 'Network error while suspending student.' });
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <div className="w-full space-y-6">
      {/* Header section */}
      <div className="md:flex md:items-center md:justify-between mb-8 pb-6 border-b border-slate-200">
        <div>
          <div className="flex items-center space-x-2">
            <span className="p-2 bg-amber-100 text-amber-800 rounded-lg">
              <Clock className="w-5 h-5" />
            </span>
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
              Pending Students Approvals
            </h1>
          </div>
          <p className="mt-1 text-sm text-slate-500">
            Review and clear pending student account registrations. Approving transitions their status to ACTIVE.
          </p>
        </div>

        <div className="mt-4 md:mt-0 flex items-center space-x-3">
          <button
            onClick={fetchPending}
            disabled={loading}
            className="inline-flex items-center px-3.5 py-2 border border-slate-300 rounded-lg text-sm font-semibold text-slate-700 bg-white hover:bg-slate-50 transition-colors shadow-sm"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh Queue
          </button>
          <Link
            to="/admin/students"
            className="inline-flex items-center px-4 py-2 rounded-lg text-sm font-semibold text-white bg-slate-800 hover:bg-slate-900 transition-colors shadow-sm"
          >
            All Students Directory
            <ArrowRight className="w-4 h-4 ml-2" />
          </Link>
        </div>
      </div>

      {/* Feedback banner */}
      {feedback && (
        <div
          className={`mb-6 p-4 rounded-xl flex items-start ${feedback.type === 'success'
              ? 'bg-emerald-50 border border-emerald-200 text-emerald-900'
              : 'bg-rose-50 border border-rose-200 text-rose-900'
            }`}
        >
          {feedback.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-600 mr-2.5 mt-0.5 flex-shrink-0" />
          ) : (
            <AlertTriangle className="w-5 h-5 text-rose-600 mr-2.5 mt-0.5 flex-shrink-0" />
          )}
          <span className="text-sm font-medium">{feedback.message}</span>
        </div>
      )}

      {/* Stats Counter Card */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-8">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Awaiting Approval
            </p>
            <p className="text-3xl font-extrabold text-amber-600 mt-1">{students.length}</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
            <Clock className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Enforcement Mode
            </p>
            <p className="text-sm font-bold text-slate-800 mt-1">Strict Backend RBAC</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <ShieldCheck className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Status Transition
            </p>
            <p className="text-xs font-semibold text-slate-700 mt-1 font-mono">
              PENDING_APPROVAL &rarr; ACTIVE
            </p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <UserCheck className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Pending Students Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50/50 flex justify-between items-center">
          <h2 className="text-base font-bold text-slate-900">
            Pending Queue ({students.length})
          </h2>
          <span className="text-xs text-slate-500">Sorted by registration date (oldest first)</span>
        </div>

        {loading ? (
          <div className="p-12 text-center text-slate-500">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto text-brand-600 mb-3" />
            <p className="text-sm font-medium">Loading pending applications...</p>
          </div>
        ) : students.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-16 h-16 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-bold text-slate-900">Queue is Clear!</h3>
            <p className="text-sm text-slate-500 max-w-sm mx-auto mt-1 mb-6">
              All student registrations have been reviewed. New applications will appear here automatically.
            </p>
            <Link
              to="/register"
              target="_blank"
              className="inline-flex items-center text-xs font-semibold text-brand-600 hover:text-brand-700"
            >
              Open Registration in New Tab to Test Another Student &rarr;
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th scope="col" className="px-6 py-3.5 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">
                    Student Name
                  </th>
                  <th scope="col" className="px-6 py-3.5 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">
                    Phone Number
                  </th>
                  <th scope="col" className="px-6 py-3.5 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">
                    Email Address
                  </th>
                  <th scope="col" className="px-6 py-3.5 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">
                    Registration Date
                  </th>
                  <th scope="col" className="px-6 py-3.5 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">
                    Registration Status
                  </th>
                  <th scope="col" className="px-6 py-3.5 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-200">
                {students.map((student) => (
                  <tr key={student.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="w-9 h-9 rounded-full bg-brand-50 text-brand-700 font-bold text-sm flex items-center justify-center mr-3 border border-brand-100">
                          {student.student_name ? student.student_name.charAt(0).toUpperCase() : 'S'}
                        </div>
                        <div>
                          <div className="text-sm font-bold text-slate-900">{student.student_name}</div>
                          {student.city && (
                            <div className="text-xs text-slate-500">
                              {student.city}{student.state ? `, ${student.state}` : ''}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-700 font-mono">
                      {student.phone}
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                      {student.email || <span className="text-slate-400 italic">Not provided</span>}
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                      {new Date(student.registration_date).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap">
                      <StatusBadge status={student.status} />
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end space-x-2">
                        {/* Section 5: Approve button */}
                        <button
                          onClick={() => handleApprove(student.id, student.student_name)}
                          disabled={processingId === student.id}
                          className="inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 transition-colors disabled:opacity-50 shadow-sm"
                          title="Approve student (PENDING_APPROVAL -> ACTIVE)"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                          Approve
                        </button>

                        {/* Section 5: Reject button */}
                        <button
                          onClick={() => handleReject(student.id, student.student_name)}
                          disabled={processingId === student.id}
                          className="inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 transition-colors disabled:opacity-50"
                          title="Reject student (PENDING_APPROVAL -> REJECTED)"
                        >
                          <XCircle className="w-3.5 h-3.5 mr-1" />
                          Reject
                        </button>

                        {/* Section 5: Suspend button */}
                        <button
                          onClick={() => handleSuspend(student.id, student.student_name)}
                          disabled={processingId === student.id}
                          className="inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-300 transition-colors disabled:opacity-50"
                          title="Suspend student"
                        >
                          <Ban className="w-3.5 h-3.5 mr-1" />
                          Suspend
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
