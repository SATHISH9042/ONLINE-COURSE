import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { mentorService } from '../../services/mentorService';
import { AssignedStudent } from '../../types';
import {
  Users,
  Search,
  Calendar,
  Video,
  GraduationCap,
  ArrowRight,
  AlertCircle,
  Eye,
  FileText,
  Clock,
  Code2,
} from 'lucide-react';

export const MentorStudentsPage: React.FC = () => {
  const [students, setStudents] = useState<AssignedStudent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchStudents();
  }, []);

  const fetchStudents = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await mentorService.getAssignedStudents();
      if (res.success && res.data) {
        setStudents(res.data);
      } else {
        setError(res.message || 'Failed to load assigned students.');
      }
    } catch (err: any) {
      setError(err.message || 'Network error.');
    } finally {
      setLoading(false);
    }
  };

  const filtered = students.filter((s) => {
    if (!search.trim()) return true;
    const term = search.toLowerCase();
    return (
      s.full_name?.toLowerCase().includes(term) ||
      s.email?.toLowerCase().includes(term) ||
      s.phone?.includes(term) ||
      s.city?.toLowerCase().includes(term)
    );
  });

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto w-full">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-2xl font-bold text-white tracking-tight">Assigned Students Roster</h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-500/20 text-purple-300 border border-purple-500/30">
              {students.length} Total
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Students assigned exclusively to your academic supervision by platform administrators.
          </p>
        </div>

        {/* Search Input */}
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by student name, email, phone..."
            className="w-full pl-9 pr-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-400 focus:outline-none focus:border-purple-500 shadow-sm"
          />
        </div>
      </div>

      {error && (
        <div className="p-4 bg-rose-950/40 border border-rose-800/60 rounded-xl text-rose-300 text-sm flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
            <span>{error}</span>
          </div>
          <button
            onClick={fetchStudents}
            className="px-3 py-1 bg-rose-800/60 hover:bg-rose-700/60 text-white rounded text-xs font-semibold"
          >
            Retry
          </button>
        </div>
      )}

      {loading ? (
        <div className="flex-1 flex items-center justify-center min-h-[300px]">
          <div className="flex flex-col items-center space-y-3">
            <div className="w-8 h-8 border-4 border-purple-500/20 border-t-purple-500 rounded-full animate-spin"></div>
            <p className="text-xs text-slate-400">Loading assigned students...</p>
          </div>
        </div>
      ) : filtered.length === 0 ? (
        <div className="p-12 text-center bg-slate-800/60 rounded-2xl border border-slate-700/60 space-y-3">
          <div className="w-12 h-12 rounded-full bg-slate-700/60 text-slate-400 flex items-center justify-center mx-auto">
            <Users className="w-6 h-6" />
          </div>
          <h3 className="text-base font-semibold text-white">No Assigned Students Found</h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            {students.length === 0
              ? 'Only platform administrators can assign students to mentors. Check with your admin to assign students.'
              : 'No students matched your search criteria.'}
          </p>
        </div>
      ) : (
        <div className="bg-slate-800/80 rounded-2xl border border-slate-700/80 overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-700/80 bg-slate-800 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  <th className="py-3.5 px-4">Student</th>
                  <th className="py-3.5 px-4">Login Days & Activity</th>
                  <th className="py-3.5 px-4">Live Classes Attended</th>
                  <th className="py-3.5 px-4">Overall Course Progress</th>
                  <th className="py-3.5 px-4">Problem Solved</th>
                  <th className="py-3.5 px-4">Admin Notes</th>
                  <th className="py-3.5 px-4 text-right">Audit Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/50 text-xs">
                {filtered.map((student) => (
                  <tr
                    key={student.id}
                    className="hover:bg-slate-700/30 transition-colors group"
                  >
                    {/* Student Info */}
                    <td className="py-4 px-4">
                      <div className="flex items-center space-x-3">
                        <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-purple-600 to-indigo-600 text-white font-bold flex items-center justify-center text-xs shrink-0 shadow-sm">
                          {student.full_name?.charAt(0) || 'S'}
                        </div>
                        <div>
                          <Link
                            to={`/mentor/students/${student.id}`}
                            className="font-semibold text-white group-hover:text-purple-300 transition-colors block text-sm"
                          >
                            {student.full_name}
                          </Link>
                          <p className="text-[11px] text-slate-400">{student.email || student.phone}</p>
                          {(student.city || student.state) && (
                            <p className="text-[10px] text-slate-400">
                              {[student.city, student.state].filter(Boolean).join(', ')}
                            </p>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Login Days & Last Login */}
                    <td className="py-4 px-4">
                      <div className="space-y-1">
                        <div className="inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-300 font-semibold text-[11px]">
                          <Calendar className="w-3 h-3 text-purple-400" />
                          <span>{student.total_login_days || 0} Login Days</span>
                        </div>
                        <p className="text-[10px] text-slate-400 flex items-center space-x-1">
                          <Clock className="w-3 h-3 text-slate-400" />
                          <span>
                            {student.last_login_at
                              ? `Last active ${new Date(student.last_login_at).toLocaleDateString([], {
                                  month: 'short',
                                  day: 'numeric',
                                })}`
                              : 'No login recorded'}
                          </span>
                        </p>
                      </div>
                    </td>

                    {/* Live Class Attendance */}
                    <td className="py-4 px-4">
                      <div className="space-y-1">
                        <div className="inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 font-semibold text-[11px]">
                          <Video className="w-3 h-3 text-emerald-400" />
                          <span>{student.live_classes_attended || 0} Attended</span>
                        </div>
                        {student.total_live_classes !== undefined && student.total_live_classes > 0 && (
                          <p className="text-[10px] text-slate-400">
                            out of {student.total_live_classes} total classes
                          </p>
                        )}
                      </div>
                    </td>

                    {/* Course Progress */}
                    <td className="py-4 px-4 min-w-[140px]">
                      <div className="space-y-1.5">
                        <div className="flex justify-between text-[11px]">
                          <span className="text-slate-400">Syllabus</span>
                          <span className="font-semibold text-indigo-400">
                            {student.avg_progress_pct || 0}%
                          </span>
                        </div>
                        <div className="w-full bg-slate-700 h-1.5 rounded-full overflow-hidden">
                          <div
                            className="bg-indigo-500 h-full rounded-full"
                            style={{ width: `${student.avg_progress_pct || 0}%` }}
                          />
                        </div>
                      </div>
                    </td>

                    {/* Problems Solved */}
                    <td className="py-4 px-4">
                      <div className="flex items-center space-x-1.5 text-slate-300">
                        <Code2 className="w-3.5 h-3.5 text-indigo-400" />
                        <span className="font-semibold text-white">{student.problems_solved || 0}</span>
                        <span className="text-slate-400 text-[10px]">solved</span>
                      </div>
                    </td>

                    {/* Admin Notes */}
                    <td className="py-4 px-4 max-w-[200px]">
                      {student.admin_assignment_notes ? (
                        <p className="text-[11px] text-slate-300 italic truncate" title={student.admin_assignment_notes}>
                          &ldquo;{student.admin_assignment_notes}&rdquo;
                        </p>
                      ) : (
                        <span className="text-[11px] text-slate-400">Standard assignment</span>
                      )}
                    </td>

                    {/* Audit Action Button */}
                    <td className="py-4 px-4 text-right">
                      <Link
                        to={`/mentor/students/${student.id}`}
                        className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-purple-600/80 hover:bg-purple-600 text-white font-medium text-xs shadow-md transition-all group-hover:scale-105"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Inspect Student</span>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
