import React, { useState } from 'react';
import { Save, CheckCircle2 } from 'lucide-react';
import { Button } from '../ui/button';
import { VideoCallFrame } from './VideoCallFrame';
import { SessionPanel } from './SessionPanel';
import { useAuthStore } from '../../store/authStore';
import { createClinicalNote } from '../../api/clinicalNotes';
import type { AppointmentDetails } from '../../api/appointmentsBackend';
import type { ClientDetail } from '../../api/clientDetail';
import { toast } from 'sonner';
import type { CallView } from './useVideoCallState';

interface SoapNote {
  subjective: string;
  objective: string;
  assessment: string;
  plan: string;
}

const EMPTY_SOAP: SoapNote = { subjective: '', objective: '', assessment: '', plan: '' };

function formatClientName(client: ClientDetail | null, fallback: string): string {
  if (!client) return fallback;
  const name = `${client.firstName ?? ''} ${client.lastName ?? ''}`.trim();
  return name || client.email || fallback;
}

export const TelehealthSplitView: React.FC<{
  appointment: AppointmentDetails;
  client: ClientDetail | null;
}> = ({ appointment, client }) => {
  const currentUser = useAuthStore((s) => s.user);
  const [view, setView] = useState<CallView>('prejoin');
  const [panelOpen, setPanelOpen] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<string | null>(null);
  const [soap, setSoap] = useState<SoapNote>(EMPTY_SOAP);

  const documentationLocked = view !== 'live';
  const clientName = formatClientName(client, appointment.clientName || `Client #${appointment.clientId}`);
  const isTherapist = currentUser?.role === 'therapist' || currentUser?.role === 'admin' || currentUser?.role === 'org_owner';

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await createClinicalNote({
        therapistId: appointment.therapistId,
        clientId: appointment.clientId,
        appointmentId: String(appointment.id),
        noteType: 'SOAP',
        subjective: soap.subjective,
        objective: soap.objective,
        assessment: soap.assessment,
        plan: soap.plan,
      });
      const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      setLastSaved(timeStr);
      toast.success(`SOAP note saved to ${clientName}'s chart`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save the SOAP note');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex h-[calc(100vh-80px)] flex-col gap-3 bg-canvas p-4 text-ink">
      <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 lg:grid-cols-12">
        <div className="flex h-full min-h-0 flex-col lg:col-span-7">
          <VideoCallFrame
            appointmentId={String(appointment.id)}
            displayName={currentUser?.name || 'Therapist'}
            clientName={clientName}
            canEndForEveryone={isTherapist}
            isTherapist={isTherapist}
            onTogglePanel={() => setPanelOpen((v) => !v)}
            onViewChange={setView}
          />
        </div>

        {panelOpen && (
          <div className="flex h-full min-h-0 flex-col gap-3 lg:col-span-5">
            <SessionPanel
              appointment={appointment}
              client={client}
              clientName={clientName}
              soap={soap}
              onSoapChange={setSoap}
              documentationLocked={documentationLocked}
            />

            <div className="flex flex-none items-center justify-between rounded-xl border border-rule bg-surface px-4 py-3">
              <div>
                {lastSaved ? (
                  <span className="flex items-center text-xs text-muted-text">
                    <CheckCircle2 className="mr-1 h-3.5 w-3.5 text-action" />
                    Saved to chart at {lastSaved}
                  </span>
                ) : (
                  <span className="text-xs text-muted-text">{documentationLocked ? 'Locked until call starts' : 'Draft note not yet signed'}</span>
                )}
              </div>
              <Button
                size="sm"
                onClick={handleSave}
                disabled={documentationLocked || isSaving}
                className="h-9 bg-action px-4 text-xs font-semibold text-canvas hover:bg-action-dark disabled:cursor-not-allowed disabled:bg-surface-warm disabled:text-muted-text disabled:opacity-70"
              >
                <Save className="mr-1.5 h-3.5 w-3.5" />
                {isSaving ? 'Saving…' : `Save to ${clientName}'s chart`}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TelehealthSplitView;
