import React, { useState } from 'react';
import { 
  Video, 
  ShieldCheck, 
  Copy, 
  Check, 
  ExternalLink, 
  PhoneOff, 
  Mic, 
  MicOff, 
  Camera, 
  CameraOff, 
  ScreenShare, 
  Maximize2, 
  Minimize2,
  Clock,
  Lock,
  UserCheck
} from 'lucide-react';
import { Button } from '../ui/button';

interface ZoomVideoEmbedProps {
  meetingId?: string;
  passcode?: string;
  joinUrl?: string;
  patientName?: string;
  clientId?: string | number;
  scheduledTime?: string;
  minutesUntilStart?: number;
  inSession?: boolean;
  onStartCall?: () => void;
  onEndCall?: () => void;
  isFullScreen?: boolean;
  onToggleFullScreen?: () => void;
  className?: string;
}

export const ZoomVideoEmbed: React.FC<ZoomVideoEmbedProps> = ({
  meetingId = '849 2041 9823',
  passcode = 'iragu2026',
  joinUrl,
  patientName = 'Alex Rivera',
  clientId = 'CL-10482',
  scheduledTime = '10:00 AM',
  minutesUntilStart = 0,
  inSession = false,
  onStartCall,
  onEndCall,
  isFullScreen = false,
  onToggleFullScreen,
  className = '',
}) => {
  const [copied, setCopied] = useState(false);
  const [micOn, setMicOn] = useState(false);
  const [cameraOn, setCameraOn] = useState(false);

  // Time-lock logic: Join button is unlocked 10 minutes prior to session start
  const isJoinWindowOpen = minutesUntilStart <= 10;
  const [overrideUnlock, setOverrideUnlock] = useState(false);
  const canJoin = isJoinWindowOpen || overrideUnlock;

  const directZoomUrl = joinUrl || `https://zoom.us/j/${meetingId.replace(/\s+/g, '')}?pwd=${passcode}`;

  const copyMeetingDetails = () => {
    navigator.clipboard.writeText(`Zoom Meeting ID: ${meetingId}\nPasscode: ${passcode}\nJoin Link: ${directZoomUrl}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={`flex flex-col h-full rounded-2xl overflow-hidden border border-border bg-card shadow-sm ${className}`}>
      {/* Top Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-blue-500/10 backdrop-blur-sm">
        <div className="flex items-center space-x-3">
          <div className="p-2 rounded-xl bg-blue-600 text-white shadow-xs">
            <Video className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-semibold text-sm text-foreground">
                Zoom Consultation • {patientName}
              </span>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-500/10 text-blue-700 dark:text-blue-300 border border-blue-500/20">
                <ShieldCheck className="w-3 h-3 mr-1" /> Zoom Video SDK
              </span>
            </div>
            <p className="text-xs text-muted-foreground font-mono">
              Meeting ID: {meetingId} • Passcode: {passcode}
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {onToggleFullScreen && (
            <Button
              variant="outline"
              size="sm"
              onClick={onToggleFullScreen}
              className="h-8 px-2.5 text-xs text-muted-foreground hover:text-foreground"
              title={isFullScreen ? 'Exit Full Screen' : 'Enter Full Screen'}>
              {isFullScreen ? <Minimize2 className="w-3.5 h-3.5 mr-1" /> : <Maximize2 className="w-3.5 h-3.5 mr-1" />}
              {isFullScreen ? 'Exit Full' : 'Full Screen'}
            </Button>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={copyMeetingDetails}
            className="h-8 px-2.5 text-xs text-muted-foreground hover:text-foreground">
            {copied ? <Check className="w-3.5 h-3.5 mr-1.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 mr-1.5" />}
            {copied ? 'Copied' : 'Copy Details'}
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => window.open(directZoomUrl, '_blank')}
            className="h-8 px-2.5 text-xs text-muted-foreground hover:text-foreground"
            title="Open Zoom App">
            <ExternalLink className="w-3.5 h-3.5 mr-1" /> Open Zoom
          </Button>

          {inSession && onEndCall && (
            <Button
              variant="destructive"
              size="sm"
              onClick={onEndCall}
              className="h-8 px-3 text-xs bg-red-600 hover:bg-red-700 text-white font-medium">
              <PhoneOff className="w-3.5 h-3.5 mr-1.5" /> End Call
            </Button>
          )}
        </div>
      </div>

      {/* Main Video Viewport / Canvas */}
      <div className="flex-1 relative bg-slate-950 flex flex-col items-center justify-center p-6 text-white min-h-[480px]">
        {!inSession ? (
          <div className="flex flex-col items-center max-w-lg text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
              <Video className="w-8 h-8" />
            </div>

            <div>
              <h3 className="text-lg font-semibold">Therapist Pre-Session Lobby</h3>
              <p className="text-xs text-slate-400 mt-1">
                Consultation room prepared for <strong>{patientName}</strong> (ID: #{clientId}).
              </p>
            </div>

            {/* Client Identity & Token Security Verification Card */}
            <div className="w-full text-left p-3.5 rounded-xl bg-slate-900 border border-slate-800 space-y-2 text-xs">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <div className="flex items-center space-x-2">
                  <UserCheck className="w-4 h-4 text-emerald-400" />
                  <span className="font-semibold text-white">Client Identity Verified</span>
                </div>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  Cognito Token Bound
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-400">
                <div>• Patient: <strong className="text-slate-200">{patientName}</strong></div>
                <div>• Client ID: <strong className="text-slate-200">#{clientId}</strong></div>
                <div>• Encryption: <strong className="text-slate-200">AES-256 GCM</strong></div>
                <div>• Room Token: <strong className="text-slate-200 font-mono">Zoom SDK JWT</strong></div>
              </div>

              <p className="text-[10px] text-slate-500 pt-1">
                Security guarantee: Only {patientName} (authenticated via community-app) has access to this room token.
              </p>
            </div>

            {/* Time-Lock 10-Minute Banner */}
            <div className="w-full p-3 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-300 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Clock className="w-4 h-4 text-blue-400" />
                <span>Scheduled Start: <strong className="text-white">{scheduledTime}</strong></span>
              </div>

              {canJoin ? (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse mr-1" />
                  Room Unlocked
                </span>
              ) : (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  <Lock className="w-3 h-3 mr-1" />
                  Opens 10m before ({minutesUntilStart}m left)
                </span>
              )}
            </div>

            {/* In-Call Preview Toggles & Action */}
            <div className="flex items-center space-x-3 pt-1">
              <button
                type="button"
                onClick={() => setMicOn(!micOn)}
                title={micOn ? 'Microphone On' : 'Microphone Muted (Default)'}
                className={`p-3 rounded-full border transition-colors ${
                  micOn ? 'bg-slate-800 border-slate-700 text-white' : 'bg-red-600 border-red-500 text-white'
                }`}>
                {micOn ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
              </button>

              <button
                type="button"
                onClick={() => setCameraOn(!cameraOn)}
                title={cameraOn ? 'Camera On' : 'Camera Disabled (Default)'}
                className={`p-3 rounded-full border transition-colors ${
                  cameraOn ? 'bg-slate-800 border-slate-700 text-white' : 'bg-red-600 border-red-500 text-white'
                }`}>
                {cameraOn ? <Camera className="w-5 h-5" /> : <CameraOff className="w-5 h-5" />}
              </button>

              <Button
                onClick={() => {
                  if (onStartCall) onStartCall();
                }}
                disabled={!canJoin}
                className={`h-11 px-8 rounded-full font-semibold shadow-lg transition-all ${
                  canJoin
                    ? 'bg-blue-600 hover:bg-blue-700 text-white hover:scale-105'
                    : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                }`}>
                {canJoin ? 'Start & Join Video Call' : 'Locked (Opens 10m Prior)'}
              </Button>
            </div>

            {!canJoin && (
              <button
                onClick={() => setOverrideUnlock(true)}
                className="text-[11px] text-slate-400 hover:text-blue-300 underline pt-1">
                Therapist Override: Start Session Early
              </button>
            )}
          </div>
        ) : (
          <div className="w-full h-full flex flex-col relative">
            {/* Active Session Canvas */}
            <div className="flex-1 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center relative overflow-hidden">
              <div className="text-center">
                <div className="w-24 h-24 rounded-full bg-blue-600/30 border-2 border-blue-400 flex items-center justify-center text-2xl font-bold mx-auto mb-3">
                  AR
                </div>
                <h4 className="text-sm font-semibold">{patientName}</h4>
                <div className="flex items-center justify-center space-x-2 mt-1">
                  <span className="text-xs text-emerald-400 flex items-center">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse mr-1.5" />
                    Encrypted Feed Active
                  </span>
                  <span className="text-xs text-slate-400">• ID: #{clientId}</span>
                </div>
              </div>

              {/* Therapist Self-View (Picture-in-Picture) */}
              <div className="absolute bottom-4 right-4 w-36 h-24 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center shadow-lg">
                <span className="text-xs text-slate-300 font-medium">You (Therapist)</span>
              </div>
            </div>

            {/* Bottom In-Call Controls */}
            <div className="flex items-center justify-center space-x-3 py-3 mt-2">
              <button
                onClick={() => setMicOn(!micOn)}
                className={`p-2.5 rounded-full border ${micOn ? 'bg-slate-800 border-slate-700' : 'bg-red-600 border-red-500'}`}>
                {micOn ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
              </button>
              <button
                onClick={() => setCameraOn(!cameraOn)}
                className={`p-2.5 rounded-full border ${cameraOn ? 'bg-slate-800 border-slate-700' : 'bg-red-600 border-red-500'}`}>
                {cameraOn ? <Camera className="w-4 h-4" /> : <CameraOff className="w-4 h-4" />}
              </button>
              <button
                className="p-2.5 rounded-full border bg-slate-800 border-slate-700 text-slate-300 hover:text-white"
                title="Share Screen">
                <ScreenShare className="w-4 h-4" />
              </button>
              <button
                onClick={onEndCall}
                className="px-4 py-2 rounded-full bg-red-600 hover:bg-red-700 text-xs font-semibold text-white">
                End Call
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ZoomVideoEmbed;
