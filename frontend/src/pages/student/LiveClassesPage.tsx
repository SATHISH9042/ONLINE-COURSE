import React, { useState, useEffect } from 'react';
import {
  Video,
  Calendar,
  Clock,
  ExternalLink,
  Play,
  Film,
  Radio,
  Search,
  CheckCircle2,
  Users,
  AlertCircle,
  X,
  Sparkles,
} from 'lucide-react';
import {
  liveClassService,
  LiveClass,
  LiveClassRecording,
  StudentLiveClassesData,
} from '../../services/liveClassService';

export const LiveClassesPage: React.FC = () => {
  const [data, setData] = useState<StudentLiveClassesData>({
    live: [],
    upcoming: [],
    past: [],
    recordings: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'all' | 'live' | 'upcoming' | 'recordings'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRecording, setSelectedRecording] = useState<LiveClassRecording | null>(null);

  const fetchClasses = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await liveClassService.getStudentLiveClasses();
      setData(res);
    } catch (err: any) {
      console.error('Failed to load live classes:', err);
      setError(err.response?.data?.message || 'Failed to load live classes. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClasses();
  }, []);

  const formatDateTime = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      });
    } catch {
      return dateStr;
    }
  };

  const getFilteredUpcoming = () => {
    return data.upcoming.filter(
      (c) =>
        c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.instructor_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (c.course_title && c.course_title.toLowerCase().includes(searchQuery.toLowerCase()))
    );
  };

  const getFilteredLive = () => {
    return data.live.filter(
      (c) =>
        c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.instructor_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (c.course_title && c.course_title.toLowerCase().includes(searchQuery.toLowerCase()))
    );
  };

  const getFilteredRecordings = () => {
    return data.recordings.filter(
      (r) =>
        r.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.instructorName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.courseTitle.toLowerCase().includes(searchQuery.toLowerCase())
    );
  };

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-10 bg-slate-200 rounded-lg w-1/3"></div>
        <div className="h-44 bg-slate-200 rounded-2xl"></div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="h-64 bg-slate-200 rounded-2xl"></div>
          <div className="h-64 bg-slate-200 rounded-2xl"></div>
        </div>
      </div>
    );
  }

  const filteredLive = getFilteredLive();
  const filteredUpcoming = getFilteredUpcoming();
  const filteredRecordings = getFilteredRecordings();

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      {/* Header with Title and Search */}
      <div className="border-b border-slate-200 pb-5 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
              Live Classes & Interactive Webinars
            </h1>
            {data.live.length > 0 && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-700 animate-pulse">
                <span className="w-1.5 h-1.5 rounded-full bg-red-600 mr-1"></span>
                {data.live.length} LIVE NOW
              </span>
            )}
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Attend live lectures with institute faculty, engage in real-time Q&A, and watch past high-definition recordings.
          </p>
        </div>

        {/* Search Bar */}
        <div className="relative w-full md:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search classes or instructors..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-all shadow-xs"
          />
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 flex items-center space-x-3 text-sm">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Quick Navigation Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-3">
        <button
          onClick={() => setActiveTab('all')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all ${activeTab === 'all'
              ? 'bg-slate-900 text-white shadow-sm'
              : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
        >
          All Sessions ({data.live.length + data.upcoming.length + data.recordings.length})
        </button>
        <button
          onClick={() => setActiveTab('live')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all inline-flex items-center space-x-1.5 ${activeTab === 'live'
              ? 'bg-red-600 text-white shadow-sm'
              : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
        >
          <Radio className={`w-3.5 h-3.5 ${data.live.length > 0 ? 'text-red-500 animate-pulse' : ''}`} />
          <span>Live Now ({data.live.length})</span>
        </button>
        <button
          onClick={() => setActiveTab('upcoming')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all inline-flex items-center space-x-1.5 ${activeTab === 'upcoming'
              ? 'bg-brand-600 text-white shadow-sm'
              : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
        >
          <Calendar className="w-3.5 h-3.5" />
          <span>Upcoming Schedule ({data.upcoming.length})</span>
        </button>
        <button
          onClick={() => setActiveTab('recordings')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all inline-flex items-center space-x-1.5 ${activeTab === 'recordings'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
        >
          <Film className="w-3.5 h-3.5" />
          <span>Recorded Library ({data.recordings.length})</span>
        </button>
      </div>

      {/* 1. BROADCASTING LIVE NOW SECTION */}
      {(activeTab === 'all' || activeTab === 'live') && filteredLive.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center space-x-2">
            <span className="w-2.5 h-2.5 rounded-full bg-red-600 animate-ping"></span>
            <h2 className="text-base font-bold text-slate-900 uppercase tracking-wider text-xs">
              Happening Right Now
            </h2>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {filteredLive.map((liveSession) => (
              <div
                key={liveSession.id}
                className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 text-white p-6 shadow-xl border border-red-500/30 flex flex-col justify-between space-y-5"
              >
                {/* Glowing top accent */}
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-red-500 via-rose-500 to-amber-500"></div>

                <div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-extrabold bg-red-500/20 text-red-300 border border-red-500/30">
                      <span className="w-2 h-2 mr-2 rounded-full bg-red-500 animate-ping"></span>
                      BROADCASTING LIVE
                    </span>
                    <span className="text-xs text-slate-300 font-medium bg-white/10 px-2.5 py-1 rounded-lg">
                      {liveSession.course_title || 'Institute Masterclass'}
                    </span>
                  </div>

                  <h3 className="text-xl font-bold mt-4 text-white leading-snug">
                    {liveSession.title}
                  </h3>

                  {liveSession.description && (
                    <p className="text-xs text-slate-300 mt-2 line-clamp-2 leading-relaxed">
                      {liveSession.description}
                    </p>
                  )}
                </div>

                <div className="pt-4 border-t border-white/10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div className="text-xs text-slate-300 space-y-1">
                    <div>
                      Instructor: <strong className="text-white">{liveSession.instructor_name}</strong>
                    </div>
                    <div className="flex items-center space-x-1.5 text-slate-400">
                      <Clock className="w-3.5 h-3.5" />
                      <span>Ends at {formatDateTime(liveSession.end_time)}</span>
                    </div>
                  </div>

                  <a
                    href={liveSession.meeting_link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center px-6 py-3 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 transition-all shadow-lg shadow-red-600/30 hover:shadow-red-600/50 hover:scale-[1.02]"
                  >
                    <Radio className="w-4 h-4 mr-2" />
                    Join Live Class
                    <ExternalLink className="w-3.5 h-3.5 ml-1.5 opacity-80" />
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 2. UPCOMING LIVE SESSIONS */}
      {(activeTab === 'all' || activeTab === 'upcoming') && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900">
              Upcoming Live Sessions
            </h2>
            <span className="text-xs text-slate-500">{filteredUpcoming.length} scheduled</span>
          </div>

          {filteredUpcoming.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center max-w-xl mx-auto space-y-3">
              <Calendar className="w-10 h-10 text-slate-300 mx-auto" />
              <p className="text-sm font-semibold text-slate-700">No upcoming live sessions found</p>
              <p className="text-xs text-slate-500">
                New live coding webinars and masterclasses are scheduled regularly by your instructors. Check back soon!
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredUpcoming.map((item) => (
                <div
                  key={item.id}
                  className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs hover:shadow-md transition-shadow flex flex-col justify-between space-y-4"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
                        <Clock className="w-3 h-3 mr-1 text-amber-500" />
                        UPCOMING
                      </span>
                      <span className="text-[11px] text-slate-500 font-medium truncate max-w-[150px]">
                        {item.course_title || 'General'}
                      </span>
                    </div>

                    <h3 className="text-sm font-bold text-slate-900 line-clamp-2 leading-snug">
                      {item.title}
                    </h3>

                    {item.description && (
                      <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                        {item.description}
                      </p>
                    )}
                  </div>

                  <div className="space-y-3 pt-3 border-t border-slate-100">
                    <div className="text-xs text-slate-600 space-y-1">
                      <div className="flex items-center text-slate-700 font-medium">
                        <Calendar className="w-3.5 h-3.5 mr-1.5 text-brand-600" />
                        <span>{formatDateTime(item.start_time)}</span>
                      </div>
                      <div className="text-[11px] text-slate-500 pl-5">
                        Instructor: <strong className="text-slate-700">{item.instructor_name}</strong>
                      </div>
                    </div>

                    <a
                      href={item.meeting_link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full inline-flex items-center justify-center px-4 py-2 rounded-xl text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-brand-50 hover:text-brand-700 transition-colors"
                    >
                      <Video className="w-3.5 h-3.5 mr-1.5" />
                      View Link / Join
                      <ExternalLink className="w-3 h-3 ml-1 opacity-70" />
                    </a>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 3. RECORDED SESSIONS LIBRARY */}
      {(activeTab === 'all' || activeTab === 'recordings') && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Recorded Live Sessions
              </h2>
              <p className="text-xs text-slate-500">
                Missed a live class? Catch up anytime with full recordings and interactive chapter markers.
              </p>
            </div>
            <span className="text-xs text-slate-500">{filteredRecordings.length} recordings</span>
          </div>

          {filteredRecordings.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center max-w-xl mx-auto space-y-3">
              <Film className="w-10 h-10 text-slate-300 mx-auto" />
              <p className="text-sm font-semibold text-slate-700">No recordings available yet</p>
              <p className="text-xs text-slate-500">
                Completed live sessions are recorded, processed, and uploaded here within 24 hours.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredRecordings.map((recording) => (
                <div
                  key={recording.id}
                  className="group bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs hover:shadow-md transition-all flex flex-col justify-between"
                >
                  {/* Thumbnail & Watch Trigger */}
                  <div
                    onClick={() => setSelectedRecording(recording)}
                    className="relative aspect-video bg-slate-900 flex items-center justify-center cursor-pointer overflow-hidden group-hover:brightness-95 transition-all"
                  >
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent"></div>
                    <div className="w-12 h-12 rounded-full bg-white/90 text-brand-600 flex items-center justify-center group-hover:scale-110 group-hover:bg-brand-600 group-hover:text-white transition-all shadow-lg z-10">
                      <Play className="w-5 h-5 fill-current ml-0.5" />
                    </div>

                    <div className="absolute bottom-2 left-3 right-3 flex items-center justify-between text-[11px] text-white/90 font-medium z-10">
                      <span className="truncate max-w-[180px]">{recording.courseTitle}</span>
                      <span className="bg-black/60 px-2 py-0.5 rounded font-mono font-semibold">
                        {recording.durationFormatted}
                      </span>
                    </div>
                  </div>

                  <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                    <div>
                      <h4 className="text-xs font-bold text-slate-900 line-clamp-2 leading-snug group-hover:text-brand-600 transition-colors">
                        {recording.title}
                      </h4>
                      <p className="text-[11px] text-slate-500 mt-1">
                        Instructor: {recording.instructorName}
                      </p>
                    </div>

                    <button
                      onClick={() => setSelectedRecording(recording)}
                      className="w-full inline-flex items-center justify-center px-4 py-2 rounded-xl text-xs font-semibold text-white bg-slate-900 hover:bg-brand-600 transition-colors shadow-xs"
                    >
                      <Play className="w-3.5 h-3.5 mr-1.5 fill-current" />
                      Watch Recording
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* RECORDING PLAYBACK MODAL */}
      {selectedRecording && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-150">
          <div className="bg-slate-950 border border-slate-800 rounded-3xl w-full max-w-4xl overflow-hidden shadow-2xl flex flex-col">
            {/* Modal Header */}
            <div className="p-4 sm:p-5 flex items-center justify-between border-b border-slate-800 bg-slate-900/50">
              <div>
                <span className="text-xs text-brand-400 font-semibold uppercase tracking-wider block">
                  {selectedRecording.courseTitle} • Live Recording
                </span>
                <h3 className="text-base sm:text-lg font-bold text-white mt-0.5">
                  {selectedRecording.title}
                </h3>
              </div>
              <button
                onClick={() => setSelectedRecording(null)}
                className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Video Player */}
            <div className="relative aspect-video bg-black flex items-center justify-center">
              <video
                src={selectedRecording.streamUrl}
                controls
                autoPlay
                className="w-full h-full object-contain"
              >
                Your browser does not support high-definition video playback.
              </video>
            </div>

            {/* Modal Footer */}
            <div className="p-4 sm:p-5 bg-slate-900/80 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-400">
              <div>
                <span>Lecturer: <strong className="text-slate-200">{selectedRecording.instructorName}</strong></span>
                <span className="mx-2">•</span>
                <span>Duration: <strong className="text-slate-200">{selectedRecording.durationFormatted}</strong></span>
              </div>
              <button
                onClick={() => setSelectedRecording(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold transition-colors"
              >
                Close Viewer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
