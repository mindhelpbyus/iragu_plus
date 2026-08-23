import React, { useState } from 'react';
import { Copy, Check, ExternalLink, ShieldCheck, Video, PhoneOff, Maximize2, Minimize2 } from 'lucide-react';
import { Button } from '../ui/button';

interface JitsiVideoEmbedProps {
  roomName: string;
  displayName?: string;
  patientName?: string;
  onEndCall?: () => void;
  isFullScreen?: boolean;
  onToggleFullScreen?: () => void;
  className?: string;
}

export const JitsiVideoEmbed: React.FC<JitsiVideoEmbedProps> = ({
  roomName,
  displayName = 'Therapist',
  patientName,
  onEndCall,
  isFullScreen = false,
  onToggleFullScreen,
  className = '',
}) => {
  const [copied, setCopied] = useState(false);
  const sanitizedRoom = (roomName || 'session-room').replace(/[^a-zA-Z0-9-_]/g, '-');
  const meetingUrl = `https://meet.jit.si/iragu-${sanitizedRoom}#userInfo.displayName="${encodeURIComponent(displayName)}"&config.prejoinPageEnabled=false&config.startWithAudioMuted=true&config.startWithVideoMuted=true`;

  const copyMeetingLink = () => {
    navigator.clipboard.writeText(`https://meet.jit.si/iragu-${sanitizedRoom}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={`flex flex-col h-full rounded-2xl overflow-hidden border border-border bg-card shadow-sm ${className}`}>
      {/* Top Header Bar */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/40 backdrop-blur-sm">
        <div className="flex items-center space-x-3">
          <div className="p-2 rounded-xl bg-primary/10 text-primary">
            <Video className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-semibold text-sm text-foreground">
                {patientName ? `Session with ${patientName}` : 'Telehealth Session'}
              </span>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                <ShieldCheck className="w-3 h-3 mr-1" /> HIPAA Protected
              </span>
            </div>
            <p className="text-xs text-muted-foreground">Jitsi Secure WebRTC • Room: iragu-{sanitizedRoom}</p>
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
            onClick={copyMeetingLink}
            className="h-8 px-2.5 text-xs text-muted-foreground hover:text-foreground">
            {copied ? <Check className="w-3.5 h-3.5 mr-1.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 mr-1.5" />}
            {copied ? 'Copied' : 'Copy Link'}
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => window.open(`https://meet.jit.si/iragu-${sanitizedRoom}`, '_blank')}
            className="h-8 px-2.5 text-xs text-muted-foreground hover:text-foreground"
            title="Open in new window">
            <ExternalLink className="w-3.5 h-3.5" />
          </Button>

          {onEndCall && (
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

      {/* Embedded Iframe */}
      <div className="flex-1 relative bg-black min-h-[480px]">
        <iframe
          title={`Telehealth Room ${sanitizedRoom}`}
          src={meetingUrl}
          allow="camera; microphone; display-capture; autoplay; clipboard-write; fullscreen"
          sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-modals"
          className="absolute inset-0 w-full h-full border-0"
        />
      </div>
    </div>
  );
};

export default JitsiVideoEmbed;
