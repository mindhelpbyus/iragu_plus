import { useEffect, useMemo, useRef, useState } from 'react';
import { Users, Send, Loader2, Check } from 'lucide-react';
import { toast } from 'sonner';
import { Textarea } from '../ui/textarea';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import { getRoomNote, saveRoomNoteDraft, markRoomNoteSubmitted, listMessages, postMessage, type ChatMessage } from '../../api/videoService';
import { getMyClients, type BackendClient } from '../../api/clients';
import { getMyTherapistId } from '../../api/therapistMe';
import { createAppointment } from '../../api/appointmentsBackend';
import { createClinicalNote } from '../../api/clinicalNotes';
import { useAuthStore } from '../../store/authStore';
import { EmptyTabState } from './SessionPanel';
import type { CallView } from './useVideoCallState';

type Tab = 'notes' | 'chat' | 'people';

const TABS: { id: Tab; label: string }[] = [
  { id: 'notes', label: 'Notes' },
  { id: 'chat', label: 'Chat' },
  { id: 'people', label: 'People' },
];

const CHAT_POLL_INTERVAL_MS = 4000;
const AUTOSAVE_DEBOUNCE_MS = 1500;

function clientDisplayName(c: BackendClient): string {
  const name = `${c.firstName ?? ''} ${c.lastName ?? ''}`.trim();
  return name || c.email;
}

function tabBtnClass(active: boolean) {
  return active
    ? 'flex-none rounded-lg bg-action-light px-2.5 py-1.5 text-xs font-semibold text-action-dark'
    : 'flex-none rounded-lg px-2.5 py-1.5 text-xs font-medium text-body-text transition-colors hover:bg-surface-sage';
}

interface InstantSessionPanelProps {
  roomId: string;
  view: CallView;
  /** Real call start time (when it actually went live), for the retroactive Appointment created at submit. Null until the call has gone live at least once. */
  callStartedAt: string | null;
}

/**
 * The side panel for an ad-hoc/instant call — a DIFFERENT, smaller
 * component from SessionPanel.tsx (the scheduled-appointment panel), not a
 * variant of it. There is no appointment/client here, so Notes/Consent/
 * File/Check-in (which all key off appointment.clientId) don't apply.
 *
 * Chat and People are the same real functionality as SessionPanel.tsx's
 * tabs (Chat is a working, persisted store; People is the same honest
 * empty-state everywhere in this app). Notes is genuinely different: a
 * plain draft (video-service's own `notes` table — never itself a clinical
 * record) that only becomes a real ClinicalNote once the therapist submits
 * it against a real client, per the platform's clinical_records_require_session
 * rule (backend-initial/src/lib/assert-appointment-tie.ts).
 */
