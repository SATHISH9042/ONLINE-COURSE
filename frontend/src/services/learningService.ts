import { api } from './api';

export interface CurriculumTopic {
  id: string;
  title: string;
  description?: string;
  sort_order: number;
  subtopics: CurriculumSubtopic[];
}

export interface CurriculumSubtopic {
  id: string;
  title: string;
  sort_order: number;
  is_completed: boolean;
  completed_at?: string;
  last_accessed_at?: string;
  activities: {
    videos: number;
    coding: number;
    mcqs: number;
  };
}

export interface CourseCurriculumResponse {
  course: {
    id: string;
    title: string;
    slug: string;
    description: string;
    thumbnail_url?: string;
    duration_hours: number;
  };
  topics: CurriculumTopic[];
  metrics: {
    totalSubtopics: number;
    completedSubtopics: number;
    progressPercentage: number;
  };
  lastAccessedSubtopicId: string | null;
}

export interface LearningVideo {
  id: string;
  title: string;
  description?: string;
  durationSeconds: number;
  sortOrder: number;
  watchSeconds: number;
  lastPositionSeconds: number;
  isCompleted: boolean;
  accessToken: string;
  streamUrl: string;
}

export interface CodingTestCase {
  id: string;
  input: string;
  expectedOutput: string;
}

export interface CodingProblem {
  id: string;
  title: string;
  description: string;
  inputFormat?: string;
  outputFormat?: string;
  constraints?: string;
  defaultCode: Record<string, string>;
  allowedLanguages: string[];
  timeLimitMs: number;
  memoryLimitMb: number;
  testCases: CodingTestCase[];
  latestSubmission?: {
    id: string;
    code: string;
    language: string;
    status: string;
    test_cases_passed: number;
    total_test_cases: number;
    score: number;
    submitted_at: string;
  };
}

export interface McqOption {
  id: string;
  text: string;
}

export interface McqQuestion {
  id: string;
  questionText: string;
  points: number;
  options: McqOption[];
}

export interface SubtopicBundle {
  subtopic: {
    id: string;
    title: string;
    sortOrder: number;
    topicId: string;
    topicTitle: string;
    courseId: string;
    isCompleted: boolean;
    completedAt?: string;
  };
  videos: LearningVideo[];
  codingProblems: CodingProblem[];
  mcqs: McqQuestion[];
  latestMcqAttempt?: {
    id: string;
    score: number;
    total_questions: number;
    percentage: number;
    passed: boolean;
    attempt_number: number;
    created_at: string;
  };
  navigation: {
    prevSubtopicId: string | null;
    nextSubtopicId: string | null;
    currentIndex: number;
    totalSubtopics: number;
  };
}

export interface TestCaseResult {
  testCaseIndex: number;
  input: string;
  expectedOutput: string;
  actualOutput: string;
  passed: boolean;
  isHidden: boolean;
  executionTimeMs: number;
  error?: string;
}

export interface CodeEvaluationResult {
  status: 'ACCEPTED' | 'WRONG_ANSWER' | 'TIME_LIMIT_EXCEEDED' | 'RUNTIME_ERROR' | 'COMPILATION_ERROR';
  testCasesPassed: number;
  totalTestCases: number;
  score: number;
  executionTimeMs: number;
  results: TestCaseResult[];
  stdout?: string;
  stderr?: string;
  submissionId?: string;
  submittedAt?: string;
}

export interface McqAnswerReview {
  questionId: string;
  questionText: string;
  selectedOptionId: string | null;
  correctOptionId: string;
  isCorrect: boolean;
  explanation: string;
}

export interface McqSubmitResult {
  attemptId: string;
  score: number;
  totalQuestions: number;
  percentage: number;
  passed: boolean;
  attemptNumber: number;
  submittedAt: string;
  review: McqAnswerReview[];
}

export const learningService = {
  async getCourseCurriculum(courseId: string) {
    return api.get<CourseCurriculumResponse>(`/student/learning/courses/${courseId}/curriculum`);
  },

  async getSubtopicContent(subtopicId: string) {
    return api.get<SubtopicBundle>(`/student/learning/subtopics/${subtopicId}`);
  },

  async trackVideoProgress(
    videoId: string,
    payload: { watchSeconds: number; lastPositionSeconds: number; durationSeconds?: number }
  ) {
    return api.post<{
      videoId: string;
      watchSeconds: number;
      lastPositionSeconds: number;
      isCompleted: boolean;
    }>(`/student/learning/videos/${videoId}/progress`, payload);
  },

  async toggleSubtopicCompletion(subtopicId: string, isCompleted = true) {
    return api.post<{
      subtopicId: string;
      isCompleted: boolean;
      completedAt?: string;
      progressPercentage: number;
    }>(`/student/learning/subtopics/${subtopicId}/complete`, { isCompleted });
  },

  async runStudentCode(
    problemId: string,
    payload: { code: string; language: string; customInput?: string }
  ) {
    return api.post<CodeEvaluationResult>(`/student/learning/coding/${problemId}/run`, payload);
  },

  async submitStudentCode(problemId: string, payload: { code: string; language: string }) {
    return api.post<CodeEvaluationResult>(`/student/learning/coding/${problemId}/submit`, payload);
  },

  async submitMcqAttempt(
    subtopicId: string,
    payload: { answers: Array<{ questionId: string; selectedOptionId: string }> }
  ) {
    return api.post<McqSubmitResult>(`/student/learning/mcqs/${subtopicId}/submit`, payload);
  },
};
