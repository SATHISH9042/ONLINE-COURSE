import React, { useState, useEffect } from 'react';
import { adminService } from '../../services/adminService';
import { StudentListItem } from '../../types';
import { StatusBadge } from '../../components/common/Badge';
import { Users, Search, RefreshCw, CheckCircle, Ban, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

export const AllStudentsPage: React.FC = () => {
  const [students, setStudents] = useState<StudentListItem[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [actionMsg, setActionMsg] = useState<string | null>(null);

  const fetchStudents = async () => {
    setLoading(true);
    try {
      const res = await adminService.getAllStudents(1, 50, statusFilter || undefined, searchTerm || undefined);
      if (res.success && res.data) {
        setStudents(res.data);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStudents();
  }, [statusFilter]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchStudents();
  };

  const handleToggleSuspend = async (student: StudentListItem) => {
    if (student.status === 'ACTIVE') {
      if (!window.confirm(`Suspend student "${student.student_name}"? This will invalidate all active sessions immediately.`)) return;
      const res = await adminService.suspendStudent(student.id);
      if (res.success) {
        setActionMsg(`Student ${student.student_name} suspended.`);
        fetchStudents();
      }
    } else if (student.status === 'SUSPENDED') {
      const res = await adminService.reactivateStudent(student.id);
      if (res.success) {
        setActionMsg(`Student ${student.student_name} reactivated to ACTIVE status.`);
        fetchStudents();
      }
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <Link to="/admin/pending-students" className="text-slate-400 hover:text-slate-600">
              <ArrowLeft className="w-5 h-5 mr-1" />
            </Link>
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
              Student Directory
            </h1>
          </div>
          <p className="mt-1 text-sm text-slate-500">
            Comprehensive registry of all student accounts across the institute.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <Link
            to="/admin/pending-students"
            className="inline-flex items-center px-4 py-2 rounded-lg text-sm font-semibold text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-200 transition-colors shadow-sm"
          >
            Review Pending Queue &rarr;
          </Link>
        </div>
      </div>

      {actionMsg && (
        <div className="mb-6 p-4 rounded-xl bg-slate-900 text-white text-sm font-medium flex items-center justify-between">
          <span>{actionMsg}</span>
          <button onClick={() => setActionMsg(null)} className="text-slate-400 hover:text-white">✕</button>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 mb-6 flex flex-col md:flex-row gap-4 justify-between items-center">
        <form onSubmit={handleSearch} className="w-full md:w-96 relative">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by name, phone or email..."
            className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
          />
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
        </form>

        <div className="flex items-center space-x-2 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
          {['', 'PENDING_APPROVAL', 'ACTIVE', 'SUSPENDED', 'REJECTED'].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${statusFilter === st
                ? 'bg-slate-900 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
            >
              {st === '' ? 'All Students' : st.replace('_', ' ')}
            </button>
          ))}
          <button
            onClick={fetchStudents}
            title="Refresh"
            className="p-2 text-slate-500 hover:text-slate-700 bg-slate-100 rounded-lg"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Students Directory Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-500">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto text-brand-600 mb-3" />
            <p className="text-sm font-medium">Loading student directory...</p>
          </div>
        ) : students.length === 0 ? (
          <div className="p-12 text-center text-slate-500">
            <Users className="w-12 h-12 mx-auto text-slate-300 mb-3" />
            <p className="text-base font-bold text-slate-700">No students found matching your criteria</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase">Student</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase">Phone</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase">Email</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase">Joined</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase">Status</th>
                  <th className="px-6 py-3 text-right text-xs font-bold text-slate-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {students.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="font-bold text-sm text-slate-900">{s.student_name}</div>
                      <div className="text-xs text-slate-500">{s.city ? `${s.city}, ${s.state}` : ''}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700 font-mono">{s.phone}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">{s.email || '-'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                      {new Date(s.registration_date).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <StatusBadge status={s.status} />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                      <div className="flex items-center justify-end space-x-2">
                        <Link
                          to={`/admin/students/${s.id}/progress`}
                          className="px-2.5 py-1 text-xs font-semibold text-brand-700 bg-brand-50 border border-brand-200 rounded hover:bg-brand-100 transition-colors"
                        >
                          View Progress
                        </Link>
                        {s.status === 'ACTIVE' && (
                          <button
                            onClick={() => handleToggleSuspend(s)}
                            className="px-2.5 py-1 text-xs font-medium text-slate-600 hover:text-slate-900 border border-slate-300 rounded hover:bg-slate-100"
                          >
                            Suspend
                          </button>
                        )}
                        {s.status === 'SUSPENDED' && (
                          <button
                            onClick={() => handleToggleSuspend(s)}
                            className="px-2.5 py-1 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-300 rounded hover:bg-emerald-100"
                          >
                            Reactivate
                          </button>
                        )}
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