export function InstantSessionPanel({ roomId, view, callStartedAt }: InstantSessionPanelProps) {
  const [tab, setTab] = useState<Tab>('notes');
  const currentUser = useAuthStore((s) => s.user);

  // ── Notes ────────────────────────────────────────────────────────────
  const [noteContent, setNoteContent] = useState('');
  const [noteStatus, setNoteStatus] = useState<'draft' | 'submitted'>('draft');
  const [noteLoaded, setNoteLoaded] = useState(false);
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved'>('idle');
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const hasHadLiveSession = view === 'live' || view === 'ended' || view === 'failover';

  useEffect(() => {
    getRoomNote(roomId)
      .then((note) => {
        setNoteContent(typeof note.data.content === 'string' ? note.data.content : '');
        setNoteStatus(note.status);
      })
      .catch(() => undefined)
      .finally(() => setNoteLoaded(true));
  }, [roomId]);

  const handleNoteChange = (value: string) => {
    setNoteContent(value);
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      setSaveState('saving');
      saveRoomNoteDraft(roomId, value)
        .then(() => setSaveState('saved'))
        .catch(() => setSaveState('idle'));
    }, AUTOSAVE_DEBOUNCE_MS);
  };

  useEffect(() => {
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, []);

  // ── Submit-to-client-record modal ───────────────────────────────────
  const [submitOpen, setSubmitOpen] = useState(false);
  const [clients, setClients] = useState<BackendClient[]>([]);
  const [clientsLoading, setClientsLoading] = useState(false);
  const [clientSearch, setClientSearch] = useState('');
  const [selectedClientId, setSelectedClientId] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const openSubmitModal = () => {
    setSubmitError(null);
    setSubmitOpen(true);
    if (clients.length === 0) {
      setClientsLoading(true);
      getMyClients({ isActive: 'true' })
        .then((res) => setClients(res.data))
        .catch(() => setClients([]))
        .finally(() => setClientsLoading(false));
    }
  };

  const filteredClients = useMemo(() => {
    const q = clientSearch.trim().toLowerCase();
    if (!q) return clients;
    return clients.filter((c) => clientDisplayName(c).toLowerCase().includes(q) || c.email.toLowerCase().includes(q));
  }, [clients, clientSearch]);

  const handleSubmit = async () => {
    if (!selectedClientId) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const therapistId = await getMyTherapistId();
      const startTime = callStartedAt ?? new Date().toISOString();
      const endTime = new Date().toISOString();

      const appointment = await createAppointment({
        therapistId: String(therapistId),
        clientId: String(selectedClientId),
        startTime,
        endTime,
        type: 'individual',
        mode: 'video',
      });

      const clinicalNote = await createClinicalNote({
        therapistId: String(therapistId),
        clientId: String(selectedClientId),
        appointmentId: appointment.id,
        noteType: 'session_summary',
        content: noteContent,
      });

      await markRoomNoteSubmitted(roomId, String(clinicalNote.id));
      setNoteStatus('submitted');
      setSubmitOpen(false);
      const client = clients.find((c) => c.id === selectedClientId);
      toast.success(`Saved to ${client ? clientDisplayName(client) : 'client'}'s chart`);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Could not save this note to a client record.');
    } finally {
      setSubmitting(false);
    }
  };

  // ── Chat (identical logic to SessionPanel.tsx's chat tab) ───────────
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [messageDraft, setMessageDraft] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (tab !== 'chat') return;
    let cancelled = false;
    const load = () => {
      listMessages(roomId)
        .then((msgs) => { if (!cancelled) setMessages(msgs); })
        .catch(() => undefined);
    };
    load();
    const interval = setInterval(load, CHAT_POLL_INTERVAL_MS);
    return () => { cancelled = true; clearInterval(interval); };
  }, [tab, roomId]);

  useEffect(() => {
    if (tab === 'chat') messagesEndRef.current?.scrollIntoView({ block: 'end' });
  }, [messages, tab]);

  const handleSendMessage = async () => {
    const body = messageDraft.trim();
    if (!body) return;
    setSendingMessage(true);
    try {
      const sent = await postMessage(roomId, body);
      setMessages((prev) => [...prev, sent]);
      setMessageDraft('');
    } catch {
      // Real send failure — leave the draft in place so the user can retry.
    } finally {
      setSendingMessage(false);
    }
  };

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-[14px] border border-rule bg-surface shadow-[0_1px_2px_rgba(28,24,18,.05)]">
      <div className="flex flex-none items-center gap-2 border-b border-rule px-3 py-2">
        <div className="flex flex-1 gap-1 overflow-x-auto">
          {TABS.map((t) => (
            <button key={t.id} type="button" onClick={() => setTab(t.id)} className={tabBtnClass(tab === t.id)}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-5">
        {tab === 'notes' && (
          <div className="flex h-full flex-col gap-3">
            {!hasHadLiveSession && (
              <div className="rounded-xl border border-ochre-border bg-ochre-light p-3 text-xs text-body-text">
                <span className="block font-semibold">Notes open once the call starts</span>
                <span className="mt-0.5 block text-[11px] text-muted-text">These notes aren't saved to any client's chart until you submit them.</span>
              </div>
            )}
            {noteStatus === 'submitted' ? (
              <div className="flex items-center gap-2.5 rounded-lg border border-action bg-action-light p-3 text-[12.5px] text-action-dark">
                <Check className="h-4 w-4 flex-none" />
                Saved to a client's chart.
              </div>
            ) : (
              <>
                <Textarea
                  disabled={!hasHadLiveSession || !noteLoaded}
                  value={noteContent}
                  onChange={(e) => handleNoteChange(e.target.value)}
                  rows={12}
                  placeholder={hasHadLiveSession ? "Notes for this call — not saved to any client's chart until you submit." : 'Notes open once the call starts'}
                  className="flex-1 resize-none text-xs disabled:bg-surface-warm/40 disabled:opacity-60"
                />
                <div className="flex flex-none items-center justify-between">
                  <span className="text-[11px] text-muted-text">
                    {saveState === 'saving' ? 'Saving…' : saveState === 'saved' ? 'Draft saved' : ' '}
                  </span>
                  <Button
                    size="sm"
                    disabled={!hasHadLiveSession || !noteContent.trim()}
                    onClick={openSubmitModal}
                    className="h-9 rounded-lg bg-action px-4 text-xs text-canvas hover:bg-action-dark"
                  >
                    Submit to client record
                  </Button>
                </div>
              </>
            )}
          </div>
        )}

        {tab === 'chat' && (
          <div className="flex h-full min-h-0 flex-col gap-3">
            <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto pr-1">
              {messages.length === 0 && (
                <p className="py-6 text-center text-xs text-muted-text">No messages yet. Say hello.</p>
              )}
              {messages.map((m) => {
                const isMine = m.senderUserId === currentUser?.id;
                return (
                  <div key={m.id} className={`flex flex-col ${isMine ? 'items-end' : 'items-start'}`}>
                    <div
                      className={
                        isMine
                          ? 'max-w-[85%] rounded-2xl rounded-br-sm bg-action-light px-3 py-2 text-xs text-action-dark'
                          : 'max-w-[85%] rounded-2xl rounded-bl-sm bg-surface-sage px-3 py-2 text-xs text-body-text'
                      }
                    >
                      {!isMine && <div className="mb-0.5 text-[10px] font-semibold text-muted-text">{m.senderIdentity}</div>}
                      <div className="whitespace-pre-wrap break-words">{m.body}</div>
                    </div>
                    <span className="mt-0.5 text-[10px] text-muted-text">
                      {new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>
            <form
              onSubmit={(e) => { e.preventDefault(); void handleSendMessage(); }}
              className="flex flex-none items-center gap-2 border-t border-rule pt-3"
            >
              <input
                type="text"
                value={messageDraft}
                onChange={(e) => setMessageDraft(e.target.value)}
                placeholder="Send a message…"
                className="h-9 flex-1 rounded-lg border border-rule bg-canvas px-3 text-xs text-ink placeholder:text-muted-text focus:outline-none focus:ring-1 focus:ring-action"
              />
              <Button
                type="submit"
                size="sm"
                disabled={!messageDraft.trim() || sendingMessage}
                className="h-9 w-9 flex-none bg-action p-0 text-canvas hover:bg-action-dark disabled:cursor-not-allowed disabled:bg-surface-warm disabled:text-muted-text disabled:opacity-70"
              >
                <Send className="h-3.5 w-3.5" />
              </Button>
            </form>
          </div>
        )}

        {tab === 'people' && (
          <EmptyTabState
            icon={<Users className="h-6 w-6" />}
            title="Participant roster isn't wired up yet"
            body="This tab is reserved for showing who's connected and on which provider — video-service doesn't expose a live participant list to this frontend yet."
          />
        )}
      </div>

      <Dialog open={submitOpen} onOpenChange={setSubmitOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Submit to client record</DialogTitle>
            <DialogDescription>
              Pick who this call was with. A session record is created for this call, and the note is saved to that
              client's chart.
            </DialogDescription>
          </DialogHeader>

          <Input
            value={clientSearch}
            onChange={(e) => setClientSearch(e.target.value)}
            placeholder="Search your clients"
            className="mb-2"
          />

          <div className="max-h-64 overflow-y-auto rounded-lg border border-rule">
            {clientsLoading ? (
              <div className="flex items-center justify-center p-6">
                <Loader2 className="h-5 w-5 animate-spin text-muted-text" />
              </div>
            ) : filteredClients.length === 0 ? (
              <p className="p-4 text-center text-xs text-muted-text">No matching clients.</p>
            ) : (
              filteredClients.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setSelectedClientId(c.id)}
                  className={`flex w-full items-center justify-between px-3 py-2.5 text-left text-sm transition-colors ${
                    selectedClientId === c.id ? 'bg-action-light text-action-dark' : 'hover:bg-surface-sage'
                  }`}
                >
                  <span>{clientDisplayName(c)}</span>
                  {selectedClientId === c.id && <Check className="h-4 w-4" />}
                </button>
              ))
            )}
          </div>

          {submitError && <p className="mt-2 text-xs text-danger">{submitError}</p>}

          <DialogFooter>
            <Button variant="outline" onClick={() => setSubmitOpen(false)} disabled={submitting}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={!selectedClientId || submitting} className="bg-action text-canvas hover:bg-action-dark">
              {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Save to chart
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
