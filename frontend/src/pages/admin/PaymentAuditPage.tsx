import React, { useEffect, useState } from 'react';
import { paymentService, PaymentRecord } from '../../services/paymentService';
import {
  CreditCard,
  QrCode,
  CheckCircle2,
  XCircle,
  Search,
  Filter,
  RefreshCw,
  Clock,
  User,
  BookOpen,
  AlertCircle,
  ShieldCheck,
  ChevronRight,
} from 'lucide-react';

export const PaymentAuditPage: React.FC = () => {
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [methodFilter, setMethodFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Rejection modal
  const [rejectModalPayment, setRejectModalPayment] = useState<PaymentRecord | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(
    null
  );

  const fetchPayments = async () => {
    setLoading(true);
    setFeedback(null);
    const res = await paymentService.listAdminPayments({
      status: statusFilter,
      paymentMethod: methodFilter,
      search: searchQuery,
    });

    if (res.success && res.data) {
      setPayments(res.data);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchPayments();
  }, [statusFilter, methodFilter]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchPayments();
  };

  const handleVerifyQr = async (paymentId: string) => {
    if (!window.confirm('Are you sure you want to verify this payment and activate student course access?')) {
      return;
    }

    setActionLoading(true);
    const res = await paymentService.verifyQrPayment(paymentId);
    setActionLoading(false);

    if (res.success) {
      setFeedback({
        type: 'success',
        message: 'Payment verified successfully. Student course access has been activated.',
      });
      fetchPayments();
    } else {
      setFeedback({
        type: 'error',
        message: res.message || 'Failed to verify payment.',
      });
    }
  };

  const handleConfirmReject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectModalPayment || !rejectReason.trim()) return;

    setActionLoading(true);
    const res = await paymentService.rejectPayment(rejectModalPayment.id, rejectReason.trim());
    setActionLoading(false);
    setRejectModalPayment(null);
    setRejectReason('');

    if (res.success) {
      setFeedback({
        type: 'success',
        message: 'Payment rejected. Student has been notified.',
      });
      fetchPayments();
    } else {
      setFeedback({
        type: 'error',
        message: res.message || 'Failed to reject payment.',
      });
    }
  };

  return (
    <div className="w-full space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <CreditCard className="w-6 h-6 text-brand-600" />
            Payment Audit & QR Reconciliation
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Section 11 & 35: Institutional transaction auditing, Razorpay records, and manual QR verification.
          </p>
        </div>

        <button
          onClick={fetchPayments}
          disabled={loading}
          className="inline-flex items-center px-3.5 py-2 rounded-xl text-xs font-semibold bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 shadow-2xs transition"
        >
          <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {feedback && (
        <div
          className={`p-4 rounded-xl text-xs font-semibold flex items-center justify-between border ${feedback.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
              : 'bg-rose-50 text-rose-800 border-rose-200'
            }`}
        >
          <span>{feedback.message}</span>
          <button onClick={() => setFeedback(null)} className="text-slate-400 hover:text-slate-600">
            &times;
          </button>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Search */}
        <form onSubmit={handleSearch} className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by student, phone, course, UTR..."
            className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-brand-600"
          />
        </form>

        {/* Status and Method Filters */}
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-semibold text-slate-500">Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs text-slate-700 font-medium focus:outline-none focus:border-brand-600 bg-white"
            >
              <option value="ALL">All Statuses</option>
              <option value="PENDING">Pending</option>
              <option value="MANUALLY_VERIFIED">Manually Verified</option>
              <option value="SUCCESS">Success (Razorpay)</option>
              <option value="FAILED">Failed</option>
            </select>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-xs font-semibold text-slate-500">Method:</span>
            <select
              value={methodFilter}
              onChange={(e) => setMethodFilter(e.target.value)}
              className="px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs text-slate-700 font-medium focus:outline-none focus:border-brand-600 bg-white"
            >
              <option value="ALL">All Gateways</option>
              <option value="RAZORPAY">Razorpay</option>
              <option value="QR_CODE">QR Code (Manual)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Payments Table (Section 11) */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        {loading ? (
          <div className="p-16 flex justify-center items-center">
            <div className="w-8 h-8 border-4 border-brand-600 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : payments.length === 0 ? (
          <div className="p-16 text-center text-slate-400 text-xs">
            No transactions found matching the specified filters.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[11px]">
                  <th className="py-3 px-4">Student</th>
                  <th className="py-3 px-4">Course</th>
                  <th className="py-3 px-4">Amount</th>
                  <th className="py-3 px-4">Method</th>
                  <th className="py-3 px-4">Transaction / UTR ID</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {payments.map((p) => {
                  const isPendingQr = p.status === 'PENDING' && p.paymentMethod === 'QR_CODE';
                  return (
                    <tr key={p.id} className="hover:bg-slate-50/60 transition-colors">
                      {/* Student */}
                      <td className="py-3.5 px-4 font-medium text-slate-900">
                        <div>{p.student.name}</div>
                        <div className="text-[11px] text-slate-400 font-mono">
                          {p.student.phone}
                        </div>
                      </td>

                      {/* Course */}
                      <td className="py-3.5 px-4 text-slate-700 max-w-xs truncate font-medium">
                        {p.course.title}
                      </td>

                      {/* Amount */}
                      <td className="py-3.5 px-4 font-bold font-mono text-slate-900">
                        ₹{p.amount.toLocaleString('en-IN')}
                      </td>

                      {/* Payment Method */}
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold ${p.paymentMethod === 'RAZORPAY'
                              ? 'bg-blue-50 text-blue-700 border border-blue-200'
                              : 'bg-purple-50 text-purple-700 border border-purple-200'
                            }`}
                        >
                          {p.paymentMethod === 'RAZORPAY' ? (
                            <>
                              <CreditCard className="w-3 h-3 mr-1" /> Razorpay
                            </>
                          ) : (
                            <>
                              <QrCode className="w-3 h-3 mr-1" /> QR Code
                            </>
                          )}
                        </span>
                      </td>

                      {/* Reference / UTR ID */}
                      <td className="py-3.5 px-4 font-mono text-slate-600 text-[11px]">
                        {p.qrReferenceCode || p.paymentId || p.orderId || '—'}
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider ${p.status === 'SUCCESS' || p.status === 'MANUALLY_VERIFIED'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : p.status === 'PENDING'
                                ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                : 'bg-rose-50 text-rose-700 border border-rose-200'
                            }`}
                        >
                          {p.status === 'MANUALLY_VERIFIED' ? 'Verified' : p.status}
                        </span>
                      </td>

                      {/* Date */}
                      <td className="py-3.5 px-4 text-slate-400 font-mono text-[11px]">
                        {new Date(p.createdAt).toLocaleDateString()}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        {isPendingQr ? (
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              disabled={actionLoading}
                              onClick={() => handleVerifyQr(p.id)}
                              className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-lg text-[11px] font-bold transition shadow-2xs"
                              title="Verify payment and activate enrollment"
                            >
                              Verify
                            </button>
                            <button
                              disabled={actionLoading}
                              onClick={() => setRejectModalPayment(p)}
                              className="px-2 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-[11px] font-bold transition"
                              title="Reject invalid transaction"
                            >
                              Reject
                            </button>
                          </div>
                        ) : (
                          <span className="text-[11px] text-slate-400 italic">Completed</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Reject Modal */}
      {rejectModalPayment && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-2xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <form
            onSubmit={handleConfirmReject}
            className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 border border-slate-100"
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <XCircle className="w-5 h-5 text-rose-600" />
                Reject Payment Claim
              </h3>
              <button
                type="button"
                onClick={() => setRejectModalPayment(null)}
                className="text-slate-400 hover:text-slate-600 font-bold"
              >
                &times;
              </button>
            </div>

            <p className="text-xs text-slate-600">
              Student: <span className="font-bold text-slate-800">{rejectModalPayment.student.name}</span>
              <br />
              Course: <span className="font-bold text-slate-800">{rejectModalPayment.course.title}</span>
              <br />
              UTR: <span className="font-mono text-purple-700 font-bold">{rejectModalPayment.qrReferenceCode}</span>
            </p>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 block">
                Reason for Rejection *
              </label>
              <textarea
                required
                rows={3}
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="e.g. UTR not found in bank statement, amount mismatch, duplicate claim..."
                className="w-full p-3 rounded-xl border border-slate-300 text-xs focus:outline-none focus:border-rose-500"
              />
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="submit"
                disabled={actionLoading || !rejectReason.trim()}
                className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white font-bold rounded-xl text-xs transition"
              >
                {actionLoading ? 'Rejecting...' : 'Confirm Rejection'}
              </button>
              <button
                type="button"
                onClick={() => setRejectModalPayment(null)}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 font-semibold rounded-xl text-xs transition"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
