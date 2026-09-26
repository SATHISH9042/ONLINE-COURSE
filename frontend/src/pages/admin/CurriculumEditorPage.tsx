import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  adminCourseService,
  CourseDetailWithCurriculum,
  TopicDetail,
  SubtopicDetail,
} from '../../services/adminCourseService';
import {
  Layers,
  Plus,
  Video,
  Code,
  HelpCircle,
  Trash2,
  ArrowLeft,
  ChevronDown,
  ChevronRight,
  CheckCircle2,
  Clock,
  FileText,
  RefreshCw,
  X,
  AlertCircle,
} from 'lucide-react';

export const CurriculumEditorPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [course, setCourse] = useState<CourseDetailWithCurriculum | null>(null);
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Modals
  const [topicModalOpen, setTopicModalOpen] = useState(false);
  const [topicTitle, setTopicTitle] = useState('');
  const [topicDesc, setTopicDesc] = useState('');

  const [subtopicModalOpen, setSubtopicModalOpen] = useState(false);
  const [selectedTopicId, setSelectedTopicId] = useState<string>('');
  const [subtopicTitle, setSubtopicTitle] = useState('');

  const [videoModalOpen, setVideoModalOpen] = useState(false);
  const [activeSubtopicId, setActiveSubtopicId] = useState<string>('');
  const [videoTitle, setVideoTitle] = useState('');
  const [videoStorageKey, setVideoStorageKey] = useState('');
  const [videoDuration, setVideoDuration] = useState('600');
  const [videoIsPreview, setVideoIsPreview] = useState(false);

  const [codingModalOpen, setCodingModalOpen] = useState(false);
  const [codingTitle, setCodingTitle] = useState('');
  const [codingDesc, setCodingDesc] = useState('');
  const [codingInputFormat, setCodingInputFormat] = useState('Input array of integers');
  const [codingOutputFormat, setCodingOutputFormat] = useState('Target integer result');
  const [codingSampleInput, setCodingSampleInput] = useState('[1, 2, 3]');
  const [codingSampleOutput, setCodingSampleOutput] = useState('6');

  const [mcqModalOpen, setMcqModalOpen] = useState(false);
  const [mcqQuestion, setMcqQuestion] = useState('');
  const [opt1, setOpt1] = useState('');
  const [opt2, setOpt2] = useState('');
  const [opt3, setOpt3] = useState('');
  const [opt4, setOpt4] = useState('');
  const [correctOptIndex, setCorrectOptIndex] = useState(0);

  const fetchCurriculum = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const res = await adminCourseService.getCourseDetails(id);
      if (res.success && res.data) {
        setCourse(res.data);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCurriculum();
  }, [id]);

  // Topic creation
  const handleCreateTopic = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;
    try {
      const res = await adminCourseService.createTopic(id, {
        title: topicTitle.trim(),
        description: topicDesc.trim() || undefined,
      });
      if (res.success) {
        setFeedback({ type: 'success', message: 'Topic created successfully.' });
        setTopicModalOpen(false);
        setTopicTitle('');
        setTopicDesc('');
        fetchCurriculum();
      }
    } catch {
      setFeedback({ type: 'error', message: 'Failed to create topic.' });
    }
  };

  // Subtopic creation
  const handleCreateSubtopic = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTopicId) return;
    try {
      const res = await adminCourseService.createSubtopic(selectedTopicId, {
        title: subtopicTitle.trim(),
      });
      if (res.success) {
        setFeedback({ type: 'success', message: 'Subtopic created successfully.' });
        setSubtopicModalOpen(false);
        setSubtopicTitle('');
        fetchCurriculum();
      }
    } catch {
      setFeedback({ type: 'error', message: 'Failed to create subtopic.' });
    }
  };

  // Video attachment
  const handleAttachVideo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeSubtopicId) return;
    try {
      const res = await adminCourseService.createVideo(activeSubtopicId, {
        title: videoTitle.trim(),
        storageKey: videoStorageKey.trim(),
        durationSeconds: parseInt(videoDuration, 10) || 0,
        isPreview: videoIsPreview,
      });
      if (res.success) {
        setFeedback({ type: 'success', message: 'Video lesson attached successfully.' });
        setVideoModalOpen(false);
        setVideoTitle('');
        setVideoStorageKey('');
        fetchCurriculum();
      }
    } catch {
      setFeedback({ type: 'error', message: 'Failed to attach video lesson.' });
    }
  };

  // Coding problem attachment
  const handleAttachCoding = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeSubtopicId) return;
    try {
      const res = await adminCourseService.createCodingProblem(activeSubtopicId, {
        title: codingTitle.trim(),
        description: codingDesc.trim(),
        inputFormat: codingInputFormat.trim(),
        outputFormat: codingOutputFormat.trim(),
        testCases: [
          { inputData: codingSampleInput.trim(), expectedOutput: codingSampleOutput.trim(), isHidden: false },
        ],
      });
      if (res.success) {
        setFeedback({ type: 'success', message: 'Coding practice problem attached successfully.' });
        setCodingModalOpen(false);
        setCodingTitle('');
        setCodingDesc('');
        fetchCurriculum();
      }
    } catch {
      setFeedback({ type: 'error', message: 'Failed to attach coding problem.' });
    }
  };

  // MCQ attachment
  const handleAttachMcq = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeSubtopicId) return;
    const options = [
      { optionText: opt1.trim(), isCorrect: correctOptIndex === 0 },
      { optionText: opt2.trim(), isCorrect: correctOptIndex === 1 },
      { optionText: opt3.trim(), isCorrect: correctOptIndex === 2 },
      { optionText: opt4.trim(), isCorrect: correctOptIndex === 3 },
    ].filter((o) => o.optionText.length > 0);

    try {
      const res = await adminCourseService.createMcq(activeSubtopicId, {
        questionText: mcqQuestion.trim(),
        options,
      });
      if (res.success) {
        setFeedback({ type: 'success', message: 'MCQ question attached successfully.' });
        setMcqModalOpen(false);
        setMcqQuestion('');
        setOpt1('');
        setOpt2('');
        setOpt3('');
        setOpt4('');
        fetchCurriculum();
      }
    } catch {
      setFeedback({ type: 'error', message: 'Failed to attach MCQ.' });
    }
  };

  // Delete helpers
  const handleDeleteTopic = async (topicId: string, title: string) => {
    if (!window.confirm(`Delete topic "${title}" and all its subtopics?`)) return;
    await adminCourseService.deleteTopic(topicId);
    fetchCurriculum();
  };

  const handleDeleteSubtopic = async (subId: string, title: string) => {
    if (!window.confirm(`Delete subtopic "${title}"?`)) return;
    await adminCourseService.deleteSubtopic(subId);
    fetchCurriculum();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <RefreshCw className="w-8 h-8 animate-spin text-brand-600 mx-auto" />
      </div>
    );
  }

  if (!course) {
    return (
      <div className="p-8 text-center">
        <p className="text-rose-600 font-bold">Course not found.</p>
        <Link to="/admin/courses" className="text-brand-600 underline mt-2 block">
          &larr; Back to Course List
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 pb-6">
        <div>
          <div className="flex items-center space-x-2">
            <Link to="/admin/courses" className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <div className="text-xs font-bold text-brand-600 uppercase tracking-wider">
                Curriculum Authoring Console
              </div>
              <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
                {course.title}
              </h1>
            </div>
          </div>
          <p className="text-xs text-slate-500 mt-1 pl-9">
            Instructor: <strong>{course.instructor_name}</strong> • Status:{' '}
            <strong className={course.is_published ? 'text-emerald-600' : 'text-slate-600'}>
              {course.is_published ? 'Published' : 'Draft'}
            </strong>
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={() => setTopicModalOpen(true)}
            className="inline-flex items-center px-4 py-2.5 rounded-xl text-xs font-bold text-white bg-brand-600 hover:bg-brand-700 shadow-sm"
          >
            <Plus className="w-4 h-4 mr-1.5" />
            Add Topic
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
            <AlertCircle className="w-5 h-5 text-rose-600 mr-2 mt-0.5 shrink-0" />
          )}
          <span className="text-sm font-medium">{feedback.message}</span>
        </div>
      )}

      {/* SECTION 27: TOPICS & SUBTOPICS HIERARCHY */}
      {course.topics.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 shadow-sm max-w-lg mx-auto">
          <Layers className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-lg font-bold text-slate-900">No Topics Created Yet</h3>
          <p className="text-sm text-slate-500 mt-1 mb-6">
            Begin structuring your course by adding the first Topic module.
          </p>
          <button
            onClick={() => setTopicModalOpen(true)}
            className="inline-flex items-center px-5 py-2.5 rounded-xl text-sm font-bold text-white bg-brand-600 hover:bg-brand-700 shadow-sm"
          >
            <Plus className="w-4 h-4 mr-1.5" />
            Add Topic Module
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {course.topics.map((topic, tIdx) => (
            <div
              key={topic.id}
              className="bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden"
            >
              {/* Topic Header Bar */}
              <div className="bg-slate-50/80 px-6 py-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="flex items-center space-x-3">
                  <span className="w-7 h-7 rounded-lg bg-slate-900 text-white font-bold text-xs flex items-center justify-center">
                    {tIdx + 1}
                  </span>
                  <div>
                    <h3 className="text-base font-bold text-slate-900">{topic.title}</h3>
                    {topic.description && (
                      <p className="text-xs text-slate-500 mt-0.5">{topic.description}</p>
                    )}
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => {
                      setSelectedTopicId(topic.id);
                      setSubtopicModalOpen(true);
                    }}
                    className="inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-semibold text-brand-700 bg-brand-50 hover:bg-brand-100 transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5 mr-1" />
                    Add Subtopic
                  </button>

                  <button
                    onClick={() => handleDeleteTopic(topic.id, topic.title)}
                    className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg"
                    title="Delete Topic"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Subtopics List */}
              <div className="p-6 space-y-4">
                {topic.subtopics.length === 0 ? (
                  <p className="text-xs text-slate-400 italic py-2">
                    No subtopics added under this topic. Click "Add Subtopic" above.
                  </p>
                ) : (
                  topic.subtopics.map((sub, sIdx) => (
                    <div
                      key={sub.id}
                      className="rounded-xl border border-slate-200 p-4 bg-slate-50/30 hover:bg-slate-50/60 transition-colors space-y-3"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-slate-100 pb-3">
                        <div className="flex items-center space-x-2">
                          <span className="text-xs font-mono font-bold text-slate-400">
                            {tIdx + 1}.{sIdx + 1}
                          </span>
                          <h4 className="text-sm font-bold text-slate-900">{sub.title}</h4>
                        </div>

                        {/* Content Attachment Quick Buttons */}
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => {
                              setActiveSubtopicId(sub.id);
                              setVideoModalOpen(true);
                            }}
                            className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium text-slate-700 bg-white border border-slate-200 hover:bg-blue-50 hover:text-brand-600 transition-colors"
                          >
                            <Video className="w-3.5 h-3.5 mr-1 text-brand-600" />
                            + Video
                          </button>

                          <button
                            onClick={() => {
                              setActiveSubtopicId(sub.id);
                              setCodingModalOpen(true);
                            }}
                            className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium text-slate-700 bg-white border border-slate-200 hover:bg-purple-50 hover:text-purple-600 transition-colors"
                          >
                            <Code className="w-3.5 h-3.5 mr-1 text-purple-600" />
                            + Coding
                          </button>

                          <button
                            onClick={() => {
                              setActiveSubtopicId(sub.id);
                              setMcqModalOpen(true);
                            }}
                            className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium text-slate-700 bg-white border border-slate-200 hover:bg-amber-50 hover:text-amber-600 transition-colors"
                          >
                            <HelpCircle className="w-3.5 h-3.5 mr-1 text-amber-600" />
                            + MCQ
                          </button>

                          <button
                            onClick={() => handleDeleteSubtopic(sub.id, sub.title)}
                            className="p-1 text-slate-300 hover:text-rose-600"
                            title="Delete Subtopic"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Display attached learning content items */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                        {/* Videos attached */}
                        <div className="bg-white p-3 rounded-lg border border-slate-200/80 text-xs space-y-1">
                          <div className="flex items-center justify-between font-bold text-slate-700">
                            <span className="flex items-center">
                              <Video className="w-3.5 h-3.5 mr-1 text-brand-600" /> Videos
                            </span>
                            <span className="px-1.5 py-0.5 rounded bg-blue-50 text-brand-700">
                              {sub.videos.length}
                            </span>
                          </div>
                          {sub.videos.map((v) => (
                            <div key={v.id} className="text-slate-600 truncate font-medium flex items-center justify-between pt-1">
                              <span>• {v.title}</span>
                              <span className="text-slate-400 font-mono text-[10px]">{Math.round(v.duration_seconds / 60)}m</span>
                            </div>
                          ))}
                        </div>

                        {/* Coding problems attached */}
                        <div className="bg-white p-3 rounded-lg border border-slate-200/80 text-xs space-y-1">
                          <div className="flex items-center justify-between font-bold text-slate-700">
                            <span className="flex items-center">
                              <Code className="w-3.5 h-3.5 mr-1 text-purple-600" /> Coding
                            </span>
                            <span className="px-1.5 py-0.5 rounded bg-purple-50 text-purple-700">
                              {sub.codingProblems.length}
                            </span>
                          </div>
                          {sub.codingProblems.map((cp) => (
                            <div key={cp.id} className="text-slate-600 truncate font-medium pt-1">
                              • {cp.title}
                            </div>
                          ))}
                        </div>

                        {/* MCQs attached */}
                        <div className="bg-white p-3 rounded-lg border border-slate-200/80 text-xs space-y-1">
                          <div className="flex items-center justify-between font-bold text-slate-700">
                            <span className="flex items-center">
                              <HelpCircle className="w-3.5 h-3.5 mr-1 text-amber-600" /> MCQs
                            </span>
                            <span className="px-1.5 py-0.5 rounded bg-amber-50 text-amber-700">
                              {sub.mcqs.length}
                            </span>
                          </div>
                          {sub.mcqs.map((q) => (
                            <div key={q.id} className="text-slate-600 truncate font-medium pt-1">
                              • {q.question_text}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 1. ADD TOPIC MODAL */}
      {topicModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-slate-900 mb-4">Add Topic Module</h3>
            <form onSubmit={handleCreateTopic} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase text-slate-700 mb-1">Topic Title *</label>
                <input
                  type="text"
                  value={topicTitle}
                  onChange={(e) => setTopicTitle(e.target.value)}
                  placeholder="e.g. Asynchronous Programming & Concurrency"
                  required
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl"
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase text-slate-700 mb-1">Description</label>
                <textarea
                  rows={2}
                  value={topicDesc}
                  onChange={(e) => setTopicDesc(e.target.value)}
                  placeholder="Brief summary of concepts covered"
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl"
                />
              </div>
              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setTopicModalOpen(false)}
                  className="px-4 py-2 text-sm text-slate-600"
                >
                  Cancel
                </button>
                <button type="submit" className="px-5 py-2 text-sm font-bold text-white bg-brand-600 rounded-xl">
                  Add Topic
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 2. ADD SUBTOPIC MODAL */}
      {subtopicModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-slate-900 mb-4">Add Subtopic Lesson</h3>
            <form onSubmit={handleCreateSubtopic} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase text-slate-700 mb-1">Subtopic Title *</label>
                <input
                  type="text"
                  value={subtopicTitle}
                  onChange={(e) => setSubtopicTitle(e.target.value)}
                  placeholder="e.g. Async/Await & Event Loop"
                  required
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl"
                />
              </div>
              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setSubtopicModalOpen(false)}
                  className="px-4 py-2 text-sm text-slate-600"
                >
                  Cancel
                </button>
                <button type="submit" className="px-5 py-2 text-sm font-bold text-white bg-brand-600 rounded-xl">
                  Add Subtopic
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 3. ATTACH VIDEO MODAL */}
      {videoModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-slate-900 mb-4">Attach Video Lesson</h3>
            <form onSubmit={handleAttachVideo} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase text-slate-700 mb-1">Lesson Title *</label>
                <input
                  type="text"
                  value={videoTitle}
                  onChange={(e) => setVideoTitle(e.target.value)}
                  placeholder="e.g. Mastering Event Loop & Microtask Queue"
                  required
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl"
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
                  Storage Reference / Key * (Cloudflare R2 / S3)
                </label>
                <input
                  type="text"
                  value={videoStorageKey}
                  onChange={(e) => setVideoStorageKey(e.target.value)}
                  placeholder="courses/js/async/lesson_01.mp4"
                  required
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl font-mono"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-700 mb-1">Duration (Seconds)</label>
                  <input
                    type="number"
                    value={videoDuration}
                    onChange={(e) => setVideoDuration(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl font-mono"
                  />
                </div>
                <div className="flex items-center pt-5">
                  <input
                    type="checkbox"
                    id="previewCheck"
                    checked={videoIsPreview}
                    onChange={(e) => setVideoIsPreview(e.target.checked)}
                    className="w-4 h-4 text-brand-600 rounded border-slate-300 mr-2"
                  />
                  <label htmlFor="previewCheck" className="text-xs font-semibold text-slate-700">
                    Free Preview Lesson
                  </label>
                </div>
              </div>
              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setVideoModalOpen(false)}
                  className="px-4 py-2 text-sm text-slate-600"
                >
                  Cancel
                </button>
                <button type="submit" className="px-5 py-2 text-sm font-bold text-white bg-brand-600 rounded-xl">
                  Attach Video
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 4. ATTACH CODING PROBLEM MODAL */}
      {codingModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-slate-900 mb-4">Add Coding Practice Problem</h3>
            <form onSubmit={handleAttachCoding} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase text-slate-700 mb-1">Problem Title *</label>
                <input
                  type="text"
                  value={codingTitle}
                  onChange={(e) => setCodingTitle(e.target.value)}
                  placeholder="e.g. Implement a Custom Promise.all"
                  required
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl"
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase text-slate-700 mb-1">Problem Description *</label>
                <textarea
                  rows={3}
                  value={codingDesc}
                  onChange={(e) => setCodingDesc(e.target.value)}
                  placeholder="Detailed problem specification and requirements"
                  required
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-700 mb-1">Sample Input</label>
                  <input
                    type="text"
                    value={codingSampleInput}
                    onChange={(e) => setCodingSampleInput(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-700 mb-1">Expected Output</label>
                  <input
                    type="text"
                    value={codingSampleOutput}
                    onChange={(e) => setCodingSampleOutput(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl font-mono"
                  />
                </div>
              </div>
              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setCodingModalOpen(false)}
                  className="px-4 py-2 text-sm text-slate-600"
                >
                  Cancel
                </button>
                <button type="submit" className="px-5 py-2 text-sm font-bold text-white bg-purple-600 rounded-xl">
                  Add Coding Exercise
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 5. ATTACH MCQ MODAL */}
      {mcqModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-slate-900 mb-4">Add MCQ Question</h3>
            <form onSubmit={handleAttachMcq} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase text-slate-700 mb-1">Question Text *</label>
                <textarea
                  rows={2}
                  value={mcqQuestion}
                  onChange={(e) => setMcqQuestion(e.target.value)}
                  placeholder="Which keyword prevents re-assignment in JavaScript?"
                  required
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl"
                />
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-bold uppercase text-slate-700">Options (Select correct choice)</label>
                {[
                  { val: opt1, set: setOpt1, idx: 0, placeholder: 'var' },
                  { val: opt2, set: setOpt2, idx: 1, placeholder: 'let' },
                  { val: opt3, set: setOpt3, idx: 2, placeholder: 'const' },
                  { val: opt4, set: setOpt4, idx: 3, placeholder: 'static' },
                ].map((opt) => (
                  <div key={opt.idx} className="flex items-center space-x-2">
                    <input
                      type="radio"
                      name="correctChoice"
                      checked={correctOptIndex === opt.idx}
                      onChange={() => setCorrectOptIndex(opt.idx)}
                      className="w-4 h-4 text-brand-600"
                    />
                    <input
                      type="text"
                      value={opt.val}
                      onChange={(e) => opt.set(e.target.value)}
                      placeholder={`Choice ${opt.idx + 1} (e.g. ${opt.placeholder})`}
                      required={opt.idx < 2}
                      className="flex-1 px-3 py-1.5 text-xs border border-slate-300 rounded-lg"
                    />
                  </div>
                ))}
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setMcqModalOpen(false)}
                  className="px-4 py-2 text-sm text-slate-600"
                >
                  Cancel
                </button>
                <button type="submit" className="px-5 py-2 text-sm font-bold text-white bg-amber-600 rounded-xl">
                  Add MCQ
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
