import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  Monitor,
  MonitorOff,
  Hand,
  MessageSquare,
  Users,
  PhoneOff,
  Circle,
  Maximize2,
  Minimize2,
  Lock,
  Unlock,
  Send,
  Pin,
  X,
  Volume2,
  VolumeX,
  Sparkles,
  AlertCircle,
  CheckCircle2,
  Clock,
  Shield,
  Search,
  Radio,
  ArrowLeft,
  ChevronDown,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import {
  liveSessionService,
  LiveSessionData,
  Participant,
  SessionChatMessage,
} from '../../services/liveSessionService';
import { liveClassService } from '../../services/liveClassService';

export const LiveRoomPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const isHost = user?.role === 'ADMIN';

  // Room & participants state
  const [sessionData, setSessionData] = useState<LiveSessionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ text: string; type: 'info' | 'success' | 'warning' } | null>(null);

  // Media Streams & Devices
  const [isMicOn, setIsMicOn] = useState(false);
  const [isVideoOn, setIsVideoOn] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [handRaised, setHandRaised] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const localStreamRef = useRef<MediaStream | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const syntheticStreamRef = useRef<MediaStream | null>(null);
  const syntheticAnimIdRef = useRef<number | null>(null);
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const screenVideoRef = useRef<HTMLVideoElement | null>(null);

  // Chat & Drawers
  const [activePanel, setActivePanel] = useState<'none' | 'chat' | 'people'>('none');
  const [messages, setMessages] = useState<SessionChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isPinAnnouncement, setIsPinAnnouncement] = useState(false);
  const [unreadChatCount, setUnreadChatCount] = useState(0);
  const chatBottomRef = useRef<HTMLDivElement | null>(null);

  // Moderation & People Search
  const [participantSearch, setParticipantSearch] = useState('');
  const [isMutingAll, setIsMutingAll] = useState(false);
  const [recordingBusy, setRecordingBusy] = useState(false);

  // Timers
  const [callSeconds, setCallSeconds] = useState(0);
  const [recSeconds, setRecSeconds] = useState(0);

  // Exit dialog
  const [showExitModal, setShowExitModal] = useState(false);

  const previousCanSpeakRef = useRef<boolean>(isHost);

  // Auto-dismiss notices after 4 seconds
  useEffect(() => {
    if (notice) {
      const timer = setTimeout(() => setNotice(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [notice]);

  // Call duration counter
  useEffect(() => {
    const timer = setInterval(() => {
      setCallSeconds((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Recording counter
  useEffect(() => {
    let timer: any;
    if (sessionData?.isRecording) {
      timer = setInterval(() => {
        setRecSeconds((prev) => prev + 1);
      }, 1000);
    } else {
      setRecSeconds(0);
    }
    return () => clearInterval(timer);
  }, [sessionData?.isRecording]);

  // Initial Fetch & Join Session
  useEffect(() => {
    if (!id) return;

    let isMounted = true;
    const loadSession = async () => {
      try {
        const data = await liveSessionService.getSessionDetails(id, isHost);
        if (!isMounted) return;
        setSessionData(data);
        if (data.isRecording && data.recordingDurationSeconds) {
          setRecSeconds(data.recordingDurationSeconds);
        }
        if (data.currentParticipant) {
          setHandRaised(data.currentParticipant.handRaised);
          previousCanSpeakRef.current = data.currentParticipant.canSpeak;
        }

        // Fetch existing messages
        const msgs = await liveSessionService.getMessages(id, isHost);
        if (isMounted) setMessages(msgs);
      } catch (err: any) {
        if (isMounted) {
          setError(err.message || 'Unable to join the live session.');
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadSession();

    // Auto-poll state every 2.5s to sync moderation changes, participants, & recording status
    const pollInterval = setInterval(async () => {
      try {
        const data = await liveSessionService.getSessionDetails(id, isHost);
        if (!isMounted) return;
        setSessionData(data);

        // Check if student's speaking permission changed
        if (!isHost && data.currentParticipant) {
          const wasAllowed = previousCanSpeakRef.current;
          const isNowAllowed = data.currentParticipant.canSpeak;

          if (!wasAllowed && isNowAllowed) {
            setNotice({
              text: '🎙️ The instructor granted you permission to speak! You can now unmute your mic.',
              type: 'success',
            });
          } else if (wasAllowed && !isNowAllowed) {
            // Mute local mic if revoked
            if (localStreamRef.current) {
              localStreamRef.current.getAudioTracks().forEach((track) => {
                track.enabled = false;
              });
            }
            setIsMicOn(false);
            setNotice({
              text: '🔇 Your microphone has been locked by the host.',
              type: 'warning',
            });
          }
          previousCanSpeakRef.current = isNowAllowed;
          setHandRaised(data.currentParticipant.handRaised);
        }

        // Refresh messages
        const latestMsgs = await liveSessionService.getMessages(id, isHost);
        if (isMounted) {
          setMessages((prev) => {
            if (latestMsgs.length > prev.length && activePanel !== 'chat') {
              setUnreadChatCount((cnt) => cnt + (latestMsgs.length - prev.length));
            }
            return latestMsgs;
          });
        }
      } catch {
        // Silent failure on polling interval
      }
    }, 2500);

    return () => {
      isMounted = false;
      clearInterval(pollInterval);
    };
  }, [id, isHost]);

  // Synthetic fallback camera stream for devices without a physical camera or during simulated environments
  const createSyntheticCameraStream = (): MediaStream => {
    if (syntheticStreamRef.current && syntheticStreamRef.current.active) {
      return syntheticStreamRef.current;
    }
    const canvas = document.createElement('canvas');
    canvas.width = 640;
    canvas.height = 480;
    const ctx = canvas.getContext('2d');
    let frame = 0;

    const draw = () => {
      if (!ctx) return;
      frame++;
      // Dark slate studio gradient background
      const grad = ctx.createLinearGradient(0, 0, 640, 480);
      grad.addColorStop(0, '#0f172a');
      grad.addColorStop(1, '#1e293b');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 640, 480);

      // Subtle grid lines
      ctx.strokeStyle = '#334155';
      ctx.lineWidth = 1;
      for (let x = 0; x < 640; x += 40) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, 480);
        ctx.stroke();
      }
      for (let y = 0; y < 480; y += 40) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(640, y);
        ctx.stroke();
      }

      // Outer animated pulse ring
      const pulse = Math.sin(frame * 0.05) * 6;
      ctx.beginPath();
      ctx.arc(320, 200, 65 + pulse, 0, Math.PI * 2);
      ctx.strokeStyle = '#6366f1';
      ctx.lineWidth = 3;
      ctx.stroke();

      // Avatar circle
      ctx.beginPath();
      ctx.arc(320, 200, 60, 0, Math.PI * 2);
      ctx.fillStyle = '#4f46e5';
      ctx.fill();

      // User initial
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 44px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText((user?.fullName?.charAt(0) || 'U').toUpperCase(), 320, 200);

      // User name tag
      ctx.font = 'bold 18px sans-serif';
      ctx.fillText(user?.fullName || 'Studio Presenter', 320, 290);

      // Studio status badge
      ctx.fillStyle = '#22c55e';
      ctx.beginPath();
      ctx.arc(240, 330, 5, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#94a3b8';
      ctx.font = '12px monospace';
      ctx.fillText(`LIVE STUDIO FEED • 30 FPS`, 335, 334);

      syntheticAnimIdRef.current = requestAnimationFrame(draw);
    };
    draw();

    const stream = (canvas as any).captureStream ? (canvas as any).captureStream(30) : new MediaStream();
    const track = stream.getVideoTracks()[0];
    if (track) {
      const origStop = track.stop.bind(track);
      track.stop = () => {
        if (syntheticAnimIdRef.current) {
          cancelAnimationFrame(syntheticAnimIdRef.current);
          syntheticAnimIdRef.current = null;
        }
        origStop();
      };
    }
    syntheticStreamRef.current = stream;
    return stream;
  };

  // Clean up all media streams on unmount
  useEffect(() => {
    return () => {
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((t) => t.stop());
      }
      if (screenStreamRef.current) {
        screenStreamRef.current.getTracks().forEach((t) => t.stop());
      }
      if (syntheticStreamRef.current) {
        syntheticStreamRef.current.getTracks().forEach((t) => t.stop());
      }
      if (syntheticAnimIdRef.current) {
        cancelAnimationFrame(syntheticAnimIdRef.current);
        syntheticAnimIdRef.current = null;
      }
    };
  }, []);

  // Synchronize local video element whenever isVideoOn changes or stream updates
  useEffect(() => {
    if (localVideoRef.current && localStreamRef.current && isVideoOn) {
      if (localVideoRef.current.srcObject !== localStreamRef.current) {
        localVideoRef.current.srcObject = localStreamRef.current;
      }
      localVideoRef.current.play().catch(() => { });
    }
  }, [isVideoOn]);

  // Synchronize screen share video element whenever isScreenSharing changes
  useEffect(() => {
    if (screenVideoRef.current && screenStreamRef.current && isScreenSharing) {
      if (screenVideoRef.current.srcObject !== screenStreamRef.current) {
        screenVideoRef.current.srcObject = screenStreamRef.current;
      }
      screenVideoRef.current.play().catch(() => { });
    }
  }, [isScreenSharing]);

  // Scroll to bottom on new chat messages
  useEffect(() => {
    if (activePanel === 'chat') {
      chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
      setUnreadChatCount(0);
    }
  }, [messages, activePanel]);

  // Format seconds to mm:ss or hh:mm:ss
  const formatTimer = (totalSeconds: number) => {
    const hrs = Math.floor(totalSeconds / 3600);
    const mins = Math.floor((totalSeconds % 3600) / 60);
    const secs = totalSeconds % 60;
    if (hrs > 0) {
      return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Toggle Camera
  const handleToggleCamera = async () => {
    try {
      if (isVideoOn) {
        // Turn off camera: stop video track to extinguish physical camera LED
        if (localStreamRef.current) {
          localStreamRef.current.getVideoTracks().forEach((track) => {
            track.enabled = false;
            track.stop();
          });
          const audioTracks = localStreamRef.current.getAudioTracks();
          localStreamRef.current = audioTracks.length > 0 ? new MediaStream(audioTracks) : null;
        }
        setIsVideoOn(false);
      } else {
        // Turn on camera
        let stream: MediaStream;

        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          stream = createSyntheticCameraStream();
          setNotice({
            text: 'Virtual studio camera active (MediaDevices unavailable in this browser context).',
            type: 'info',
          });
        } else {
          try {
            // First attempt: ideal HD camera stream (audio: false prevents collision with microphone)
            stream = await navigator.mediaDevices.getUserMedia({
              video: {
                width: { ideal: 1280, max: 1920 },
                height: { ideal: 720, max: 1080 },
                facingMode: 'user',
              },
              audio: false,
            });
          } catch (e: any) {
            console.warn('HD camera attempt failed, trying basic video...', e);
            try {
              // Second attempt: basic video
              stream = await navigator.mediaDevices.getUserMedia({
                video: true,
                audio: false,
              });
            } catch (fallbackErr: any) {
              if (
                fallbackErr.name === 'NotFoundError' ||
                fallbackErr.name === 'DevicesNotFoundError'
              ) {
                // If no physical webcam is plugged in, use high-res virtual studio stream
                stream = createSyntheticCameraStream();
                setNotice({
                  text: 'No physical webcam detected on this device. Virtual classroom stream active.',
                  type: 'info',
                });
              } else {
                throw fallbackErr;
              }
            }
          }
        }

        const videoTrack = stream.getVideoTracks()[0];
        if (videoTrack) {
          videoTrack.enabled = true;
          videoTrack.onended = () => {
            setIsVideoOn(false);
          };
        }

        if (!localStreamRef.current) {
          localStreamRef.current = stream;
        } else {
          localStreamRef.current.getVideoTracks().forEach((t) => localStreamRef.current?.removeTrack(t));
          if (videoTrack) {
            localStreamRef.current.addTrack(videoTrack);
          }
        }

        if (localVideoRef.current) {
          localVideoRef.current.srcObject = localStreamRef.current;
          await localVideoRef.current.play().catch(() => { });
        }

        setIsVideoOn(true);
      }
    } catch (err: any) {
      console.error('Camera toggle error:', err);
      let errorMsg = 'Unable to access camera.';
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        errorMsg = 'Camera permission denied. Please allow camera access in your browser address bar.';
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        errorMsg = 'No camera found on this computer. Please connect a webcam.';
      } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
        errorMsg = 'Camera is currently in use by another app (e.g. Zoom/FaceTime). Please close it and retry.';
      } else if (err.message) {
        errorMsg = err.message;
      }
      setNotice({ text: errorMsg, type: 'warning' });
      setIsVideoOn(false);
    }
  };

  // Toggle Microphone
  const handleToggleMicrophone = async () => {
    // Check permission for student
    const canUserSpeak = isHost || sessionData?.currentParticipant?.canSpeak;

    if (!canUserSpeak) {
      setNotice({
        text: '🔒 Your microphone is locked by the teacher. Click ✋ "Raise Hand" to request speaking permission.',
        type: 'warning',
      });
      return;
    }

    try {
      if (isMicOn) {
        if (localStreamRef.current) {
          localStreamRef.current.getAudioTracks().forEach((track) => {
            track.enabled = false;
            track.stop();
          });
          const videoTracks = localStreamRef.current.getVideoTracks();
          localStreamRef.current = videoTracks.length > 0 ? new MediaStream(videoTracks) : null;
        }
        setIsMicOn(false);
      } else {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          throw new Error('Microphone not supported in this browser context.');
        }

        const audioStream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
          video: false,
        });

        const audioTrack = audioStream.getAudioTracks()[0];
        if (audioTrack) {
          audioTrack.enabled = true;
          audioTrack.onended = () => {
            setIsMicOn(false);
          };
        }

        if (!localStreamRef.current) {
          localStreamRef.current = audioStream;
        } else {
          localStreamRef.current.getAudioTracks().forEach((t) => localStreamRef.current?.removeTrack(t));
          if (audioTrack) {
            localStreamRef.current.addTrack(audioTrack);
          }
        }

        setIsMicOn(true);
      }
    } catch (err: any) {
      console.error('Microphone toggle error:', err);
      let errorMsg = 'Microphone access denied or device not found.';
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        errorMsg = 'Microphone permission denied. Please allow microphone access in your browser address bar.';
      } else if (err.name === 'NotFoundError') {
        errorMsg = 'No microphone found on this computer.';
      } else if (err.name === 'NotReadableError') {
        errorMsg = 'Microphone is currently in use by another application.';
      }
      setNotice({
        text: errorMsg,
        type: 'warning',
      });
      setIsMicOn(false);
    }
  };

  // Toggle Screen Share
  const handleToggleScreenShare = async () => {
    try {
      if (isScreenSharing) {
        if (screenStreamRef.current) {
          screenStreamRef.current.getTracks().forEach((t) => t.stop());
          screenStreamRef.current = null;
        }
        setIsScreenSharing(false);
      } else {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getDisplayMedia) {
          throw new Error('Screen sharing is not supported by your browser or environment.');
        }
        const stream = await navigator.mediaDevices.getDisplayMedia({
          video: true,
          audio: true,
        });
        screenStreamRef.current = stream;

        if (screenVideoRef.current) {
          screenVideoRef.current.srcObject = stream;
          await screenVideoRef.current.play().catch(() => { });
        }
        setIsScreenSharing(true);

        // Listen for screen share stop from browser UI
        stream.getVideoTracks()[0].onended = () => {
          setIsScreenSharing(false);
          screenStreamRef.current = null;
        };
      }
    } catch (err: any) {
      setIsScreenSharing(false);
      if (err.name !== 'NotAllowedError') {
        setNotice({
          text: err.message || 'Unable to share screen.',
          type: 'warning',
        });
      }
    }
  };

  // Student: Toggle Raise Hand
  const handleToggleRaiseHand = async () => {
    if (!id) return;
    try {
      const nextState = !handRaised;
      setHandRaised(nextState);
      await liveSessionService.toggleRaiseHand(id, nextState);
      setNotice({
        text: nextState
          ? '✋ Hand raised! The instructor has been notified.'
          : 'Hand lowered.',
        type: 'info',
      });
    } catch (err: any) {
      setHandRaised(handRaised);
      setNotice({ text: 'Failed to update hand raise status.', type: 'warning' });
    }
  };

  // Host: Control Session Recording
  const handleControlRecording = async (action: 'START' | 'STOP') => {
    if (!id || recordingBusy) return;
    try {
      setRecordingBusy(true);
      const res = await liveSessionService.controlRecording(id, action);
      if (action === 'START') {
        setSessionData((prev) => (prev ? { ...prev, isRecording: true } : null));
        setNotice({
          text: '🔴 Live session recording started!',
          type: 'success',
        });
      } else {
        setSessionData((prev) => (prev ? { ...prev, isRecording: false } : null));
        setNotice({
          text: '⏹️ Recording stopped & automatically saved to course library!',
          type: 'success',
        });
      }
    } catch (err: any) {
      setNotice({ text: err.message || 'Recording action failed.', type: 'warning' });
    } finally {
      setRecordingBusy(false);
    }
  };

  // Host: Allow or Revoke student speaking permission
  const handleSetSpeakingPermission = async (studentId: string, allowed: boolean) => {
    if (!id) return;
    try {
      await liveSessionService.setSpeakingPermission(id, studentId, allowed);
      // Immediately reflect in UI
      setSessionData((prev) => {
        if (!prev) return null;
        const updated = prev.participants.map((p) =>
          p.userId === studentId
            ? { ...p, canSpeak: allowed, handRaised: allowed ? false : p.handRaised }
            : p
        );
        return { ...prev, participants: updated };
      });
      setNotice({
        text: allowed
          ? 'Granted student speaking rights 🎙️'
          : 'Student microphone muted 🔇',
        type: 'info',
      });
    } catch (err: any) {
      setNotice({ text: 'Failed to update student permission.', type: 'warning' });
    }
  };

  // Host: Mute All Students
  const handleMuteAll = async () => {
    if (!id || isMutingAll) return;
    try {
      setIsMutingAll(true);
      await liveSessionService.muteAllStudents(id);
      setSessionData((prev) => {
        if (!prev) return null;
        const updated = prev.participants.map((p) =>
          p.role === 'STUDENT' ? { ...p, canSpeak: false, isMuted: true } : p
        );
        return { ...prev, participants: updated };
      });
      setNotice({ text: 'All students have been muted.', type: 'info' });
    } catch (err: any) {
      setNotice({ text: 'Failed to mute all students.', type: 'warning' });
    } finally {
      setIsMutingAll(false);
    }
  };

  // Send Live Chat Message
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMessage.trim() || !id) return;

    const messageText = inputMessage.trim();
    setInputMessage('');

    try {
      const newMsg = await liveSessionService.sendMessage(
        id,
        messageText,
        isHost,
        isPinAnnouncement
      );
      setMessages((prev) => [...prev, newMsg]);
      setIsPinAnnouncement(false);
    } catch (err: any) {
      setNotice({ text: 'Failed to send message.', type: 'warning' });
    }
  };

  // Toggle Fullscreen
  const handleToggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => { });
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => { });
      setIsFullscreen(false);
    }
  };

  // Exit Room Navigation
  const handleConfirmExit = async (endClassForEveryone = false) => {
    if (endClassForEveryone && isHost && id) {
      try {
        await liveClassService.updateLiveClass(id, { status: 'COMPLETED' });
      } catch {
        // Proceed with navigation
      }
    }

    // Stop streams
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((t) => t.stop());
    }
    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach((t) => t.stop());
    }

    if (isHost) {
      navigate('/admin/live-classes');
    } else {
      navigate('/student/live-classes');
    }
  };

  // Filter participants in moderation list
  const filteredParticipants = (sessionData?.participants || []).filter((p) =>
    p.name.toLowerCase().includes(participantSearch.toLowerCase())
  );
  const raisedHandsList = (sessionData?.participants || []).filter((p) => p.handRaised);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white space-y-4">
        <div className="relative">
          <div className="w-16 h-16 border-4 border-brand-500/20 border-t-brand-500 rounded-full animate-spin"></div>
          <Radio className="w-6 h-6 text-brand-400 absolute inset-0 m-auto animate-pulse" />
        </div>
        <div className="text-center space-y-1">
          <h2 className="text-lg font-bold">Connecting to Live Studio...</h2>
          <p className="text-xs text-slate-400">Verifying session permissions & joining the stage</p>
        </div>
      </div>
    );
  }

  if (error || !sessionData) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white p-6">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 max-w-md w-full text-center space-y-5 shadow-2xl">
          <div className="w-14 h-14 bg-red-500/10 border border-red-500/20 text-red-400 rounded-2xl flex items-center justify-center mx-auto">
            <AlertCircle className="w-7 h-7" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">Live Session Unavailable</h2>
            <p className="text-xs text-slate-400 mt-2">{error || 'This live class session could not be reached.'}</p>
          </div>
          <button
            onClick={() => navigate(isHost ? '/admin/live-classes' : '/student/live-classes')}
            className="w-full py-2.5 px-4 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-white transition-colors"
          >
            Return to LMS
          </button>
        </div>
      </div>
    );
  }

  const canStudentSpeak = isHost || Boolean(sessionData.currentParticipant?.canSpeak);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col select-none overflow-hidden h-screen">
      {/* 1. TOP HEADER BAR */}
      <header className="h-16 px-4 md:px-6 bg-slate-900/80 backdrop-blur-md border-b border-slate-800/80 flex items-center justify-between shrink-0 z-30">
        <div className="flex items-center space-x-3 overflow-hidden">
          <button
            onClick={() => setShowExitModal(true)}
            title="Leave Session"
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>

          <div className="truncate">
            <div className="flex items-center space-x-2">
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-red-500/20 text-red-400 border border-red-500/30">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping mr-1"></span>
                LIVE STUDIO
              </span>
              <span className="text-[11px] text-slate-400 hidden sm:inline">•</span>
              <span className="text-xs text-slate-400 font-medium truncate hidden sm:inline">
                {sessionData.courseTitle}
              </span>
            </div>
            <h1 className="text-sm font-bold text-white truncate max-w-[240px] sm:max-w-md md:max-w-xl">
              {sessionData.title}
            </h1>
          </div>
        </div>

        {/* Center / Right: Recording Banner, Timer, Status */}
        <div className="flex items-center space-x-3">
          {/* Recording Badge */}
          {sessionData.isRecording ? (
            <div className="inline-flex items-center px-2.5 py-1 rounded-lg bg-red-600/20 border border-red-500/40 text-red-400 text-xs font-bold animate-pulse">
              <span className="w-2 h-2 rounded-full bg-red-500 mr-2"></span>
              <span>REC {formatTimer(recSeconds)}</span>
            </div>
          ) : isHost ? (
            <button
              onClick={() => handleControlRecording('START')}
              disabled={recordingBusy}
              className="inline-flex items-center px-3 py-1 rounded-lg bg-slate-800 hover:bg-red-950/40 border border-slate-700 hover:border-red-500/40 text-slate-300 hover:text-red-400 text-xs font-semibold transition-all shadow-xs"
            >
              <Circle className="w-2.5 h-2.5 mr-1.5 text-red-500 fill-red-500" />
              <span>Record</span>
            </button>
          ) : null}

          {/* Call Elapsed Duration */}
          <div className="hidden sm:flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-slate-800/80 text-slate-400 text-xs font-mono">
            <Clock className="w-3.5 h-3.5" />
            <span>{formatTimer(callSeconds)}</span>
          </div>

          {/* Fullscreen Button */}
          <button
            onClick={handleToggleFullscreen}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </header>

      {/* 2. NOTICE TOAST POPUP */}
      {notice && (
        <div className="fixed top-20 left-1/2 transform -translate-x-1/2 z-50 animate-bounce">
          <div
            className={`px-4 py-2.5 rounded-xl shadow-2xl border text-xs font-semibold flex items-center space-x-2 ${notice.type === 'success'
                ? 'bg-emerald-950/90 border-emerald-500/50 text-emerald-200'
                : notice.type === 'warning'
                  ? 'bg-amber-950/90 border-amber-500/50 text-amber-200'
                  : 'bg-indigo-950/90 border-indigo-500/50 text-indigo-200'
              }`}
          >
            {notice.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            ) : (
              <AlertCircle className="w-4 h-4 text-amber-400" />
            )}
            <span>{notice.text}</span>
          </div>
        </div>
      )}

      {/* 3. MAIN WORKSPACE / THEATER AREA */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* VIDEO STAGE */}
        <main className="flex-1 flex flex-col p-3 md:p-5 overflow-hidden justify-between items-center relative">
          <div className="w-full h-full flex flex-col items-center justify-center relative rounded-2xl overflow-hidden bg-slate-900/60 border border-slate-800/80 shadow-2xl">
            {/* Screen Share Stage (if active) */}
            <div className={`w-full h-full relative items-center justify-center bg-black ${isScreenSharing ? 'flex' : 'hidden'}`}>
              <video
                ref={screenVideoRef}
                autoPlay
                playsInline
                className="w-full h-full object-contain"
              />
              <div className="absolute top-4 left-4 bg-slate-900/80 backdrop-blur-md px-3 py-1.5 rounded-xl border border-slate-700 text-xs font-semibold text-white flex items-center space-x-2">
                <Monitor className="w-3.5 h-3.5 text-brand-400" />
                <span>You are presenting to everyone</span>
              </div>
            </div>

            {/* Main Host / Spotlight Stage */}
            <div className={`w-full h-full relative items-center justify-center bg-gradient-to-b from-slate-900 to-slate-950 ${isScreenSharing ? 'hidden' : 'flex'}`}>
              {/* Local Video Stream: ALWAYS mounted so ref is never null and stream binds immediately */}
              <video
                ref={localVideoRef}
                autoPlay
                playsInline
                muted
                className={`w-full h-full object-cover rounded-2xl ${isVideoOn ? 'block' : 'hidden'}`}
              />

              {/* Avatar placeholder when camera is OFF */}
              {!isVideoOn && (
                <div className="flex flex-col items-center space-y-4">
                  <div className="relative">
                    <div className="w-28 h-28 sm:w-36 sm:h-36 rounded-full bg-gradient-to-tr from-brand-600 via-indigo-600 to-purple-600 flex items-center justify-center text-3xl sm:text-4xl font-extrabold text-white shadow-2xl shadow-brand-500/20 ring-4 ring-slate-800">
                      {user?.fullName?.charAt(0).toUpperCase() || 'U'}
                    </div>
                    {isMicOn && (
                      <div className="absolute -inset-2 rounded-full border-2 border-emerald-400 animate-ping opacity-75 pointer-events-none"></div>
                    )}
                  </div>
                  <div className="text-center">
                    <h3 className="text-base sm:text-lg font-bold text-white flex items-center justify-center space-x-2">
                      <span>{user?.fullName || 'Participant'}</span>
                      {isHost && (
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-brand-500/20 text-brand-300 border border-brand-500/30">
                          Instructor (Host)
                        </span>
                      )}
                    </h3>
                    <p className="text-xs text-slate-400 mt-1">Camera is turned off</p>
                  </div>
                </div>
              )}

              {/* Hand Raised Banner for current student */}
              {handRaised && (
                <div className="absolute top-4 left-4 bg-amber-500 text-slate-950 font-bold px-3 py-1.5 rounded-xl shadow-lg flex items-center space-x-1.5 text-xs animate-bounce">
                  <Hand className="w-4 h-4 fill-slate-950" />
                  <span>Hand Raised (Waiting for host)</span>
                </div>
              )}

              {/* Speaking lock indicator badge for students */}
              {!isHost && (
                <div className="absolute top-4 right-4 bg-slate-900/80 backdrop-blur-md px-3 py-1.5 rounded-xl border border-slate-700 text-xs font-medium flex items-center space-x-2">
                  {canStudentSpeak ? (
                    <span className="text-emerald-400 flex items-center space-x-1 font-semibold">
                      <Unlock className="w-3.5 h-3.5" />
                      <span>Mic Permitted</span>
                    </span>
                  ) : (
                    <span className="text-amber-400 flex items-center space-x-1 font-semibold">
                      <Lock className="w-3.5 h-3.5" />
                      <span>Mic Locked by Host</span>
                    </span>
                  )}
                </div>
              )}

              {/* Current User Tile Tag */}
              <div className="absolute bottom-4 left-4 bg-slate-900/80 backdrop-blur-md px-3 py-1.5 rounded-xl border border-slate-700/80 text-xs text-white flex items-center space-x-2">
                <span className="font-semibold">{user?.fullName || 'You'} (You)</span>
                {isMicOn ? (
                  <Mic className="w-3.5 h-3.5 text-emerald-400" />
                ) : (
                  <MicOff className="w-3.5 h-3.5 text-red-400" />
                )}
              </div>
            </div>

            {/* Raised Hands Quick Alert for Host */}
            {isHost && raisedHandsList.length > 0 && (
              <div className="absolute top-4 left-4 bg-amber-500/90 text-slate-950 backdrop-blur-md px-4 py-2 rounded-xl shadow-xl flex items-center space-x-3 z-20 animate-pulse">
                <Hand className="w-4 h-4 fill-slate-950" />
                <span className="text-xs font-bold">
                  {raisedHandsList.length} student{raisedHandsList.length > 1 ? 's' : ''} requested to speak!
                </span>
                <button
                  onClick={() => setActivePanel('people')}
                  className="px-2.5 py-1 bg-slate-950 text-white rounded-lg text-[11px] font-bold hover:bg-slate-900 transition-colors"
                >
                  Review
                </button>
              </div>
            )}
          </div>
        </main>

        {/* 4. SLIDE-OVER RIGHT PANELS: CHAT OR PARTICIPANTS */}
        {activePanel !== 'none' && (
          <aside className="w-80 sm:w-96 bg-slate-900 border-l border-slate-800 flex flex-col h-full z-40 shrink-0">
            {/* Panel Tabs Header */}
            <div className="h-16 px-4 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setActivePanel('chat')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${activePanel === 'chat'
                      ? 'bg-brand-600 text-white'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800'
                    }`}
                >
                  Messages
                </button>
                <button
                  onClick={() => setActivePanel('people')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors flex items-center space-x-1.5 ${activePanel === 'people'
                      ? 'bg-brand-600 text-white'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800'
                    }`}
                >
                  <span>People</span>
                  <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-800 text-slate-300">
                    {sessionData.participants.length}
                  </span>
                  {raisedHandsList.length > 0 && (
                    <span className="w-2 h-2 rounded-full bg-amber-400"></span>
                  )}
                </button>
              </div>

              <button
                onClick={() => setActivePanel('none')}
                className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* TAB 1: IN-CALL MESSAGES PANEL */}
            {activePanel === 'chat' && (
              <div className="flex-1 flex flex-col overflow-hidden">
                {/* Notice banner */}
                <div className="p-3 bg-slate-800/50 border-b border-slate-800 text-[11px] text-slate-400">
                  <p>💡 Messages can be seen by people in this call and are saved for review.</p>
                </div>

                {/* Messages List */}
                <div className="flex-1 p-4 overflow-y-auto space-y-3">
                  {messages.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-2 text-slate-500">
                      <MessageSquare className="w-8 h-8 text-slate-600 mx-auto" />
                      <p className="text-xs font-medium">No messages yet.</p>
                      <p className="text-[11px]">Send a greeting or post questions for the instructor!</p>
                    </div>
                  ) : (
                    messages.map((msg) => {
                      const isOwn = msg.sender_id === user?.id;
                      const isSystem = msg.sender_role === 'SYSTEM';

                      if (isSystem) {
                        return (
                          <div
                            key={msg.id}
                            className="bg-slate-800/80 border border-slate-700/60 rounded-xl p-2.5 text-center text-xs text-brand-300 font-medium my-2"
                          >
                            {msg.message}
                          </div>
                        );
                      }

                      return (
                        <div
                          key={msg.id}
                          className={`flex flex-col ${isOwn ? 'items-end' : 'items-start'}`}
                        >
                          <div className="flex items-center space-x-1.5 text-[11px] text-slate-400 mb-1">
                            <span className="font-semibold text-slate-300">{msg.sender_name}</span>
                            {msg.sender_role === 'ADMIN' && (
                              <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-brand-500/20 text-brand-300">
                                Host
                              </span>
                            )}
                            <span>•</span>
                            <span className="text-[10px]">
                              {new Date(msg.created_at).toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                          </div>

                          <div
                            className={`rounded-2xl px-3.5 py-2 text-xs leading-relaxed max-w-[85%] break-words ${isOwn
                                ? 'bg-brand-600 text-white rounded-tr-xs'
                                : msg.is_pinned
                                  ? 'bg-amber-950/80 border border-amber-500/40 text-amber-200 rounded-tl-xs'
                                  : 'bg-slate-800 text-slate-200 rounded-tl-xs'
                              }`}
                          >
                            {msg.is_pinned && (
                              <div className="flex items-center space-x-1 text-[10px] font-bold text-amber-400 mb-1">
                                <Pin className="w-3 h-3" />
                                <span>PINNED ANNOUNCEMENT</span>
                              </div>
                            )}
                            {msg.message}
                          </div>
                        </div>
                      );
                    })
                  )}
                  <div ref={chatBottomRef} />
                </div>

                {/* Message Input Bar */}
                <form
                  onSubmit={handleSendMessage}
                  className="p-3 border-t border-slate-800 bg-slate-900/90 space-y-2"
                >
                  {isHost && (
                    <label className="flex items-center space-x-2 text-[11px] text-slate-400 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={isPinAnnouncement}
                        onChange={(e) => setIsPinAnnouncement(e.target.checked)}
                        className="rounded border-slate-700 text-brand-600 focus:ring-0"
                      />
                      <span>Pin as Announcement</span>
                    </label>
                  )}

                  <div className="flex items-center space-x-2">
                    <input
                      type="text"
                      placeholder="Send a message to everyone..."
                      value={inputMessage}
                      onChange={(e) => setInputMessage(e.target.value)}
                      className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                    />
                    <button
                      type="submit"
                      disabled={!inputMessage.trim()}
                      className="p-2 bg-brand-600 hover:bg-brand-500 disabled:opacity-40 text-white rounded-xl transition-all shadow-md"
                    >
                      <Send className="w-4 h-4" />
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* TAB 2: PEOPLE & SPEAKING CONTROLS PANEL */}
            {activePanel === 'people' && (
              <div className="flex-1 flex flex-col overflow-hidden">
                {/* Search & Moderation Action Bar */}
                <div className="p-3 border-b border-slate-800 space-y-2">
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-500" />
                    <input
                      type="text"
                      placeholder="Search participants..."
                      value={participantSearch}
                      onChange={(e) => setParticipantSearch(e.target.value)}
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                    />
                  </div>

                  {/* Host Quick Moderation Action: Mute All */}
                  {isHost && (
                    <div className="flex items-center justify-between pt-1">
                      <span className="text-[11px] text-slate-400 font-medium">Host Controls</span>
                      <button
                        onClick={handleMuteAll}
                        disabled={isMutingAll}
                        className="inline-flex items-center px-2.5 py-1 rounded-lg bg-red-600/20 hover:bg-red-600/30 border border-red-500/40 text-red-300 text-[11px] font-bold transition-colors"
                      >
                        <VolumeX className="w-3 h-3 mr-1" />
                        <span>Mute All Students</span>
                      </button>
                    </div>
                  )}
                </div>

                {/* Raised Hands Section (Pinned at top if any student raised hand) */}
                {raisedHandsList.length > 0 && (
                  <div className="p-3 bg-amber-950/40 border-b border-amber-500/30 space-y-2">
                    <div className="flex items-center space-x-1.5 text-xs font-bold text-amber-300">
                      <Hand className="w-3.5 h-3.5 fill-amber-400" />
                      <span>Raised Hands ({raisedHandsList.length})</span>
                    </div>

                    <div className="space-y-1.5">
                      {raisedHandsList.map((p) => (
                        <div
                          key={`raised-${p.userId}`}
                          className="bg-slate-900/90 border border-amber-500/40 rounded-xl p-2 flex items-center justify-between"
                        >
                          <div className="truncate pr-2">
                            <span className="text-xs font-semibold text-white truncate block">
                              {p.name}
                            </span>
                            <span className="text-[10px] text-amber-400">Requesting to speak</span>
                          </div>

                          {isHost && (
                            <button
                              onClick={() => handleSetSpeakingPermission(p.userId, true)}
                              className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold transition-colors shadow-xs"
                            >
                              Allow to Speak
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Participants List */}
                <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
                  <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider px-1">
                    In Call ({filteredParticipants.length})
                  </div>

                  {filteredParticipants.map((p) => {
                    const isCurrentUser = p.userId === user?.id;

                    return (
                      <div
                        key={p.userId}
                        className="p-2.5 rounded-xl bg-slate-800/40 hover:bg-slate-800 transition-colors flex items-center justify-between group"
                      >
                        <div className="flex items-center space-x-2.5 truncate">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-slate-700 to-slate-600 flex items-center justify-center font-bold text-xs text-white shrink-0">
                            {p.name.charAt(0).toUpperCase()}
                          </div>
                          <div className="truncate">
                            <div className="flex items-center space-x-1.5">
                              <span className="text-xs font-semibold text-white truncate">
                                {p.name}
                              </span>
                              {isCurrentUser && (
                                <span className="text-[10px] text-slate-400">(You)</span>
                              )}
                            </div>
                            <div className="flex items-center space-x-1.5 text-[10px] text-slate-400">
                              <span>{p.role === 'ADMIN' ? 'Instructor' : 'Student'}</span>
                              {p.handRaised && (
                                <span className="text-amber-400 font-bold">• ✋ Hand Raised</span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Speaking Status / Host Controls */}
                        <div className="flex items-center space-x-1.5 shrink-0">
                          {p.role === 'ADMIN' ? (
                            <span className="p-1 text-slate-400" title="Host">
                              <Shield className="w-3.5 h-3.5 text-brand-400" />
                            </span>
                          ) : isHost ? (
                            /* Host toggles speaking permission for student */
                            <button
                              onClick={() => handleSetSpeakingPermission(p.userId, !p.canSpeak)}
                              title={p.canSpeak ? 'Click to Mute Student' : 'Allow Student to Speak'}
                              className={`px-2 py-1 rounded-lg text-[10px] font-bold flex items-center space-x-1 transition-all ${p.canSpeak
                                  ? 'bg-emerald-600/20 text-emerald-300 border border-emerald-500/40 hover:bg-red-600/20 hover:text-red-300 hover:border-red-500/40'
                                  : 'bg-slate-700 text-slate-300 hover:bg-emerald-600 hover:text-white'
                                }`}
                            >
                              {p.canSpeak ? (
                                <>
                                  <Mic className="w-3 h-3" />
                                  <span>Can Speak</span>
                                </>
                              ) : (
                                <>
                                  <MicOff className="w-3 h-3" />
                                  <span>Muted</span>
                                </>
                              )}
                            </button>
                          ) : (
                            /* Student view of peer status */
                            <span className="p-1">
                              {p.canSpeak ? (
                                <Volume2 className="w-3.5 h-3.5 text-emerald-400" />
                              ) : (
                                <VolumeX className="w-3.5 h-3.5 text-slate-600" />
                              )}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </aside>
        )}
      </div>

      {/* 5. GOOGLE MEET-STYLE BOTTOM FLOATING CONTROLS DOCK */}
      <footer className="h-20 px-4 md:px-6 bg-slate-900/90 backdrop-blur-md border-t border-slate-800 flex items-center justify-between shrink-0 z-30">
        {/* Left: Class Time & Title */}
        <div className="hidden lg:flex items-center space-x-2 text-xs text-slate-400 max-w-[200px] truncate">
          <span className="font-semibold text-slate-300 truncate">{sessionData.title}</span>
        </div>

        {/* Center: Main Media Controls */}
        <div className="flex items-center space-x-2 sm:space-x-3 mx-auto">
          {/* Microphone Button */}
          <button
            onClick={handleToggleMicrophone}
            title={
              !canStudentSpeak
                ? 'Microphone locked by host. Raise hand to speak.'
                : isMicOn
                  ? 'Turn off microphone'
                  : 'Turn on microphone'
            }
            className={`w-11 h-11 sm:w-12 sm:h-12 rounded-full flex items-center justify-center transition-all ${!canStudentSpeak
                ? 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed opacity-70'
                : isMicOn
                  ? 'bg-slate-800 hover:bg-slate-700 text-white border border-slate-700'
                  : 'bg-red-600 hover:bg-red-500 text-white shadow-lg shadow-red-600/30'
              }`}
          >
            {!canStudentSpeak ? (
              <Lock className="w-4 h-4 sm:w-5 sm:h-5 text-amber-400" />
            ) : isMicOn ? (
              <Mic className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-400" />
            ) : (
              <MicOff className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
            )}
          </button>

          {/* Camera Button */}
          <button
            onClick={handleToggleCamera}
            title={isVideoOn ? 'Turn off camera' : 'Turn on camera'}
            className={`w-11 h-11 sm:w-12 sm:h-12 rounded-full flex items-center justify-center transition-all ${isVideoOn
                ? 'bg-slate-800 hover:bg-slate-700 text-white border border-slate-700'
                : 'bg-red-600 hover:bg-red-500 text-white shadow-lg shadow-red-600/30'
              }`}
          >
            {isVideoOn ? (
              <Video className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-400" />
            ) : (
              <VideoOff className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
            )}
          </button>

          {/* Screen Share Button */}
          <button
            onClick={handleToggleScreenShare}
            title={isScreenSharing ? 'Stop presenting' : 'Present your screen'}
            className={`w-11 h-11 sm:w-12 sm:h-12 rounded-full flex items-center justify-center transition-all ${isScreenSharing
                ? 'bg-brand-600 hover:bg-brand-500 text-white shadow-lg shadow-brand-600/30'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700'
              }`}
          >
            {isScreenSharing ? (
              <MonitorOff className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
            ) : (
              <Monitor className="w-4 h-4 sm:w-5 sm:h-5" />
            )}
          </button>

          {/* Raise Hand Button (Students & Non-hosts) */}
          {!isHost && (
            <button
              onClick={handleToggleRaiseHand}
              title={handRaised ? 'Lower hand' : 'Raise hand to request speaking'}
              className={`w-11 h-11 sm:w-12 sm:h-12 rounded-full flex items-center justify-center transition-all ${handRaised
                  ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-lg shadow-amber-500/30'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700'
                }`}
            >
              <Hand className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
          )}

          {/* Record Control Button for Host */}
          {isHost && (
            <button
              onClick={() => handleControlRecording(sessionData.isRecording ? 'STOP' : 'START')}
              disabled={recordingBusy}
              title={sessionData.isRecording ? 'Stop Recording' : 'Start Recording'}
              className={`w-11 h-11 sm:w-12 sm:h-12 rounded-full flex items-center justify-center transition-all ${sessionData.isRecording
                  ? 'bg-red-600 hover:bg-red-700 text-white animate-pulse'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700'
                }`}
            >
              <Circle
                className={`w-4 h-4 sm:w-5 sm:h-5 ${sessionData.isRecording ? 'fill-white' : 'text-red-500 fill-red-500'
                  }`}
              />
            </button>
          )}

          {/* Leave Call Button */}
          <button
            onClick={() => setShowExitModal(true)}
            title="Leave Call"
            className="w-12 h-11 sm:w-14 sm:h-12 rounded-full bg-red-600 hover:bg-red-700 text-white flex items-center justify-center transition-all shadow-lg shadow-red-600/40"
          >
            <PhoneOff className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
        </div>

        {/* Right: Chat and People Dock Buttons */}
        <div className="flex items-center space-x-2">
          {/* People Toggle */}
          <button
            onClick={() => setActivePanel((prev) => (prev === 'people' ? 'none' : 'people'))}
            title="Show Participants & Moderation"
            className={`p-2.5 sm:p-3 rounded-2xl relative transition-all ${activePanel === 'people'
                ? 'bg-brand-600 text-white shadow-lg'
                : 'bg-slate-800/80 hover:bg-slate-800 text-slate-300 border border-slate-700'
              }`}
          >
            <Users className="w-4 h-4 sm:w-5 sm:h-5" />
            {raisedHandsList.length > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-amber-400 text-slate-950 font-extrabold text-[9px] flex items-center justify-center animate-bounce">
                ✋
              </span>
            )}
          </button>

          {/* Messages / Chat Toggle */}
          <button
            onClick={() => setActivePanel((prev) => (prev === 'chat' ? 'none' : 'chat'))}
            title="Show In-call Messages"
            className={`p-2.5 sm:p-3 rounded-2xl relative transition-all ${activePanel === 'chat'
                ? 'bg-brand-600 text-white shadow-lg'
                : 'bg-slate-800/80 hover:bg-slate-800 text-slate-300 border border-slate-700'
              }`}
          >
            <MessageSquare className="w-4 h-4 sm:w-5 sm:h-5" />
            {unreadChatCount > 0 && activePanel !== 'chat' && (
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-brand-500 text-white font-extrabold text-[9px] flex items-center justify-center">
                {unreadChatCount}
              </span>
            )}
          </button>
        </div>
      </footer>

      {/* 6. LEAVE / END CALL MODAL */}
      {showExitModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-sm w-full p-6 text-center space-y-4 shadow-2xl">
            <div className="w-12 h-12 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 flex items-center justify-center mx-auto">
              <PhoneOff className="w-6 h-6" />
            </div>

            <div>
              <h3 className="text-base font-bold text-white">Leave Live Classroom?</h3>
              <p className="text-xs text-slate-400 mt-1">
                {isHost
                  ? 'As host, you can leave the room or conclude the session for all participants.'
                  : 'You can rejoin anytime while the session is live.'}
              </p>
            </div>

            <div className="space-y-2 pt-2">
              <button
                onClick={() => handleConfirmExit(false)}
                className="w-full py-2.5 px-4 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-white transition-colors"
              >
                Just Leave Call
              </button>

              {isHost && (
                <button
                  onClick={() => handleConfirmExit(true)}
                  className="w-full py-2.5 px-4 rounded-xl text-xs font-bold bg-red-600 hover:bg-red-500 text-white transition-colors shadow-lg shadow-red-600/30"
                >
                  End Session For All Students
                </button>
              )}

              <button
                onClick={() => setShowExitModal(false)}
                className="w-full py-2 px-4 text-xs font-medium text-slate-400 hover:text-white transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LiveRoomPage;
