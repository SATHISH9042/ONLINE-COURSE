import React, { useState, useEffect } from 'react';
import { mentorService } from '../../services/mentorService';
import { AdminMentorItem, AdminStudentWithMentor } from '../../types';
import {
  Users,
  Award,
  UserPlus,
  Link as LinkIcon,
  Search,
  CheckCircle,
  AlertCircle,
  X,
  Plus,
  Trash2,
  Sparkles,
  BookOpen,
  Calendar,
  Filter,
} from 'lucide-react';

export const AdminMentorsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'mentors' | 'matrix'>('mentors');
  const [mentors, setMentors] = useState<AdminMentorItem[]>([]);
  const [students, setStudents] = useState<AdminStudentWithMentor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Search filters
  const [mentorSearch, setMentorSearch] = useState('');
  const [matrixSearch, setMatrixSearch] = useState('');
  const [mentorFilter, setMentorFilter] = useState<string>('ALL');

  // Modals state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedMentorForAssign, setSelectedMentorForAssign] = useState<AdminMentorItem | null>(null);
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [assignmentNotes, setAssignmentNotes] = useState('');
  const [assigning, setAssigning] = useState(false);

  // Create Mentor form
  const [newMentor, setNewMentor] = useState({
    fullName: '',
    email: '',
    phone: '',
    password: '',
    specialization: '',
    bio: '',
  });
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [mRes, sRes] = await Promise.all([
        mentorService.listMentors(),
        mentorService.getAllStudentsWithMentors(),
      ]);

      if (mRes.success && mRes.data) {
        setMentors(mRes.data);
      }
      if (sRes.success && sRes.data) {
        setStudents(sRes.data);
      }
    } catch (err: any) {
      setError(err.message || 'Error loading mentor data.');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateMentor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMentor.fullName || !newMentor.email || !newMentor.password || !newMentor.phone) {
      alert('Please fill out all required fields.');
      return;
    }

    setCreating(true);
    setError(null);
    try {
      const res = await mentorService.createMentor(newMentor);
      if (res.success) {
        setSuccessMsg(`Mentor ${newMentor.fullName} created successfully.`);
        setShowCreateModal(false);
        setNewMentor({
          fullName: '',
          email: '',
          phone: '',
          password: '',
          specialization: '',
          bio: '',
        });
        loadData();
        setTimeout(() => setSuccessMsg(null), 4000);
      } else {
        setError(res.message || 'Failed to create mentor.');
      }
    } catch (err: any) {
      setError(err.message || 'Network error.');
    } finally {
      setCreating(false);
    }
  };

  const handleOpenAssignModal = (mentor: AdminMentorItem) => {
    setSelectedMentorForAssign(mentor);
    // Pre-select students already assigned to this mentor
    const currentAssigned = students.filter((s) => s.mentor_id === mentor.id).map((s) => s.id);
    setSelectedStudentIds(currentAssigned);
    setAssignmentNotes('');
    setShowAssignModal(true);
  };

  const handleAssignStudents = async () => {
    if (!selectedMentorForAssign || selectedStudentIds.length === 0) {
      alert('Please select at least one student to assign.');
      return;
    }

    setAssigning(true);
    setError(null);
    try {
      const res = await mentorService.assignStudents(
        selectedMentorForAssign.id,
        selectedStudentIds,
        assignmentNotes
      );

      if (res.success) {
        setSuccessMsg(`Students successfully assigned to ${selectedMentorForAssign.full_name}.`);
        setShowAssignModal(false);
        loadData();
        setTimeout(() => setSuccessMsg(null), 4000);
      } else {
        setError(res.message || 'Failed to assign students.');
      }
    } catch (err: any) {
      setError(err.message || 'Error assigning students.');
    } finally {
      setAssigning(false);
    }
  };

  const handleUnassign = async (mentorId: string, studentId: string) => {
    if (!window.confirm('Are you sure you want to unassign this student from the mentor?')) return;
    try {
      const res = await mentorService.unassignStudent(mentorId, studentId);
      if (res.success) {
        setSuccessMsg('Student unassigned successfully.');
        loadData();
        setTimeout(() => setSuccessMsg(null), 3000);
      }
    } catch (err: any) {
      setError(err.message || 'Error unassigning student.');
    }
  };

  const filteredMentors = mentors.filter((m) => {
    if (!mentorSearch.trim()) return true;
    const t = mentorSearch.toLowerCase();
    return (
      m.full_name?.toLowerCase().includes(t) ||
      m.email?.toLowerCase().includes(t) ||
      m.phone?.includes(t) ||
      m.specialization?.toLowerCase().includes(t)
    );
  });

  const filteredStudents = students.filter((s) => {
    // Mentor filter
    if (mentorFilter === 'ASSIGNED' && !s.mentor_id) return false;
    if (mentorFilter === 'UNASSIGNED' && s.mentor_id) return false;
    if (mentorFilter !== 'ALL' && mentorFilter !== 'ASSIGNED' && mentorFilter !== 'UNASSIGNED') {
      if (s.mentor_id !== mentorFilter) return false;
    }

    // Search query
    if (!matrixSearch.trim()) return true;
    const t = matrixSearch.toLowerCase();
    return (
      s.full_name?.toLowerCase().includes(t) ||
      s.email?.toLowerCase().includes(t) ||
      s.phone?.includes(t) ||
      s.assigned_mentor_name?.toLowerCase().includes(t)
    );
  });

  return (
    <div className="p-6 md:p-8 space-y-8 max-w-7xl mx-auto w-full">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-2xl font-bold text-white tracking-tight">Mentor & Student Assignment Management</h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-500/20 text-purple-300 border border-purple-500/30">
              Admin Exclusive
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Create mentors and control student assignments. Mentors can ONLY view students explicitly assigned by administrators.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-purple-600/25"
          >
            <UserPlus className="w-4 h-4" />
            <span>Create New Mentor</span>
          </button>
        </div>
      </div>

      {successMsg && (
        <div className="p-4 bg-emerald-950/40 border border-emerald-800/60 rounded-xl text-emerald-300 text-xs flex items-center space-x-2">
          <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {error && (
        <div className="p-4 bg-rose-950/40 border border-rose-800/60 rounded-xl text-rose-300 text-xs flex items-center space-x-2">
          <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Tabs */}
      <div className="flex items-center space-x-3 border-b border-slate-700/80">
        <button
          onClick={() => setActiveTab('mentors')}
          className={`flex items-center space-x-2 pb-3 px-2 text-xs font-bold border-b-2 transition-all ${
            activeTab === 'mentors'
              ? 'border-purple-500 text-purple-300'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Award className="w-4 h-4" />
          <span>Faculty Mentors Roster ({mentors.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('matrix')}
          className={`flex items-center space-x-2 pb-3 px-2 text-xs font-bold border-b-2 transition-all ${
            activeTab === 'matrix'
              ? 'border-purple-500 text-purple-300'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Student Assignment Matrix ({students.length})</span>
        </button>
      </div>

      {/* TAB 1: MENTORS ROSTER */}
      {activeTab === 'mentors' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={mentorSearch}
                onChange={(e) => setMentorSearch(e.target.value)}
                placeholder="Search mentors by name, specialization, email..."
                className="w-full pl-9 pr-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-400 focus:outline-none focus:border-purple-500"
              />
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center p-12">
              <div className="w-8 h-8 border-4 border-purple-500/20 border-t-purple-500 rounded-full animate-spin"></div>
            </div>
          ) : filteredMentors.length === 0 ? (
            <div className="p-12 text-center bg-slate-800/60 rounded-2xl border border-slate-700/60 text-slate-400 text-xs">
              No mentors found. Click &ldquo;Create New Mentor&rdquo; above to onboard faculty mentors.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredMentors.map((mentor) => (
                <div
                  key={mentor.id}
                  className="p-5 rounded-2xl bg-slate-800/80 border border-slate-700/80 hover:border-purple-500/50 transition-all flex flex-col justify-between space-y-4 shadow-lg group"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-purple-600 to-indigo-600 text-white font-bold flex items-center justify-center text-base shadow-md">
                          {mentor.full_name?.charAt(0) || 'M'}
                        </div>
                        <div>
                          <h3 className="font-bold text-white text-sm group-hover:text-purple-300 transition-colors">
                            {mentor.full_name}
                          </h3>
                          <p className="text-xs text-slate-400">{mentor.email}</p>
                          <p className="text-[11px] text-slate-400 font-mono">{mentor.phone}</p>
                        </div>
                      </div>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        {mentor.status}
                      </span>
                    </div>

                    {mentor.specialization && (
                      <div className="p-2.5 rounded-xl bg-purple-500/10 border border-purple-500/20 text-xs text-purple-300 flex items-center space-x-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                        <span className="truncate">{mentor.specialization}</span>
                      </div>
                    )}

                    {mentor.bio && (
                      <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                        {mentor.bio}
                      </p>
                    )}

                    <div className="pt-2 border-t border-slate-700/60 flex items-center justify-between text-xs">
                      <span className="text-slate-400">Assigned Students:</span>
                      <span className="font-bold text-white px-2 py-0.5 rounded-lg bg-slate-700/60">
                        {mentor.assigned_students_count} Active
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={() => handleOpenAssignModal(mentor)}
                    className="w-full py-2.5 px-3 rounded-xl bg-purple-600/80 hover:bg-purple-600 text-white text-xs font-bold transition-all shadow-md flex items-center justify-center space-x-1.5"
                  >
                    <LinkIcon className="w-3.5 h-3.5" />
                    <span>Assign / Manage Students</span>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: ASSIGNMENT MATRIX */}
      {activeTab === 'matrix' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={matrixSearch}
                onChange={(e) => setMatrixSearch(e.target.value)}
                placeholder="Search students or assigned mentor..."
                className="w-full pl-9 pr-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-400 focus:outline-none focus:border-purple-500"
              />
            </div>

            <div className="flex items-center space-x-2">
              <Filter className="w-4 h-4 text-slate-400" />
              <select
                value={mentorFilter}
                onChange={(e) => setMentorFilter(e.target.value)}
                className="px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-purple-500"
              >
                <option value="ALL">All Students ({students.length})</option>
                <option value="ASSIGNED">Only Assigned Students</option>
                <option value="UNASSIGNED">Unassigned Students</option>
                {mentors.map((m) => (
                  <option key={m.id} value={m.id}>
                    Mentor: {m.full_name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="bg-slate-800/80 rounded-2xl border border-slate-700/80 overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-700/80 bg-slate-800 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    <th className="py-3.5 px-4">Student</th>
                    <th className="py-3.5 px-4">Phone / City</th>
                    <th className="py-3.5 px-4">Current Assigned Mentor</th>
                    <th className="py-3.5 px-4">Assignment Notes</th>
                    <th className="py-3.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700/50">
                  {filteredStudents.map((st) => (
                    <tr key={st.id} className="hover:bg-slate-700/30 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-white">{st.full_name}</div>
                        <div className="text-[11px] text-slate-400">{st.email || 'No email'}</div>
                      </td>
                      <td className="py-3.5 px-4 text-slate-300">
                        <div>{st.phone}</div>
                        <div className="text-[10px] text-slate-400">{st.city || '-'}</div>
                      </td>
                      <td className="py-3.5 px-4">
                        {st.assigned_mentor_name ? (
                          <div className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full bg-purple-500/10 text-purple-300 border border-purple-500/30 font-semibold text-[11px]">
                            <Award className="w-3.5 h-3.5 text-purple-400" />
                            <span>{st.assigned_mentor_name}</span>
                          </div>
                        ) : (
                          <span className="px-2 py-0.5 rounded text-[10px] bg-slate-700 text-slate-400 font-semibold">
                            Unassigned
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-slate-400 max-w-xs truncate">
                        {st.assignment_notes || '-'}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        {st.mentor_id ? (
                          <button
                            onClick={() => handleUnassign(st.mentor_id!, st.id)}
                            className="px-2.5 py-1 text-rose-400 hover:text-white hover:bg-rose-900/40 rounded-lg text-xs font-semibold transition-colors"
                          >
                            Unassign
                          </button>
                        ) : (
                          <button
                            onClick={() => {
                              if (mentors.length === 0) {
                                alert('Please create a mentor first.');
                                return;
                              }
                              handleOpenAssignModal(mentors[0]);
                            }}
                            className="px-2.5 py-1 text-purple-300 hover:text-white hover:bg-purple-900/40 rounded-lg text-xs font-semibold transition-colors"
                          >
                            Assign to Mentor
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* CREATE MENTOR MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-800 border border-slate-700 rounded-2xl max-w-lg w-full p-6 space-y-5 shadow-2xl relative">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-white flex items-center space-x-2">
                <UserPlus className="w-5 h-5 text-purple-400" />
                <span>Create New Mentor Account</span>
              </h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateMentor} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Prof. Ramesh Gupta"
                  value={newMentor.fullName}
                  onChange={(e) => setNewMentor({ ...newMentor, fullName: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-purple-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Email Address *</label>
                  <input
                    type="email"
                    required
                    placeholder="mentor@institute.edu"
                    value={newMentor.email}
                    onChange={(e) => setNewMentor({ ...newMentor, email: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-purple-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Phone Number *</label>
                  <input
                    type="tel"
                    required
                    placeholder="+919876543210"
                    value={newMentor.phone}
                    onChange={(e) => setNewMentor({ ...newMentor, phone: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-purple-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Initial Password *</label>
                <input
                  type="password"
                  required
                  placeholder="Minimum 8 characters"
                  value={newMentor.password}
                  onChange={(e) => setNewMentor({ ...newMentor, password: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-purple-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Specialization / Subject Domain</label>
                <input
                  type="text"
                  placeholder="e.g. Full Stack MERN Architecture & DSA"
                  value={newMentor.specialization}
                  onChange={(e) => setNewMentor({ ...newMentor, specialization: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-purple-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Professional Bio</label>
                <textarea
                  rows={3}
                  placeholder="Brief background and mentoring expertise..."
                  value={newMentor.bio}
                  onChange={(e) => setNewMentor({ ...newMentor, bio: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-purple-500 resize-none"
                />
              </div>

              <div className="pt-2 flex items-center justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-xl font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="px-5 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-xl font-bold shadow-md"
                >
                  {creating ? 'Creating...' : 'Create Mentor'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ASSIGN STUDENTS MODAL */}
      {showAssignModal && selectedMentorForAssign && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-800 border border-slate-700 rounded-2xl max-w-xl w-full p-6 space-y-5 shadow-2xl relative">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-white flex items-center space-x-2">
                  <LinkIcon className="w-5 h-5 text-purple-400" />
                  <span>Assign Students to {selectedMentorForAssign.full_name}</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Select which students should be assigned under this mentor&rsquo;s supervision.
                </p>
              </div>
              <button
                onClick={() => setShowAssignModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Assignment Direction / Notes (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Focus on weekly live attendance and code reviews..."
                  value={assignmentNotes}
                  onChange={(e) => setAssignmentNotes(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-purple-500"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-slate-300 font-semibold">Select Students ({selectedStudentIds.length} selected)</label>
                  <button
                    type="button"
                    onClick={() => {
                      if (selectedStudentIds.length === students.length) {
                        setSelectedStudentIds([]);
                      } else {
                        setSelectedStudentIds(students.map((s) => s.id));
                      }
                    }}
                    className="text-[11px] text-purple-400 hover:text-purple-300 font-semibold"
                  >
                    {selectedStudentIds.length === students.length ? 'Deselect All' : 'Select All'}
                  </button>
                </div>

                <div className="max-h-60 overflow-y-auto space-y-2 p-2 bg-slate-900/80 rounded-xl border border-slate-700">
                  {students.map((st) => {
                    const isChecked = selectedStudentIds.includes(st.id);
                    return (
                      <label
                        key={st.id}
                        className={`flex items-center justify-between p-2 rounded-lg cursor-pointer transition-all ${
                          isChecked ? 'bg-purple-950/40 border border-purple-600/40' : 'hover:bg-slate-800'
                        }`}
                      >
                        <div className="flex items-center space-x-2.5">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedStudentIds([...selectedStudentIds, st.id]);
                              } else {
                                setSelectedStudentIds(selectedStudentIds.filter((id) => id !== st.id));
                              }
                            }}
                            className="rounded border-slate-700 text-purple-600 focus:ring-purple-500"
                          />
                          <div>
                            <span className="font-semibold text-white block">{st.full_name}</span>
                            <span className="text-[10px] text-slate-400">{st.email || st.phone}</span>
                          </div>
                        </div>

                        {st.assigned_mentor_name && st.mentor_id !== selectedMentorForAssign.id && (
                          <span className="text-[10px] text-amber-400 bg-amber-950/40 px-2 py-0.5 rounded border border-amber-800/40">
                            Currently with {st.assigned_mentor_name}
                          </span>
                        )}
                      </label>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="pt-2 flex items-center justify-end space-x-3">
              <button
                type="button"
                onClick={() => setShowAssignModal(false)}
                className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-xl text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleAssignStudents}
                disabled={assigning || selectedStudentIds.length === 0}
                className="px-5 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-md"
              >
                {assigning ? 'Assigning...' : `Assign ${selectedStudentIds.length} Student(s)`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
