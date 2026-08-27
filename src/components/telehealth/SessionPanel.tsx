import { useEffect, useState } from 'react';
import { FileCheck, ExternalLink, ShieldCheck, Clock3, MessageCircle, Users } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Textarea } from '../ui/textarea';
import { getClientNotes, getClientConsent, type ClinicalNote } from '../../api/clientDetail';
import { getClientMoods, type DailyMood } from '../../api/moods';
import type { AppointmentDetails } from '../../api/appointmentsBackend';
import type { ClientDetail } from '../../api/clientDetail';

type Tab = 'notes' | 'chat' | 'people' | 'file' | 'consent' | 'checkin';

const TABS: { id: Tab; label: string }[] = [
  { id: 'notes', label: 'Notes' },
  { id: 'chat', label: 'Chat' },
  { id: 'people', label: 'People' },
  { id: 'file', label: 'File' },
  { id: 'consent', label: 'Consent' },
  { id: 'checkin', label: 'Check-in' },
];

interface SoapNote {
  subjective: string;
  objective: string;
  assessment: string;
  plan: string;
}

interface SessionPanelProps {
  appointment: AppointmentDetails;
  client: ClientDetail | null;
  clientName: string;
  soap: SoapNote;
  onSoapChange: (soap: SoapNote) => void;
  documentationLocked: boolean;
}

function tabBtnClass(active: boolean) {
  return active
    ? 'flex-none rounded-lg bg-action-light px-2.5 py-1.5 text-xs font-semibold text-action-dark'
    : 'flex-none rounded-lg px-2.5 py-1.5 text-xs font-medium text-body-text transition-colors hover:bg-surface-sage';
}

