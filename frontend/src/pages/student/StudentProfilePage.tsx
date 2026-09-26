import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { studentService, StudentProfileData } from '../../services/studentService';
import { StatusBadge } from '../../components/common/Badge';
import {
  User as UserIcon,
  Phone,
  Mail,
  MapPin,
  Calendar,
  BookOpen,
  Lock,
  Save,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';

export const StudentProfilePage: React.FC = () => {
  const { user, refreshUser } = useAuth();
  const [profile, setProfile] = useState<StudentProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Form states
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [bio, setBio] = useState('');

  const fetchProfile = async () => {
    setLoading(true);
    try {
      const res = await studentService.getProfile();
      if (res.success && res.data) {
        setProfile(res.data);
        setFullName(res.data.full_name || '');
        setEmail(res.data.email || '');
        setCity(res.data.city || '');
        setState(res.data.state || '');
        setBio(res.data.bio || '');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setFeedback(null);

    try {
      const res = await studentService.updateProfile({
        fullName: fullName.trim(),
        email: email.trim() || undefined,
        city: city.trim() || undefined,
        state: state.trim() || undefined,
        bio: bio.trim() || undefined,
      });

      if (res.success) {
        setFeedback({ type: 'success', message: 'Profile details saved successfully!' });
        await refreshUser();
        await fetchProfile();
      } else {
        setFeedback({ type: 'error', message: res.message || 'Failed to update profile.' });
      }
    } catch {
      setFeedback({ type: 'error', message: 'Network error saving changes.' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <RefreshCw className="w-8 h-8 animate-spin text-brand-600 mx-auto" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in duration-200">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
          Student Profile
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          View your enrollment status and update your personal information.
        </p>
      </div>

      {feedback && (
        <div
          className={`p-4 rounded-xl flex items-start ${
            feedback.type === 'success'
              ? 'bg-emerald-50 border border-emerald-200 text-emerald-900'
              : 'bg-rose-50 border border-rose-200 text-rose-900'
          }`}
        >
          {feedback.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-600 mr-2 mt-0.5" />
          ) : (
            <AlertCircle className="w-5 h-5 text-rose-600 mr-2 mt-0.5" />
          )}
          <span className="text-sm font-semibold">{feedback.message}</span>
        </div>
      )}

      {/* SECTION 23: Profile Overview Card */}
      <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-sm flex flex-col sm:flex-row items-center sm:items-start gap-6">
        <div className="w-24 h-24 rounded-full bg-gradient-to-tr from-brand-600 to-indigo-600 text-white font-extrabold text-3xl flex items-center justify-center shadow-lg shadow-brand-600/20 shrink-0">
          {profile?.full_name ? profile.full_name.charAt(0).toUpperCase() : 'S'}
        </div>

        <div className="flex-1 text-center sm:text-left space-y-2">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <h2 className="text-2xl font-bold text-slate-900">{profile?.full_name}</h2>
            <StatusBadge status={profile?.status || 'ACTIVE'} />
          </div>

          <p className="text-sm text-slate-500 font-mono">{profile?.phone}</p>
          {profile?.bio && <p className="text-sm text-slate-600 italic">"{profile.bio}"</p>}

          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-4 pt-3 text-xs text-slate-500 border-t border-slate-100">
            <div className="flex items-center">
              <Calendar className="w-4 h-4 mr-1 text-slate-400" />
              <span>
                Joined: {profile?.registered_at ? new Date(profile.registered_at).toLocaleDateString() : 'N/A'}
              </span>
            </div>
            <div className="flex items-center font-semibold text-brand-600">
              <BookOpen className="w-4 h-4 mr-1" />
              <span>{profile?.enrolled_courses_count || 0} Purchased Courses</span>
            </div>
          </div>
        </div>
      </div>

      {/* SECTION 23: Edit Allowed Information Form */}
      <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-sm">
        <h3 className="text-lg font-bold text-slate-900 mb-6">Edit Account Details</h3>

        <form onSubmit={handleSave} className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {/* Full Name */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                Full Name
              </label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
              />
            </div>

            {/* Email Address */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="student@example.com"
                className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
              />
            </div>

            {/* Phone Number - Restricted Field */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                  Phone Number
                </label>
                <span className="flex items-center text-xs text-slate-400 font-medium">
                  <Lock className="w-3 h-3 mr-1" />
                  Locked identity field
                </span>
              </div>
              <input
                type="text"
                value={profile?.phone || ''}
                disabled
                className="w-full px-3.5 py-2.5 text-sm border border-slate-200 rounded-xl bg-slate-50 text-slate-500 font-mono cursor-not-allowed"
              />
            </div>

            {/* Account Status - Restricted Field */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                  Registration Status
                </label>
                <span className="flex items-center text-xs text-slate-400 font-medium">
                  <Lock className="w-3 h-3 mr-1" />
                  Admin controlled
                </span>
              </div>
              <input
                type="text"
                value={profile?.status || ''}
                disabled
                className="w-full px-3.5 py-2.5 text-sm border border-slate-200 rounded-xl bg-slate-50 text-slate-500 font-mono cursor-not-allowed"
              />
            </div>

            {/* City */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                City
              </label>
              <input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="e.g. Mumbai"
                className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
              />
            </div>

            {/* State */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                State
              </label>
              <input
                type="text"
                value={state}
                onChange={(e) => setState(e.target.value)}
                placeholder="e.g. Maharashtra"
                className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
              />
            </div>
          </div>

          {/* Bio */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
              Bio / Goals
            </label>
            <textarea
              rows={3}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Tell instructors a bit about your academic and career goals..."
              className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
            ></textarea>
          </div>

          <div className="flex justify-end pt-4 border-t border-slate-100">
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center px-6 py-2.5 rounded-xl text-sm font-bold text-white bg-brand-600 hover:bg-brand-700 shadow-md shadow-brand-600/20 disabled:opacity-50 transition-colors"
            >
              <Save className="w-4 h-4 mr-2" />
              {saving ? 'Saving...' : 'Save Profile Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
