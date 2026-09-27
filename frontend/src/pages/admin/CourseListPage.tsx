import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { adminCourseService, AdminCourseItem } from '../../services/adminCourseService';
import {
  BookOpen,
  Plus,
  Edit,
  Trash2,
  Eye,
  EyeOff,
  Layers,
  Clock,
  User,
  IndianRupee,
  RefreshCw,
  Search,
  CheckCircle2,
  X,
  AlertTriangle,
} from 'lucide-react';

export const CourseListPage: React.FC = () => {
  const [courses, setCourses] = useState<AdminCourseItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCourse, setEditingCourse] = useState<AdminCourseItem | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Form states for Create/Edit Modal
  const [title, setTitle] = useState('');
  const [shortDescription, setShortDescription] = useState('');
  const [description, setDescription] = useState('');
  const [thumbnailUrl, setThumbnailUrl] = useState('');
  const [price, setPrice] = useState('9999');
  const [durationHours, setDurationHours] = useState('80');
  const [instructorName, setInstructorName] = useState('');
  const [isPublished, setIsPublished] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const fetchCourses = async () => {
    setLoading(true);
    try {
      const res = await adminCourseService.listCourses();
      if (res.success && res.data) {
        setCourses(res.data);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCourses();
  }, []);

  const openCreateModal = () => {
    setEditingCourse(null);
    setTitle('');
    setShortDescription('');
    setDescription('');
    setThumbnailUrl('https://images.unsplash.com/photo-1517694712202-14dd9538aa97?auto=format&fit=crop&w=600&q=80');
    setPrice('9999');
    setDurationHours('60');
    setInstructorName('Dr. Vikram Seth');
    setIsPublished(false);
    setModalOpen(true);
  };

  const openEditModal = (c: AdminCourseItem) => {
    setEditingCourse(c);
    setTitle(c.title);
    setShortDescription(c.short_description);
    setDescription(c.description || c.short_description);
    setThumbnailUrl(c.thumbnail_url);
    setPrice(String(c.price));
    setDurationHours(String(c.duration_hours));
    setInstructorName(c.instructor_name);
    setIsPublished(c.is_published);
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setFeedback(null);

    try {
      if (editingCourse) {
        const res = await adminCourseService.updateCourse(editingCourse.id, {
          title: title.trim(),
          shortDescription: shortDescription.trim(),
          description: description.trim(),
          thumbnailUrl: thumbnailUrl.trim(),
          price: parseFloat(price) || 0,
          durationHours: parseInt(durationHours, 10) || 0,
          instructorName: instructorName.trim(),
          isPublished,
        });

        if (res.success) {
          setFeedback({ type: 'success', message: `Course "${title}" updated successfully.` });
          setModalOpen(false);
          fetchCourses();
        } else {
          setFeedback({ type: 'error', message: res.message || 'Failed to update course.' });
        }
      } else {
        const res = await adminCourseService.createCourse({
          title: title.trim(),
          shortDescription: shortDescription.trim(),
          description: description.trim(),
          thumbnailUrl: thumbnailUrl.trim(),
          price: parseFloat(price) || 0,
          durationHours: parseInt(durationHours, 10) || 0,
          instructorName: instructorName.trim(),
          isPublished,
        });

        if (res.success) {
          setFeedback({ type: 'success', message: `Course "${title}" created successfully.` });
          setModalOpen(false);
          fetchCourses();
        } else {
          setFeedback({ type: 'error', message: res.message || 'Failed to create course.' });
        }
      }
    } catch {
      setFeedback({ type: 'error', message: 'Network error saving course.' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleTogglePublish = async (id: string, currentStatus: boolean, title: string) => {
    try {
      const res = await adminCourseService.togglePublish(id);
      if (res.success) {
        setFeedback({
          type: 'success',
          message: `Course "${title}" is now ${!currentStatus ? 'Published' : 'Draft'}.`,
        });
        fetchCourses();
      }
    } catch {
      setFeedback({ type: 'error', message: 'Failed to update publish status.' });
    }
  };

  const handleDeleteCourse = async (id: string, title: string) => {
    if (!window.confirm(`Are you sure you want to archive course "${title}"?`)) return;
    try {
      const res = await adminCourseService.deleteCourse(id);
      if (res.success) {
        setFeedback({ type: 'success', message: `Course "${title}" archived.` });
        fetchCourses();
      }
    } catch {
      setFeedback({ type: 'error', message: 'Failed to archive course.' });
    }
  };

  const filteredCourses = courses.filter((c) =>
    c.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.instructor_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="w-full space-y-6">
      {/* Header section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 pb-6">
        <div>
          <div className="flex items-center space-x-2">
            <span className="p-2 bg-brand-50 text-brand-600 rounded-lg">
              <BookOpen className="w-5 h-5" />
            </span>
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
              Course Management
            </h1>
          </div>
          <p className="mt-1 text-sm text-slate-500">
            Create and maintain institute courses, hierarchical topics, and learning content.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={openCreateModal}
            className="inline-flex items-center px-4 py-2.5 rounded-xl text-sm font-bold text-white bg-brand-600 hover:bg-brand-700 shadow-md shadow-brand-600/20 transition-all"
          >
            <Plus className="w-4 h-4 mr-1.5" />
            Create Course
          </button>
        </div>
      </div>

      {feedback && (
        <div
          className={`p-4 rounded-xl flex items-start ${feedback.type === 'success'
              ? 'bg-emerald-50 border border-emerald-200 text-emerald-900'
              : 'bg-rose-50 border border-rose-200 text-rose-900'
            }`}
        >
          {feedback.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-600 mr-2 mt-0.5 shrink-0" />
          ) : (
            <AlertTriangle className="w-5 h-5 text-rose-600 mr-2 mt-0.5 shrink-0" />
          )}
          <span className="text-sm font-medium">{feedback.message}</span>
        </div>
      )}

      {/* Filter & Search Bar */}
      <div className="bg-white p-4 rounded-2xl shadow-xs border border-slate-200 flex flex-col sm:flex-row gap-4 justify-between items-center">
        <div className="relative w-full sm:w-96">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by course name or instructor..."
            className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
          />
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
        </div>

        <div className="text-xs text-slate-500 font-medium">
          Showing <strong className="text-slate-900">{filteredCourses.length}</strong> of {courses.length} courses
        </div>
      </div>

      {/* Courses Grid */}
      {loading ? (
        <div className="p-12 text-center text-slate-500">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto text-brand-600 mb-2" />
          <p className="text-sm">Loading course catalogue...</p>
        </div>
      ) : filteredCourses.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 shadow-sm max-w-md mx-auto">
          <BookOpen className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-lg font-bold text-slate-900">No Courses Found</h3>
          <p className="text-sm text-slate-500 mt-1 mb-6">
            Get started by creating the first course in your institute LMS.
          </p>
          <button
            onClick={openCreateModal}
            className="inline-flex items-center px-4 py-2 rounded-xl text-sm font-bold text-white bg-brand-600 hover:bg-brand-700"
          >
            <Plus className="w-4 h-4 mr-1.5" /> Create Course Now
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCourses.map((c) => (
            <div
              key={c.id}
              className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs hover:shadow-lg transition-all duration-200 flex flex-col justify-between"
            >
              {/* Thumbnail & Badges */}
              <div className="relative h-44 w-full bg-slate-100 overflow-hidden">
                <img
                  src={c.thumbnail_url}
                  alt={c.title}
                  className="w-full h-full object-cover"
                />
                <div className="absolute top-3 left-3">
                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${c.is_published
                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                        : 'bg-slate-100 text-slate-700 border border-slate-200'
                      }`}
                  >
                    {c.is_published ? '● Published' : '○ Draft'}
                  </span>
                </div>
                <div className="absolute top-3 right-3 px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-900/80 text-white backdrop-blur-xs">
                  ₹{Number(c.price).toLocaleString()}
                </div>
              </div>

              {/* Course Info */}
              <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                <div className="space-y-2">
                  <span className="text-xs font-semibold text-brand-600 uppercase tracking-wider block">
                    {c.instructor_name}
                  </span>
                  <h3 className="text-base font-bold text-slate-900 leading-snug line-clamp-1">
                    {c.title}
                  </h3>
                  <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                    {c.short_description}
                  </p>
                </div>

                {/* Course Metadata pills */}
                <div className="flex items-center justify-between text-xs text-slate-500 pt-3 border-t border-slate-100">
                  <span className="flex items-center">
                    <Layers className="w-3.5 h-3.5 mr-1 text-slate-400" />
                    {c.topic_count} Topics • {c.subtopic_count} Lessons
                  </span>
                  <span className="flex items-center">
                    <Clock className="w-3.5 h-3.5 mr-1 text-slate-400" />
                    {c.duration_hours}h
                  </span>
                </div>

                {/* Section 27: Course Actions */}
                <div className="space-y-2 pt-2">
                  {/* Manage Syllabus button */}
                  <Link
                    to={`/admin/courses/${c.id}/curriculum`}
                    className="w-full flex items-center justify-center py-2 px-3 rounded-xl text-xs font-bold text-white bg-brand-600 hover:bg-brand-700 transition-colors shadow-xs"
                  >
                    <Layers className="w-3.5 h-3.5 mr-1.5" />
                    Manage Syllabus & Content
                  </Link>

                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => openEditModal(c)}
                      className="flex-1 inline-flex items-center justify-center py-1.5 px-3 rounded-xl text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors"
                      title="Edit Course Details"
                    >
                      <Edit className="w-3.5 h-3.5 mr-1" />
                      Edit
                    </button>

                    <button
                      onClick={() => handleTogglePublish(c.id, c.is_published, c.title)}
                      className="inline-flex items-center justify-center p-2 rounded-xl text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors"
                      title={c.is_published ? 'Unpublish Course' : 'Publish Course'}
                    >
                      {c.is_published ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4 text-emerald-600" />}
                    </button>

                    <button
                      onClick={() => handleDeleteCourse(c.id, c.title)}
                      className="inline-flex items-center justify-center p-2 rounded-xl text-xs font-semibold text-rose-600 bg-rose-50 hover:bg-rose-100 transition-colors"
                      title="Archive Course"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* SECTION 27: CREATE / EDIT COURSE MODAL */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 sm:p-8 shadow-2xl border border-slate-100 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center pb-4 mb-4 border-b border-slate-100">
              <h3 className="text-xl font-extrabold text-slate-900">
                {editingCourse ? 'Edit Course Details' : 'Create New Course'}
              </h3>
              <button
                onClick={() => setModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Course Title *
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Master Artificial Intelligence & Machine Learning"
                  required
                  className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                    Instructor Name *
                  </label>
                  <input
                    type="text"
                    value={instructorName}
                    onChange={(e) => setInstructorName(e.target.value)}
                    placeholder="e.g. Dr. Rajesh Verma"
                    required
                    className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                    Course Fee (INR ₹) *
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    placeholder="9999"
                    required
                    className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-brand-500 focus:border-brand-500 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                    Duration (Hours) *
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={durationHours}
                    onChange={(e) => setDurationHours(e.target.value)}
                    placeholder="80"
                    required
                    className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                    Thumbnail Image URL
                  </label>
                  <input
                    type="url"
                    value={thumbnailUrl}
                    onChange={(e) => setThumbnailUrl(e.target.value)}
                    placeholder="https://images.unsplash.com/..."
                    className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Short Description * (Visible in catalog cards)
                </label>
                <input
                  type="text"
                  value={shortDescription}
                  onChange={(e) => setShortDescription(e.target.value)}
                  placeholder="Concise 1-sentence summary of the program"
                  required
                  className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Full Course Description *
                </label>
                <textarea
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Detailed breakdown of syllabus, prerequisites, and learning outcomes"
                  required
                  className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                ></textarea>
              </div>

              <div className="flex items-center space-x-2 pt-2">
                <input
                  type="checkbox"
                  id="publishToggle"
                  checked={isPublished}
                  onChange={(e) => setIsPublished(e.target.checked)}
                  className="w-4 h-4 text-brand-600 rounded border-slate-300 focus:ring-brand-500"
                />
                <label htmlFor="publishToggle" className="text-sm font-semibold text-slate-800">
                  Publish immediately (students can view in course catalogue)
                </label>
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-xl text-sm font-bold text-white bg-brand-600 hover:bg-brand-700 shadow-md shadow-brand-600/20 disabled:opacity-50"
                >
                  {submitting ? 'Saving...' : editingCourse ? 'Save Changes' : 'Create Course'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