export function SessionPanel({ appointment, client, clientName, soap, onSoapChange, documentationLocked }: SessionPanelProps) {
  const [tab, setTab] = useState<Tab>('notes');
  const [pastNotes, setPastNotes] = useState<ClinicalNote[]>([]);
  const [consent, setConsent] = useState<Awaited<ReturnType<typeof getClientConsent>> | null>(null);
  const [moods, setMoods] = useState<DailyMood[]>([]);

  useEffect(() => {
    const clientId = String(appointment.clientId);
    getClientNotes(clientId).then(setPastNotes).catch(() => setPastNotes([]));
    getClientConsent(clientId).then(setConsent).catch(() => setConsent(null));
    getClientMoods(Number(appointment.clientId)).then(setMoods).catch(() => setMoods([]));
  }, [appointment.clientId]);

  const latestMood = moods[0];

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-[14px] border border-rule bg-surface shadow-[0_1px_2px_rgba(28,24,18,.05)]">
      <div className="flex flex-none items-center justify-between gap-2 border-b border-rule px-3 py-2">
        <div className="flex flex-1 gap-1 overflow-x-auto">
          {TABS.map((t) => (
            <button key={t.id} type="button" onClick={() => setTab(t.id)} className={tabBtnClass(tab === t.id)}>
              {t.label}
            </button>
          ))}
        </div>
        <Link to={`/clients/${appointment.clientId}`} target="_blank" className="flex flex-none items-center gap-1 text-xs font-medium text-action-dark hover:underline">
          Chart <ExternalLink className="h-3 w-3" />
        </Link>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-5">
        {tab === 'notes' && (
          <div className="flex flex-col gap-4">
            {documentationLocked && (
              <div className="rounded-xl border border-ochre-border bg-ochre-light p-3 text-xs text-body-text">
                <span className="block font-semibold">Documentation locked prior to call</span>
                <span className="mt-0.5 block text-[11px] text-muted-text">Join the call to begin recording clinical notes for {clientName}.</span>
              </div>
            )}
            <SoapField
              label="S — Subjective (Client Report)"
              value={soap.subjective}
              disabled={documentationLocked}
              onChange={(v) => onSoapChange({ ...soap, subjective: v })}
              placeholder="Patient's statements, current symptoms, mood…"
            />
            <SoapField
              label="O — Objective (Clinician Observation)"
              value={soap.objective}
              disabled={documentationLocked}
              onChange={(v) => onSoapChange({ ...soap, objective: v })}
              placeholder="Mental status examination, affect, behavior…"
            />
            <SoapField
              label="A — Assessment (Clinical Evaluation)"
              value={soap.assessment}
              disabled={documentationLocked}
              onChange={(v) => onSoapChange({ ...soap, assessment: v })}
              placeholder="Diagnostic impressions, progress toward goals…"
            />
            <SoapField
              label="P — Plan (Treatment Interventions)"
              value={soap.plan}
              disabled={documentationLocked}
              onChange={(v) => onSoapChange({ ...soap, plan: v })}
              placeholder="Interventions, homework, next session date…"
            />
          </div>
        )}

        {tab === 'chat' && (
          <EmptyTabState
            icon={<MessageCircle className="h-6 w-6" />}
            title="In-call chat isn't wired up yet"
            body="This tab is reserved for real-time chat messages exchanged during the call — not implemented in this frame yet."
          />
        )}

        {tab === 'people' && (
          <EmptyTabState
            icon={<Users className="h-6 w-6" />}
            title="Participant roster isn't wired up yet"
            body="This tab is reserved for showing who's connected and on which provider — video-service doesn't expose a live participant list to this frontend yet."
          />
        )}

        {tab === 'file' && (
          <div className="flex flex-col gap-4">
            <div>
              <div className="text-[15px] font-medium text-ink">{clientName}</div>
              {client?.dateOfBirth && <div className="mt-0.5 text-[11.5px] text-muted-text">DOB: {client.dateOfBirth}</div>}
            </div>
            <div className="flex flex-col gap-2.5">
              <div className="text-[10.5px] font-semibold uppercase tracking-[0.1em] text-muted-text">Recent notes</div>
              {pastNotes.length === 0 && <p className="text-xs text-muted-text">No prior clinical notes on file.</p>}
              {pastNotes.slice(0, 5).map((n) => (
                <div key={n.id} className="flex items-center gap-2.5 text-[12.5px] text-body-text">
                  <span className="w-24 flex-none text-muted-text">{new Date(n.createdAt).toLocaleDateString()}</span>
                  <span className="flex-1 truncate">{n.noteType}</span>
                  <span className={n.isSigned ? 'font-medium text-action-dark' : 'text-muted-text'}>{n.isSigned ? 'Signed' : 'Draft'}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === 'consent' && (
          <div className="flex flex-col gap-3.5">
            <div className="text-[15px] font-medium text-ink">Consent and recording</div>
            {consent?.consentGiven ? (
              <div className="flex items-center gap-2.5 rounded-lg border border-rule p-3">
                <ShieldCheck className="h-4 w-4 flex-none text-action" />
                <span className="text-[12.5px] text-body-text">
                  Consent given{consent.consentGivenAt ? ` · ${new Date(consent.consentGivenAt).toLocaleDateString()}` : ''}
                  {consent.consentVersion ? ` · v${consent.consentVersion}` : ''}
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-2.5 rounded-lg border border-ochre-border bg-ochre-light p-3">
                <Clock3 className="h-4 w-4 flex-none text-[#8A6714]" />
                <span className="text-[12.5px] text-body-text">No recording consent on file for this client yet.</span>
              </div>
            )}
            <div className="flex flex-col gap-2 rounded-lg border border-rule bg-surface-sage p-3.5">
              <div className="text-xs font-semibold text-ink">Where recordings live</div>
              <div className="text-xs leading-relaxed text-body-text">
                Session recordings, where enabled, are encrypted at rest in the ap-south-1 region.
              </div>
            </div>
          </div>
        )}

        {tab === 'checkin' && (
          <div className="flex flex-col gap-4">
            <div className="text-[15px] font-medium text-ink">Check-in</div>
            {latestMood ? (
              <div className="rounded-lg border border-rule p-4">
                <div className="flex items-baseline justify-between">
                  <span className="text-xs text-muted-text">Last logged mood</span>
                  <span className="text-[15px] font-medium text-action-dark">{latestMood.mood}</span>
                </div>
                <div className="mt-2 text-[11px] text-muted-text">{new Date(latestMood.createdAt).toLocaleString()}</div>
              </div>
            ) : (
              <EmptyTabState icon={<FileCheck className="h-6 w-6" />} title="No mood check-ins on file" body="This client hasn't logged a mood entry around this session yet." />
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function SoapField({
  label,
  value,
  disabled,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  disabled: boolean;
  onChange: (v: string) => void;
  placeholder: string;
}) {
  return (
    <div>
      <label className="mb-1 block text-[10.5px] font-semibold uppercase tracking-wider text-muted-text">{label}</label>
      <Textarea
        disabled={disabled}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={3}
        placeholder={disabled ? 'Documentation locked until call starts' : placeholder}
        className="resize-none text-xs disabled:bg-surface-warm/40 disabled:opacity-60"
      />
    </div>
  );
}

function EmptyTabState({ icon, title, body }: { icon: React.ReactNode; title: string; body: string }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-rule-hi p-6 text-center text-muted-text">
      {icon}
      <div className="text-sm font-medium text-body-text">{title}</div>
      <div className="text-xs leading-relaxed">{body}</div>
    </div>
  );
}
