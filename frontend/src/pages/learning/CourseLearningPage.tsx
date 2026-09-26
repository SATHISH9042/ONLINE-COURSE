import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  learningService,
  CourseCurriculumResponse,
  SubtopicBundle,
  CodeEvaluationResult,
  McqSubmitResult,
  CurriculumTopic,
} from '../../services/learningService';
import { BACKEND_URL } from '../../services/api';
import {
  ArrowLeft,
  CheckCircle2,
  Circle,
  PlayCircle,
  Code2,
  HelpCircle,
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  RotateCcw,
  Play,
  Send,
  AlertCircle,
  Clock,
  Award,
  BookOpen,
  Menu,
  X,
  FileCheck,
} from 'lucide-react';

export const CourseLearningPage: React.FC = () => {
  const { courseId } = useParams<{ courseId: string }>();
  const navigate = useNavigate();

  // Curriculum state
  const [curriculum, setCurriculum] = useState<CourseCurriculumResponse | null>(null);
  const [selectedSubtopicId, setSelectedSubtopicId] = useState<string | null>(null);
  const [contentBundle, setContentBundle] = useState<SubtopicBundle | null>(null);
  const [expandedTopics, setExpandedTopics] = useState<Record<string, boolean>>({});
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Active activity tab: 'video' | 'coding' | 'mcq'
  const [activeTab, setActiveTab] = useState<'video' | 'coding' | 'mcq'>('video');

  // Video state
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [videoProgressPercent, setVideoProgressPercent] = useState<number>(0);
  const [videoWatchSeconds, setVideoWatchSeconds] = useState<number>(0);

  // Coding state
  const [selectedProblemId, setSelectedProblemId] = useState<string | null>(null);
  const [codeLanguage, setCodeLanguage] = useState<string>('javascript');
  const [userCode, setUserCode] = useState<string>('');
  const [isRunningCode, setIsRunningCode] = useState<boolean>(false);
  const [isSubmittingCode, setIsSubmittingCode] = useState<boolean>(false);
  const [codeRunResult, setCodeRunResult] = useState<CodeEvaluationResult | null>(null);

  // MCQ state
  const [mcqAnswers, setMcqAnswers] = useState<Record<string, string>>({});
  const [currentMcqIndex, setCurrentMcqIndex] = useState<number>(0);
  const [isSubmittingMcq, setIsSubmittingMcq] = useState<boolean>(false);
  const [mcqResult, setMcqResult] = useState<McqSubmitResult | null>(null);

  // UI status
  const [loading, setLoading] = useState(true);
  const [contentLoading, setContentLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // 1. Fetch Curriculum on mount
  useEffect(() => {
    if (!courseId) return;

    async function loadCurriculum() {
      setLoading(true);
      setErrorMessage(null);
      const res = await learningService.getCourseCurriculum(courseId!);

      if (!res.success || !res.data) {
        if (res.code === 'COURSE_NOT_ENROLLED') {
          setErrorMessage('You are not currently enrolled in this course. Please browse and enroll to access lessons.');
        } else {
          setErrorMessage(res.message || 'Failed to load course curriculum.');
        }
        setLoading(false);
        return;
      }

      setCurriculum(res.data);

      // Expand all topics by default
      const expMap: Record<string, boolean> = {};
      res.data.topics.forEach((t: CurriculumTopic) => {
        expMap[t.id] = true;
      });
      setExpandedTopics(expMap);

      // Section 13: Automatically open first subtopic or last accessed lesson
      const initialSubtopicId =
        res.data.lastAccessedSubtopicId ||
        (res.data.topics[0]?.subtopics[0]?.id ?? null);

      setSelectedSubtopicId(initialSubtopicId);
      setLoading(false);
    }

    loadCurriculum();
  }, [courseId]);

  // 2. Fetch Subtopic content whenever selectedSubtopicId changes
  useEffect(() => {
    if (!selectedSubtopicId) return;

    async function loadSubtopic() {
      setContentLoading(true);
      setCodeRunResult(null);
      setMcqResult(null);
      setMcqAnswers({});
      setCurrentMcqIndex(0);

      const res = await learningService.getSubtopicContent(selectedSubtopicId!);
      if (res.success && res.data) {
        setContentBundle(res.data);

        // Set default activity tab based on available content (Section 13: first available activity)
        if (res.data.videos.length > 0) {
          setActiveTab('video');
          const firstVid = res.data.videos[0];
          setVideoWatchSeconds(firstVid.watchSeconds);
          if (firstVid.durationSeconds > 0) {
            setVideoProgressPercent(
              Math.min(100, Math.round((firstVid.watchSeconds / firstVid.durationSeconds) * 100))
            );
          }
        } else if (res.data.codingProblems.length > 0) {
          setActiveTab('coding');
        } else if (res.data.mcqs.length > 0) {
          setActiveTab('mcq');
        }

        // Initialize coding problem if available
        if (res.data.codingProblems.length > 0) {
          const firstProb = res.data.codingProblems[0];
          setSelectedProblemId(firstProb.id);
          const lang = firstProb.allowedLanguages[0] || 'javascript';
          setCodeLanguage(lang);

          const starterCode =
            firstProb.latestSubmission?.code ||
            firstProb.defaultCode[lang] ||
            '// Write your solution here\n';
          setUserCode(starterCode);
        }

        // Initialize MCQ result if already attempted
        if (res.data.latestMcqAttempt) {
          // Can display previous score
        }
      }
      setContentLoading(false);
    }

    loadSubtopic();
  }, [selectedSubtopicId]);

  // Topic accordion toggle
  const toggleTopic = (topicId: string) => {
    setExpandedTopics((prev) => ({ ...prev, [topicId]: !prev[topicId] }));
  };

  // Video progress synchronization (Section 14)
  const handleTimeUpdate = () => {
    if (!videoRef.current || !contentBundle?.videos[0]) return;
    const currentTime = videoRef.current.currentTime;
    const duration = videoRef.current.duration || contentBundle.videos[0].durationSeconds;

    if (duration > 0) {
      const pct = Math.min(100, Math.round((currentTime / duration) * 100));
      setVideoProgressPercent(pct);
      setVideoWatchSeconds(Math.round(currentTime));
    }
  };

  // Periodic video save or on pause
  const syncVideoProgress = async () => {
    if (!videoRef.current || !contentBundle?.videos[0]) return;
    const currentVideo = contentBundle.videos[0];
    const currentTime = videoRef.current.currentTime;
    const duration = videoRef.current.duration || currentVideo.durationSeconds;

    await learningService.trackVideoProgress(currentVideo.id, {
      watchSeconds: Math.round(currentTime),
      lastPositionSeconds: Math.round(currentTime),
      durationSeconds: Math.round(duration),
    });
  };

  // Toggle Subtopic Completion (Section 14 & 15)
  const handleToggleCompletion = async () => {
    if (!selectedSubtopicId || !curriculum) return;
    const currentStatus = contentBundle?.subtopic.isCompleted ?? false;
    const newStatus = !currentStatus;

    const res = await learningService.toggleSubtopicCompletion(selectedSubtopicId, newStatus);
    if (res.success && res.data) {
      // Update local bundle
      if (contentBundle) {
        setContentBundle({
          ...contentBundle,
          subtopic: {
            ...contentBundle.subtopic,
            isCompleted: res.data.isCompleted,
            completedAt: res.data.completedAt,
          },
        });
      }

      // Update curriculum tree
      setCurriculum({
        ...curriculum,
        topics: curriculum.topics.map((t) => ({
          ...t,
          subtopics: t.subtopics.map((st) =>
            st.id === selectedSubtopicId ? { ...st, is_completed: res.data!.isCompleted } : st
          ),
        })),
        metrics: {
          ...curriculum.metrics,
          progressPercentage: res.data.progressPercentage,
          completedSubtopics: newStatus
            ? curriculum.metrics.completedSubtopics + 1
            : Math.max(0, curriculum.metrics.completedSubtopics - 1),
        },
      });
    }
  };

  // Run Code in Sandbox (Section 16 & 31)
  const handleRunCode = async () => {
    if (!selectedProblemId) return;
    setIsRunningCode(true);
    setCodeRunResult(null);

    const res = await learningService.runStudentCode(selectedProblemId, {
      code: userCode,
      language: codeLanguage,
    });

    if (res.success && res.data) {
      setCodeRunResult(res.data);
    }
    setIsRunningCode(false);
  };

  // Submit Code Solution (Section 16 & 31)
  const handleSubmitCode = async () => {
    if (!selectedProblemId) return;
    setIsSubmittingCode(true);

    const res = await learningService.submitStudentCode(selectedProblemId, {
      code: userCode,
      language: codeLanguage,
    });

    if (res.success && res.data) {
      setCodeRunResult(res.data);
    }
    setIsSubmittingCode(false);
  };

  // Submit MCQ Quiz (Section 17)
  const handleSubmitMcq = async () => {
    if (!selectedSubtopicId) return;
    setIsSubmittingMcq(true);

    const formattedAnswers = Object.entries(mcqAnswers).map(([questionId, selectedOptionId]) => ({
      questionId,
      selectedOptionId,
    }));

    const res = await learningService.submitMcqAttempt(selectedSubtopicId, {
      answers: formattedAnswers,
    });

    if (res.success && res.data) {
      setMcqResult(res.data);
    }
    setIsSubmittingMcq(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center text-white">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-slate-400 font-medium">Loading Course Experience...</p>
        </div>
      </div>
    );
  }

  if (errorMessage || !curriculum) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6">
        <div className="bg-slate-800 border border-slate-700 max-w-md w-full rounded-2xl p-6 text-center shadow-xl">
          <AlertCircle className="w-12 h-12 text-rose-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-white mb-2">Access Restricted</h2>
          <p className="text-slate-300 text-sm mb-6">{errorMessage}</p>
          <button
            onClick={() => navigate('/student/courses')}
            className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl transition"
          >
            Back to My Courses
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Top Header */}
      <header className="h-16 bg-slate-900 border-b border-slate-800 flex items-center justify-between px-4 lg:px-6 shrink-0 z-30">
        <div className="flex items-center gap-3">
          <Link
            to="/student/courses"
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition"
            title="Back to My Courses"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="hidden sm:block">
            <h1 className="text-base font-bold text-white truncate max-w-xs md:max-w-md">
              {curriculum.course.title}
            </h1>
            <p className="text-xs text-slate-400 flex items-center gap-2">
              <span>{curriculum.metrics.completedSubtopics} / {curriculum.metrics.totalSubtopics} completed</span>
              <span>•</span>
              <span className="text-indigo-400 font-semibold">{curriculum.metrics.progressPercentage}% Progress</span>
            </p>
          </div>
        </div>

        {/* Progress Bar & Actions */}
        <div className="flex items-center gap-3">
          <div className="hidden md:flex items-center gap-2 w-48">
            <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden border border-slate-700">
              <div
                className="bg-indigo-500 h-full rounded-full transition-all duration-500"
                style={{ width: `${curriculum.metrics.progressPercentage}%` }}
              ></div>
            </div>
            <span className="text-xs text-slate-400 font-mono font-bold">
              {curriculum.metrics.progressPercentage}%
            </span>
          </div>

          <button
            onClick={handleToggleCompletion}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition ${contentBundle?.subtopic.isCompleted
                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700'
              }`}
          >
            {contentBundle?.subtopic.isCompleted ? (
              <>
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>Completed</span>
              </>
            ) : (
              <>
                <Circle className="w-4 h-4 text-slate-400" />
                <span>Mark Complete</span>
              </>
            )}
          </button>

          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="lg:hidden p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition"
          >
            {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </header>

      {/* Main Layout: 2 Columns */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Left Sidebar: Collapsible Syllabus Tree (Section 12) */}
        <aside
          className={`fixed lg:static top-16 bottom-0 left-0 w-80 bg-slate-900 border-r border-slate-800 overflow-y-auto transition-transform duration-300 z-20 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
            }`}
        >
          <div className="p-4 border-b border-slate-800/80">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-indigo-400" /> Course Syllabus
            </h2>
          </div>

          <div className="p-2 space-y-2">
            {curriculum.topics.map((topic, topicIdx) => (
              <div key={topic.id} className="rounded-xl overflow-hidden border border-slate-800/60 bg-slate-950/40">
                <button
                  onClick={() => toggleTopic(topic.id)}
                  className="w-full px-3 py-2.5 flex items-center justify-between text-left hover:bg-slate-800/50 transition"
                >
                  <span className="text-xs font-semibold text-slate-300 flex items-center gap-2 truncate">
                    <span className="text-indigo-400 font-mono">Topic {topicIdx + 1}:</span>
                    <span className="truncate">{topic.title}</span>
                  </span>
                  {expandedTopics[topic.id] ? (
                    <ChevronDown className="w-4 h-4 text-slate-500 shrink-0" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-slate-500 shrink-0" />
                  )}
                </button>

                {expandedTopics[topic.id] && (
                  <div className="p-1.5 space-y-1 bg-slate-900/60 border-t border-slate-800/40">
                    {topic.subtopics.map((subtopic) => {
                      const isSelected = subtopic.id === selectedSubtopicId;
                      return (
                        <button
                          key={subtopic.id}
                          onClick={() => {
                            setSelectedSubtopicId(subtopic.id);
                            setSidebarOpen(false);
                          }}
                          className={`w-full px-3 py-2 rounded-lg text-left text-xs flex items-center justify-between transition ${isSelected
                              ? 'bg-indigo-600 text-white font-medium shadow-md shadow-indigo-600/20'
                              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                            }`}
                        >
                          <div className="flex items-center gap-2 truncate">
                            {/* Section 15: Subtopic Completion Status */}
                            {subtopic.is_completed ? (
                              <CheckCircle2
                                className={`w-4 h-4 shrink-0 ${isSelected ? 'text-white' : 'text-emerald-400'
                                  }`}
                              />
                            ) : (
                              <Circle
                                className={`w-4 h-4 shrink-0 ${isSelected ? 'text-white/60' : 'text-slate-600'
                                  }`}
                              />
                            )}
                            <span className="truncate">{subtopic.title}</span>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0 ml-2 opacity-75">
                            {subtopic.activities.videos > 0 && (
                              <PlayCircle className="w-3.5 h-3.5" />
                            )}
                            {subtopic.activities.coding > 0 && (
                              <Code2 className="w-3.5 h-3.5" />
                            )}
                            {subtopic.activities.mcqs > 0 && (
                              <HelpCircle className="w-3.5 h-3.5" />
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            ))}
          </div>
        </aside>

        {/* Backdrop for mobile sidebar */}
        {sidebarOpen && (
          <div
            onClick={() => setSidebarOpen(false)}
            className="fixed inset-0 bg-black/60 z-10 lg:hidden"
          ></div>
        )}

        {/* Right Main Content Area */}
        <main className="flex-1 flex flex-col bg-slate-950 overflow-y-auto">
          {contentLoading ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : contentBundle ? (
            <div className="flex-1 flex flex-col">
              {/* Subtopic Banner & Activity Navigation Tabs */}
              <div className="p-4 lg:p-6 bg-slate-900/60 border-b border-slate-800">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <span className="text-xs font-semibold text-indigo-400 uppercase tracking-wider">
                      {contentBundle.subtopic.topicTitle}
                    </span>
                    <h2 className="text-xl font-bold text-white mt-0.5">
                      {contentBundle.subtopic.title}
                    </h2>
                  </div>

                  {/* Previous / Next Lesson Navigation (Section 14) */}
                  <div className="flex items-center gap-2">
                    <button
                      disabled={!contentBundle.navigation.prevSubtopicId}
                      onClick={() =>
                        contentBundle.navigation.prevSubtopicId &&
                        setSelectedSubtopicId(contentBundle.navigation.prevSubtopicId)
                      }
                      className="px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:pointer-events-none text-slate-300 flex items-center gap-1 border border-slate-700 transition"
                    >
                      <ChevronLeft className="w-4 h-4" /> Previous
                    </button>
                    <button
                      disabled={!contentBundle.navigation.nextSubtopicId}
                      onClick={() =>
                        contentBundle.navigation.nextSubtopicId &&
                        setSelectedSubtopicId(contentBundle.navigation.nextSubtopicId)
                      }
                      className="px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:pointer-events-none text-slate-300 flex items-center gap-1 border border-slate-700 transition"
                    >
                      Next <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Activity Tabs */}
                <div className="flex items-center gap-2 mt-5">
                  {contentBundle.videos.length > 0 && (
                    <button
                      onClick={() => setActiveTab('video')}
                      className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition ${activeTab === 'video'
                          ? 'bg-indigo-600 text-white shadow'
                          : 'bg-slate-800 hover:bg-slate-700 text-slate-400'
                        }`}
                    >
                      <PlayCircle className="w-4 h-4" /> Video Lesson
                    </button>
                  )}
                  {contentBundle.codingProblems.length > 0 && (
                    <button
                      onClick={() => setActiveTab('coding')}
                      className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition ${activeTab === 'coding'
                          ? 'bg-indigo-600 text-white shadow'
                          : 'bg-slate-800 hover:bg-slate-700 text-slate-400'
                        }`}
                    >
                      <Code2 className="w-4 h-4" /> Coding Practice
                    </button>
                  )}
                  {contentBundle.mcqs.length > 0 && (
                    <button
                      onClick={() => setActiveTab('mcq')}
                      className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition ${activeTab === 'mcq'
                          ? 'bg-indigo-600 text-white shadow'
                          : 'bg-slate-800 hover:bg-slate-700 text-slate-400'
                        }`}
                    >
                      <HelpCircle className="w-4 h-4" /> MCQ Assessment
                    </button>
                  )}
                </div>
              </div>

              {/* View 1: Video Learning View (Section 14 & 30) */}
              {activeTab === 'video' && contentBundle.videos.length > 0 && (
                <div className="p-4 lg:p-6 space-y-6 max-w-5xl">
                  {contentBundle.videos.map((vid) => (
                    <div key={vid.id} className="space-y-4">
                      {/* Video Player */}
                      <div className="relative aspect-video bg-black rounded-2xl overflow-hidden border border-slate-800 shadow-2xl">
                        <video
                          ref={videoRef}
                          src={
                            vid.streamUrl
                              ? vid.streamUrl.startsWith('http')
                                ? vid.streamUrl
                                : `${BACKEND_URL}${vid.streamUrl}`
                              : ''
                          }
                          controls
                          onTimeUpdate={handleTimeUpdate}
                          onPause={syncVideoProgress}
                          onEnded={syncVideoProgress}
                          className="w-full h-full object-contain"
                        />
                      </div>

                      {/* Video Info and Progress */}
                      <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div>
                          <h3 className="text-lg font-bold text-white">{vid.title}</h3>
                          {vid.description && (
                            <p className="text-sm text-slate-400 mt-1">{vid.description}</p>
                          )}
                        </div>

                        <div className="flex items-center gap-4 shrink-0">
                          <div className="text-right">
                            <span className="text-xs text-slate-400 block">Watch Progress</span>
                            <span className="text-sm font-bold text-indigo-400 font-mono">
                              {videoProgressPercent}%
                            </span>
                          </div>
                          <div className="w-24 bg-slate-800 rounded-full h-2 overflow-hidden border border-slate-700">
                            <div
                              className="bg-indigo-500 h-full rounded-full transition-all"
                              style={{ width: `${videoProgressPercent}%` }}
                            ></div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* View 2: Coding Practice View (Section 16 & 31) */}
              {activeTab === 'coding' && contentBundle.codingProblems.length > 0 && (
                <div className="p-4 lg:p-6 flex-1 flex flex-col space-y-4 max-w-6xl">
                  {contentBundle.codingProblems.map((problem) => (
                    <div key={problem.id} className="grid grid-cols-1 lg:grid-cols-2 gap-6 flex-1">
                      {/* Left: Problem Description */}
                      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 overflow-y-auto space-y-4">
                        <div>
                          <span className="text-xs font-bold text-indigo-400 uppercase tracking-wider">
                            Problem
                          </span>
                          <h3 className="text-lg font-bold text-white mt-0.5">{problem.title}</h3>
                        </div>

                        <div className="text-sm text-slate-300 whitespace-pre-line leading-relaxed">
                          {problem.description}
                        </div>

                        {problem.inputFormat && (
                          <div>
                            <h4 className="text-xs font-bold uppercase text-slate-400 mb-1">
                              Input Format
                            </h4>
                            <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800 text-xs font-mono text-slate-300">
                              {problem.inputFormat}
                            </div>
                          </div>
                        )}

                        {problem.outputFormat && (
                          <div>
                            <h4 className="text-xs font-bold uppercase text-slate-400 mb-1">
                              Output Format
                            </h4>
                            <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800 text-xs font-mono text-slate-300">
                              {problem.outputFormat}
                            </div>
                          </div>
                        )}

                        {problem.constraints && (
                          <div>
                            <h4 className="text-xs font-bold uppercase text-slate-400 mb-1">
                              Constraints
                            </h4>
                            <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800 text-xs font-mono text-slate-300">
                              {problem.constraints}
                            </div>
                          </div>
                        )}

                        {/* Sample Test Cases */}
                        {problem.testCases.length > 0 && (
                          <div className="space-y-2">
                            <h4 className="text-xs font-bold uppercase text-slate-400">
                              Sample Test Cases
                            </h4>
                            {problem.testCases.map((tc, idx) => (
                              <div
                                key={tc.id}
                                className="bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs space-y-2"
                              >
                                <div>
                                  <span className="text-slate-500 font-semibold block">Input:</span>
                                  <pre className="text-indigo-300 font-mono mt-0.5">{tc.input}</pre>
                                </div>
                                <div>
                                  <span className="text-slate-500 font-semibold block">
                                    Expected Output:
                                  </span>
                                  <pre className="text-emerald-400 font-mono mt-0.5">
                                    {tc.expectedOutput}
                                  </pre>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Right: Code Editor & Execution Console */}
                      <div className="flex flex-col space-y-4">
                        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden flex flex-col flex-1 shadow-lg">
                          {/* Editor Header Bar */}
                          <div className="p-3 bg-slate-950/80 border-b border-slate-800 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-semibold text-slate-400">Language:</span>
                              <select
                                value={codeLanguage}
                                onChange={(e) => setCodeLanguage(e.target.value)}
                                className="bg-slate-800 text-xs text-slate-200 border border-slate-700 rounded-lg px-2.5 py-1 focus:outline-none focus:border-indigo-500 font-medium"
                              >
                                {problem.allowedLanguages.map((lang) => (
                                  <option key={lang} value={lang}>
                                    {lang.toUpperCase()}
                                  </option>
                                ))}
                              </select>
                            </div>

                            <button
                              onClick={() => {
                                const starter =
                                  problem.defaultCode[codeLanguage] || '// Write your solution here\n';
                                setUserCode(starter);
                              }}
                              className="text-xs text-slate-400 hover:text-slate-200 flex items-center gap-1 transition"
                              title="Reset starter code"
                            >
                              <RotateCcw className="w-3.5 h-3.5" /> Reset
                            </button>
                          </div>

                          {/* Code Input Area */}
                          <textarea
                            value={userCode}
                            onChange={(e) => setUserCode(e.target.value)}
                            rows={14}
                            spellCheck={false}
                            className="w-full flex-1 p-4 bg-slate-950 font-mono text-xs text-slate-200 resize-none focus:outline-none leading-relaxed border-b border-slate-800"
                            placeholder="Type your code here..."
                          />

                          {/* Action Toolbar */}
                          <div className="p-3 bg-slate-900 flex items-center justify-between">
                            <span className="text-xs text-slate-500 flex items-center gap-1">
                              <Clock className="w-3.5 h-3.5" /> Limit: {problem.timeLimitMs}ms
                            </span>

                            <div className="flex items-center gap-2">
                              <button
                                disabled={isRunningCode || isSubmittingCode}
                                onClick={handleRunCode}
                                className="px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 flex items-center gap-1.5 transition disabled:opacity-50"
                              >
                                <Play className="w-3.5 h-3.5 text-indigo-400" />
                                {isRunningCode ? 'Running...' : 'Run Code'}
                              </button>
                              <button
                                disabled={isRunningCode || isSubmittingCode}
                                onClick={handleSubmitCode}
                                className="px-4 py-1.5 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white flex items-center gap-1.5 transition disabled:opacity-50 shadow-md shadow-indigo-600/20"
                              >
                                <Send className="w-3.5 h-3.5" />
                                {isSubmittingCode ? 'Submitting...' : 'Submit'}
                              </button>
                            </div>
                          </div>
                        </div>

                        {/* Test Results Output Console */}
                        {codeRunResult && (
                          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <span
                                  className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider ${codeRunResult.status === 'ACCEPTED'
                                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                                      : 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
                                    }`}
                                >
                                  {codeRunResult.status.replace(/_/g, ' ')}
                                </span>
                                <span className="text-xs text-slate-400 font-mono">
                                  Passed: {codeRunResult.testCasesPassed} /{' '}
                                  {codeRunResult.totalTestCases}
                                </span>
                              </div>
                              <span className="text-xs text-slate-500 font-mono">
                                Execution: {codeRunResult.executionTimeMs}ms
                              </span>
                            </div>

                            {/* Details per test case */}
                            <div className="space-y-2">
                              {codeRunResult.results.map((r) => (
                                <div
                                  key={r.testCaseIndex}
                                  className={`p-2.5 rounded-lg border text-xs font-mono flex items-center justify-between ${r.passed
                                      ? 'bg-emerald-950/20 border-emerald-800/40 text-emerald-300'
                                      : 'bg-rose-950/20 border-rose-800/40 text-rose-300'
                                    }`}
                                >
                                  <div className="flex items-center gap-2">
                                    {r.passed ? (
                                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                                    ) : (
                                      <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                                    )}
                                    <span>
                                      Case {r.testCaseIndex} {r.isHidden ? '(Hidden)' : ''}:
                                    </span>
                                    {!r.isHidden && (
                                      <span className="text-slate-400 truncate max-w-xs">
                                        Expected: {r.expectedOutput} | Output: {r.actualOutput}
                                      </span>
                                    )}
                                  </div>
                                  <span className="text-slate-500 text-[10px]">
                                    {r.executionTimeMs}ms
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* View 3: MCQ Assessment View (Section 17) */}
              {activeTab === 'mcq' && contentBundle.mcqs.length > 0 && (
                <div className="p-4 lg:p-6 flex-1 flex flex-col space-y-6 max-w-3xl mx-auto w-full">
                  {!mcqResult ? (
                    /* Quiz Stepper View */
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6 shadow-xl">
                      <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                        <span className="text-xs font-bold uppercase tracking-wider text-indigo-400">
                          Question {currentMcqIndex + 1} of {contentBundle.mcqs.length}
                        </span>
                        <span className="text-xs text-slate-400 font-mono">
                          {Object.keys(mcqAnswers).length} answered
                        </span>
                      </div>

                      {/* Current Question */}
                      {contentBundle.mcqs[currentMcqIndex] && (
                        <div className="space-y-4">
                          <h3 className="text-base font-semibold text-white leading-relaxed">
                            {contentBundle.mcqs[currentMcqIndex].questionText}
                          </h3>

                          {/* Options Radio List */}
                          <div className="space-y-2.5">
                            {contentBundle.mcqs[currentMcqIndex].options.map((opt) => {
                              const qId = contentBundle.mcqs[currentMcqIndex].id;
                              const isSelected = mcqAnswers[qId] === opt.id;
                              return (
                                <button
                                  key={opt.id}
                                  onClick={() =>
                                    setMcqAnswers((prev) => ({ ...prev, [qId]: opt.id }))
                                  }
                                  className={`w-full p-3.5 rounded-xl text-left text-sm flex items-center justify-between border transition ${isSelected
                                      ? 'bg-indigo-600/20 border-indigo-500 text-white font-medium'
                                      : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700 hover:bg-slate-850'
                                    }`}
                                >
                                  <span>{opt.text}</span>
                                  <div
                                    className={`w-4 h-4 rounded-full border flex items-center justify-center ${isSelected
                                        ? 'border-indigo-400 bg-indigo-500'
                                        : 'border-slate-600'
                                      }`}
                                  >
                                    {isSelected && <div className="w-1.5 h-1.5 bg-white rounded-full"></div>}
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Navigation & Submit */}
                      <div className="flex items-center justify-between pt-4 border-t border-slate-800">
                        <button
                          disabled={currentMcqIndex === 0}
                          onClick={() => setCurrentMcqIndex((prev) => Math.max(0, prev - 1))}
                          className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 disabled:opacity-30 disabled:pointer-events-none text-slate-300 border border-slate-700 transition"
                        >
                          Previous
                        </button>

                        {currentMcqIndex < contentBundle.mcqs.length - 1 ? (
                          <button
                            onClick={() => setCurrentMcqIndex((prev) => prev + 1)}
                            className="px-5 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white transition shadow"
                          >
                            Next Question
                          </button>
                        ) : (
                          <button
                            disabled={isSubmittingMcq}
                            onClick={handleSubmitMcq}
                            className="px-6 py-2.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white transition shadow-lg shadow-emerald-600/20 disabled:opacity-50 flex items-center gap-2"
                          >
                            <FileCheck className="w-4 h-4" />
                            {isSubmittingMcq ? 'Grading...' : 'Submit Assessment'}
                          </button>
                        )}
                      </div>
                    </div>
                  ) : (
                    /* Quiz Results and Answers Review (Section 17) */
                    <div className="space-y-6">
                      <div
                        className={`p-6 rounded-2xl border text-center space-y-3 ${mcqResult.passed
                            ? 'bg-emerald-950/20 border-emerald-800/40'
                            : 'bg-rose-950/20 border-rose-800/40'
                          }`}
                      >
                        <Award
                          className={`w-12 h-12 mx-auto ${mcqResult.passed ? 'text-emerald-400' : 'text-rose-400'
                            }`}
                        />
                        <h3 className="text-xl font-bold text-white">
                          Score: {mcqResult.score} / {mcqResult.totalQuestions}
                        </h3>
                        <p
                          className={`text-sm font-semibold ${mcqResult.passed ? 'text-emerald-400' : 'text-rose-400'
                            }`}
                        >
                          {mcqResult.percentage}% • {mcqResult.passed ? 'Passed (≥60%)' : 'Needs Practice (<60%)'}
                        </p>
                        <button
                          onClick={() => {
                            setMcqResult(null);
                            setMcqAnswers({});
                            setCurrentMcqIndex(0);
                          }}
                          className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 rounded-xl border border-slate-700 transition"
                        >
                          Retake Quiz
                        </button>
                      </div>

                      {/* Detailed Explanations */}
                      <div className="space-y-4">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                          Review Explanations
                        </h4>
                        {mcqResult.review.map((item, idx) => (
                          <div
                            key={item.questionId}
                            className={`p-4 rounded-xl border space-y-2 text-xs ${item.isCorrect
                                ? 'bg-slate-900 border-emerald-800/40'
                                : 'bg-slate-900 border-rose-800/40'
                              }`}
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-slate-200">
                                Question {idx + 1}
                              </span>
                              <span
                                className={`font-semibold ${item.isCorrect ? 'text-emerald-400' : 'text-rose-400'
                                  }`}
                              >
                                {item.isCorrect ? '✓ Correct' : '✗ Incorrect'}
                              </span>
                            </div>
                            <p className="text-slate-300 font-medium">{item.questionText}</p>
                            {item.explanation && (
                              <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800/80 text-slate-400">
                                <span className="text-slate-300 font-semibold block mb-0.5">
                                  Explanation:
                                </span>
                                {item.explanation}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center text-slate-500 text-sm">
              Select a subtopic from the syllabus sidebar to begin.
            </div>
          )}
        </main>
      </div>
    </div>
  );
};
