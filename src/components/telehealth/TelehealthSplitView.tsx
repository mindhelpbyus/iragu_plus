import React, { useState, useEffect } from 'react';
import { 
  FileText, 
  Clock, 
  Save, 
  CheckCircle2, 
  User, 
  Video,
  ExternalLink,
  Shield,
  FileCheck,
  Lock
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '../ui/button';
import { Textarea } from '../ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { JitsiVideoEmbed } from './JitsiVideoEmbed';
import { ZoomVideoEmbed } from './ZoomVideoEmbed';
import { toast } from 'sonner';

export interface AppointmentSessionData {
  id: number | string;
  clientId: number | string;
  clientName: string;
  clientMrn?: string;
  clientDob?: string;
  therapistName?: string;
  sessionType: string;
  scheduledDate?: string;
  scheduledTime: string; // e.g. "10:00 AM"
  durationMinutes: number;
  sessionNumber?: number;
  roomName?: string;
  videoProvider?: 'zoom' | 'jitsi' | 'livekit';
}

interface SoapNote {
  subjective: string;
  objective: string;
  assessment: string;
  plan: string;
  diagnoses: string[];
}

export const TelehealthSplitView: React.FC<{
  appointment?: AppointmentSessionData;
  onSaveNotes?: (notes: SoapNote) => Promise<void>;
}> = ({
  appointment = {
    id: 'APT-84920',
    clientId: 'CL-10482',
    clientName: 'Alex Rivera',
    clientMrn: 'MRN-84920',
    clientDob: 'Oct 14, 1991 (Age 34)',
    therapistName: 'Dr. Therapist (License #PSY-84920)',
    sessionType: 'Individual Psychotherapy (CBT)',
    scheduledDate: 'Tuesday, Aug 18, 2026',
    scheduledTime: '10:00 AM',
    durationMinutes: 50,
    sessionNumber: 4,
    roomName: 'sess-84920-cbt',
    videoProvider: 'zoom',
  },
  onSaveNotes,
}) => {
  const [provider, setProvider] = useState<'zoom' | 'jitsi' | 'livekit'>(appointment.videoProvider || 'zoom');
  const [inSession, setInSession] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<string | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [isFullScreen, setIsFullScreen] = useState(false);

  const [soap, setSoap] = useState<SoapNote>({
    subjective: 'Client reports improved sleep patterns over the last week following daily mindfulness exercises. Expressed mild work-related stress regarding an upcoming project deadline.',
    objective: 'Affect congruent with mood, calm posture, maintained consistent eye contact throughout conversation. Oriented x4. Speech normal in rate and tone.',
    assessment: 'Generalized anxiety symptoms reduced from moderate to mild (GAD-7 score: 6). Demonstrating good comprehension of cognitive reframing techniques.',
    plan: 'Continue daily 10-minute thought journaling. Scheduled next follow-up CBT session for next Tuesday at 10:00 AM.',
    diagnoses: ['F41.1 (Generalized Anxiety Disorder)', 'Z63.0 (Relationship Distress)'],
  });

  // Session duration timer ONLY runs when inSession === true
  useEffect(() => {
    if (!inSession) return;
    const timer = setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [inSession]);

  const formatTimer = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleStartCall = () => {
    setInSession(true);
    toast.success(`Video consultation started with ${appointment.clientName}. Clinical documentation unlocked.`);
  };

  const handleEndCall = () => {
    setInSession(false);
    toast.info('Video consultation ended. Please complete and sign your clinical note.');
  };

  const handleSave = async () => {
    setIsSaving(true);
    if (onSaveNotes) {
      await onSaveNotes(soap);
    } else {
      await new Promise((resolve) => setTimeout(resolve, 600));
    }
    setIsSaving(false);
    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    setLastSaved(timeStr);
    toast.success(`SOAP Note signed & saved to ${appointment.clientName}'s EHR chart (${appointment.clientId})`);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-80px)] p-4 gap-4 bg-background text-foreground">
      {/* Session Top Status Bar */}
      <div className="flex items-center justify-between px-5 py-3 rounded-xl border border-border bg-card shadow-xs">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            {inSession ? (
              <>
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="font-semibold text-sm text-emerald-600 dark:text-emerald-400">Live Consultation Active</span>
              </>
            ) : (
              <>
                <div className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                <span className="font-semibold text-sm text-amber-600 dark:text-amber-400">Lobby (Waiting to Start)</span>
              </>
            )}
          </div>

          <div className="h-4 w-px bg-border" />

          {/* Client & Session Meta */}
          <div className="flex items-center space-x-2 text-sm text-muted-foreground">
            <User className="w-4 h-4 text-primary" />
            <span className="font-semibold text-foreground">{appointment.clientName}</span>
            <span className="text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded-md font-mono">
              ID: {appointment.clientId}
            </span>
            <span>•</span>
            <span>{appointment.sessionType}</span>
            <span>•</span>
            <span className="bg-muted px-2 py-0.5 rounded-md text-xs font-mono">
              Session #{appointment.sessionNumber || 1}
            </span>
          </div>
        </div>

        <div className="flex items-center space-x-4">
          {/* Timer: Only ticks when inSession === true */}
          <div className="flex items-center space-x-1.5 bg-muted/60 px-3 py-1 rounded-lg text-xs font-medium">
            <Clock className="w-3.5 h-3.5 text-muted-foreground" />
            <span>Duration:</span>
            <span className={`font-mono font-semibold ${inSession ? 'text-primary' : 'text-muted-foreground'}`}>
              {formatTimer(elapsedSeconds)}
            </span>
            <span className="text-muted-foreground">/ {appointment.durationMinutes}m</span>
            {!inSession && <span className="text-[10px] text-amber-600 dark:text-amber-400 ml-1">(Paused)</span>}
          </div>

          {/* Video Provider Switcher */}
          <div className="flex items-center space-x-1 bg-muted rounded-lg p-0.5 border border-border">
            <button
              onClick={() => setProvider('zoom')}
              className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                provider === 'zoom' ? 'bg-background text-foreground shadow-xs' : 'text-muted-foreground hover:text-foreground'
              }`}>
              Zoom (Default)
            </button>
            <button
              onClick={() => setProvider('jitsi')}
              className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                provider === 'jitsi' ? 'bg-background text-foreground shadow-xs' : 'text-muted-foreground hover:text-foreground'
              }`}>
              Jitsi Video
            </button>
            <button
              onClick={() => setProvider('livekit')}
              className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                provider === 'livekit' ? 'bg-background text-foreground shadow-xs' : 'text-muted-foreground hover:text-foreground'
              }`}>
              LiveKit
            </button>
          </div>
        </div>
      </div>

      {/* Main Workspace Layout */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-4 min-h-0 overflow-hidden relative">
        {/* Left Column: Video Consultation Room */}
        <div className={`${isFullScreen ? 'lg:col-span-12' : 'lg:col-span-7'} h-full flex flex-col min-h-0 transition-all duration-300`}>
          {provider === 'zoom' && (
            <ZoomVideoEmbed
              patientName={appointment.clientName}
              clientId={appointment.clientId}
              scheduledTime={appointment.scheduledTime}
              minutesUntilStart={0} // Within 10 min window
              inSession={inSession}
              onStartCall={handleStartCall}
              onEndCall={handleEndCall}
              isFullScreen={isFullScreen}
              onToggleFullScreen={() => setIsFullScreen(!isFullScreen)}
              className="h-full"
            />
          )}

          {provider === 'jitsi' && (
            <JitsiVideoEmbed
              roomName={appointment.roomName || `sess-${appointment.id}`}
              patientName={appointment.clientName}
              isFullScreen={isFullScreen}
              onToggleFullScreen={() => setIsFullScreen(!isFullScreen)}
              className="h-full"
            />
          )}

          {provider === 'livekit' && (
            <div className="flex-1 flex flex-col items-center justify-center rounded-2xl border border-border bg-card p-6 text-center">
              <div className="p-3 rounded-2xl bg-primary/10 text-primary mb-3">
                <Video className="w-8 h-8" />
              </div>
              <h3 className="font-semibold text-base">LiveKit WebRTC Consultation Room</h3>
              <p className="text-sm text-muted-foreground max-w-sm mt-1 mb-4">
                Sub-100ms ultra low latency consultation room powered by LiveKit video-service.
              </p>
              <Button
                size="sm"
                onClick={handleStartCall}
                className="bg-primary text-primary-foreground font-medium">
                Connect LiveKit Room
              </Button>
            </div>
          )}
        </div>

        {/* Right Column: Linked Client EHR & Clinical Documentation */}
        {!isFullScreen && (
          <div className="lg:col-span-5 h-full flex flex-col rounded-2xl border border-border bg-card shadow-sm overflow-hidden relative">
            {/* EHR Header with explicit client tie */}
            <div className="p-4 border-b border-border bg-muted/20 space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <FileText className="w-4 h-4 text-primary" />
                  <h3 className="font-semibold text-sm text-foreground">Clinical Documentation</h3>
                </div>

                <Link
                  to={`/clients/${appointment.clientId}`}
                  target="_blank"
                  className="text-xs text-primary hover:underline flex items-center font-medium">
                  View Client Chart <ExternalLink className="w-3 h-3 ml-1" />
                </Link>
              </div>

              {/* Patient EHR Badge Banner */}
              <div className="p-2.5 rounded-xl bg-card border border-border/80 text-xs space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-foreground">
                    Patient: {appointment.clientName}
                  </span>
                  <span className="text-muted-foreground font-mono text-[11px]">
                    DOB: {appointment.clientDob || 'Oct 14, 1991'}
                  </span>
                </div>
                <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                  <span>Linked Appt: <strong className="text-foreground">#{appointment.id}</strong></span>
                  <span className="text-emerald-600 dark:text-emerald-400 flex items-center">
                    <Shield className="w-3 h-3 mr-1" /> Verified Client Chart Tied
                  </span>
                </div>
              </div>
            </div>

            {/* Note Editor Body */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 relative">
              {!inSession && (
                <div className="mb-3 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-800 dark:text-amber-300 text-xs flex items-center space-x-2">
                  <Lock className="w-4 h-4 shrink-0 text-amber-600 dark:text-amber-400" />
                  <div>
                    <span className="font-semibold block">Documentation Locked Prior to Call</span>
                    <span className="text-[11px] text-muted-foreground">
                      Click "Start & Join Video Call" to begin recording clinical notes for {appointment.clientName}.
                    </span>
                  </div>
                </div>
              )}

              <Tabs defaultValue="soap" className="w-full">
                <TabsList className="grid grid-cols-3 mb-3 bg-muted/60">
                  <TabsTrigger value="soap" className="text-xs">SOAP Note</TabsTrigger>
                  <TabsTrigger value="dap" className="text-xs">DAP Format</TabsTrigger>
                  <TabsTrigger value="intake" className="text-xs">Intake Review</TabsTrigger>
                </TabsList>

                <TabsContent value="soap" className="space-y-3 mt-0">
                  {/* S */}
                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                      S — Subjective (Client Report)
                    </label>
                    <Textarea
                      disabled={!inSession}
                      value={soap.subjective}
                      onChange={(e) => setSoap({ ...soap, subjective: e.target.value })}
                      rows={3}
                      placeholder={inSession ? "Patient's statements, current symptoms, mood..." : "Documentation locked until call starts"}
                      className="text-xs resize-none disabled:opacity-60 disabled:bg-muted/40"
                    />
                  </div>

                  {/* O */}
                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                      O — Objective (Clinician Observation)
                    </label>
                    <Textarea
                      disabled={!inSession}
                      value={soap.objective}
                      onChange={(e) => setSoap({ ...soap, objective: e.target.value })}
                      rows={2}
                      placeholder={inSession ? "Mental status examination, affect, behavior..." : "Documentation locked until call starts"}
                      className="text-xs resize-none disabled:opacity-60 disabled:bg-muted/40"
                    />
                  </div>

                  {/* A */}
                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                      A — Assessment (Clinical Evaluation)
                    </label>
                    <Textarea
                      disabled={!inSession}
                      value={soap.assessment}
                      onChange={(e) => setSoap({ ...soap, assessment: e.target.value })}
                      rows={2}
                      placeholder={inSession ? "Diagnostic impressions, progress towards goals..." : "Documentation locked until call starts"}
                      className="text-xs resize-none disabled:opacity-60 disabled:bg-muted/40"
                    />
                  </div>

                  {/* P */}
                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                      P — Plan (Treatment Interventions)
                    </label>
                    <Textarea
                      disabled={!inSession}
                      value={soap.plan}
                      onChange={(e) => setSoap({ ...soap, plan: e.target.value })}
                      rows={2}
                      placeholder={inSession ? "Interventions, homework, next session date..." : "Documentation locked until call starts"}
                      className="text-xs resize-none disabled:opacity-60 disabled:bg-muted/40"
                    />
                  </div>

                  {/* Diagnoses */}
                  <div className="pt-2 border-t border-border">
                    <span className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                      Diagnoses / ICD-10 Codes
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {soap.diagnoses.map((diag, index) => (
                        <span
                          key={index}
                          className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-primary/10 text-primary border border-primary/20">
                          {diag}
                        </span>
                      ))}
                      {inSession && (
                        <button className="text-xs text-muted-foreground hover:text-foreground px-2 py-0.5 rounded-md border border-dashed border-border">
                          + Add Diagnosis
                        </button>
                      )}
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="dap" className="space-y-3 mt-0">
                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                      D — Description of Session & Response
                    </label>
                    <Textarea disabled={!inSession} rows={4} placeholder="Session content, client reactions..." className="text-xs disabled:opacity-60" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                      A — Assessment
                    </label>
                    <Textarea disabled={!inSession} rows={3} placeholder="Diagnostic assessment..." className="text-xs disabled:opacity-60" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                      P — Plan
                    </label>
                    <Textarea disabled={!inSession} rows={3} placeholder="Next steps..." className="text-xs disabled:opacity-60" />
                  </div>
                </TabsContent>

                <TabsContent value="intake" className="space-y-3 mt-0">
                  <div className="p-3 rounded-xl bg-muted/40 border border-border text-xs space-y-2">
                    <div className="font-semibold text-foreground flex items-center">
                      <FileCheck className="w-3.5 h-3.5 text-primary mr-1.5" />
                      Client Intake Questionnaire Data
                    </div>
                    <p className="text-muted-foreground">
                      <span className="font-medium text-foreground">Chief Complaint:</span> Anxiety spikes in workplace settings.
                    </p>
                    <p className="text-muted-foreground">
                      <span className="font-medium text-foreground">Emergency Contact:</span> Maria Rivera (Spouse) - +1 555-0192
                    </p>
                    <p className="text-muted-foreground">
                      <span className="font-medium text-foreground">Current Medications:</span> None reported.
                    </p>
                  </div>
                </TabsContent>
              </Tabs>
            </div>

            {/* Bottom Save Action Footer */}
            <div className="p-4 border-t border-border bg-muted/30 flex items-center justify-between">
              <div>
                {lastSaved ? (
                  <span className="text-xs text-muted-foreground flex items-center">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 mr-1" />
                    Saved to Chart at {lastSaved}
                  </span>
                ) : (
                  <span className="text-xs text-muted-foreground">
                    {inSession ? 'Draft note not yet signed' : 'Locked until call starts'}
                  </span>
                )}
              </div>

              <Button
                size="sm"
                onClick={handleSave}
                disabled={!inSession || isSaving}
                className={`h-9 px-4 text-xs font-semibold shadow-xs transition-all ${
                  inSession
                    ? 'bg-primary hover:bg-primary/90 text-primary-foreground'
                    : 'bg-muted text-muted-foreground cursor-not-allowed opacity-60'
                }`}>
                <Save className="w-3.5 h-3.5 mr-1.5" />
                {isSaving ? 'Signing & Saving...' : `Sign & Save to ${appointment.clientName}'s EHR`}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TelehealthSplitView;
