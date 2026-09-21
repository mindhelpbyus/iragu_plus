import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { ChevronLeft, MessageSquare, Video, ShieldCheck } from 'lucide-react';
import { PageHeader } from '../components/layout/PageHeader';
import { Button } from '../components/ui/button';
import { getClientDetail, getClientNotes, getClientConsent, type ClientDetail, type ClinicalNote } from '../api/clientDetail';
import { getClientAppointments, type AppointmentDetails } from '../api/appointmentsBackend';
import { getClientMoods, getDateRangeForMoods, type DailyMood } from '../api/moods';
import { listHomework, updateHomework, type HomeworkRecord } from '../api/homework';
import { getMyTherapistId } from '../api/therapistMe';
import { MoodIndicator } from '../components/ui/MoodIndicator';
import { initialsOf } from './calendar/calendarConstants';

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleDateString('en-IN', { weekday: 'short', day: '2-digit', month: 'short' }) +
    ' · ' + new Date(iso).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false });
}

/** The next confirmed/scheduled session in the future, or null if none. */
export function nextSessionOf(appointments: AppointmentDetails[]): AppointmentDetails | null {
  const now = Date.now();
  const upcoming = appointments.filter(
    (a) => (a.status === 'confirmed' || a.status === 'scheduled') && new Date(a.startTime).getTime() > now,
  );
  if (upcoming.length === 0) return null;
  return upcoming.reduce((soonest, a) => (a.startTime < soonest.startTime ? a : soonest));
}

/** Real backend.HomeworkLexicon values (backend-initial/src/shared/lexicons/homework.ts)
 *  — UI display metadata only, mirrored for presentation, never for authorization. */
const HOMEWORK_STATUS_META: Record<string, { label: string; badgeClass: string; borderClass: string }> = {
  assigned: { label: 'Assigned', badgeClass: 'bg-surface-warm text-muted-text', borderClass: 'border-rule-hi' },
  in_progress: { label: 'In progress', badgeClass: 'bg-lavender-light text-lavender', borderClass: 'border-lavender' },
  completed: { label: 'Completed', badgeClass: 'bg-action-light text-action-dark', borderClass: 'border-action' },
  overdue: { label: 'Overdue', badgeClass: 'bg-ochre-light text-ochre', borderClass: 'border-ochre' },
};

export function homeworkStatusMeta(status: string): { label: string; badgeClass: string; borderClass: string } {
  return HOMEWORK_STATUS_META[status] ?? { label: status, badgeClass: 'bg-surface-warm text-muted-text', borderClass: 'border-rule-hi' };
}

/** Mirrors HomeworkLexicon's `mark_complete` action — from assigned/in_progress/
 *  overdue, actor 'therapist' (backend-initial/src/shared/lexicons/homework.ts).
 *  UX only: decides whether to show the "Mark complete" button. PATCH
 *  /homework/{id} is the real, lexicon-gated authority server-side — a status
 *  this function green-lights can still be rejected there, and this client
 *  does not work around that. */
const THERAPIST_MARK_COMPLETE_FROM = new Set(['assigned', 'in_progress', 'overdue']);
export function canMarkHomeworkComplete(status: string): boolean {
  return THERAPIST_MARK_COMPLETE_FROM.has(status);
}

const HOMEWORK_STATUS_PRIORITY: Record<string, number> = { overdue: 0, in_progress: 1, assigned: 2, completed: 3 };

/** Actionable homework (overdue, then in-progress, then assigned) surfaces
 *  before completed items. Within the actionable group, soonest-due-first;
 *  undated items sink to the end of their group. Completed items sort most-
 *  recently-completed-first. Pure display ordering — the backend already
 *  orders by assignedDate desc; this re-orders for "what needs attention". */
export function sortHomeworkForDisplay(items: HomeworkRecord[]): HomeworkRecord[] {
  return [...items].sort((a, b) => {
    const pa = HOMEWORK_STATUS_PRIORITY[a.status] ?? 2;
    const pb = HOMEWORK_STATUS_PRIORITY[b.status] ?? 2;
    if (pa !== pb) return pa - pb;
    if (a.status === 'completed') {
      const ca = a.completedDate ? new Date(a.completedDate).getTime() : 0;
      const cb = b.completedDate ? new Date(b.completedDate).getTime() : 0;
      return cb - ca;
    }
    const da = a.dueDate ? new Date(a.dueDate).getTime() : Infinity;
    const db = b.dueDate ? new Date(b.dueDate).getTime() : Infinity;
    return da - db;
  });
}

export default function ClientDetailPage() {
  const { clientId } = useParams<{ clientId: string }>();
  const navigate = useNavigate();

  const [client, setClient] = useState<ClientDetail | null>(null);
  const [notes, setNotes] = useState<ClinicalNote[]>([]);
  const [consent, setConsent] = useState<Awaited<ReturnType<typeof getClientConsent>> | null>(null);
  const [moods, setMoods] = useState<DailyMood[]>([]);
  const [appointments, setAppointments] = useState<AppointmentDetails[]>([]);
  const [homework, setHomework] = useState<HomeworkRecord[]>([]);
  const [markingCompleteId, setMarkingCompleteId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!clientId) return;
    let cancelled = false;
    setLoading(true);
    setError(null);

    Promise.all([
      getClientDetail(clientId),
      getClientNotes(clientId).catch(() => []),
      getClientConsent(clientId).catch(() => null),
      getClientAppointments(clientId).catch(() => []),
      getMyTherapistId()
        .then((therapistId) => listHomework(clientId, { therapistId: String(therapistId) }))
        .catch(() => []),
    ])
      .then(async ([detail, noteList, consentInfo, appointments, homeworkList]) => {
        if (cancelled) return;

        const { startDate, endDate } = getDateRangeForMoods(appointments);
        const moodList = await getClientMoods(Number(clientId), startDate, endDate).catch(() => []);

        if (cancelled) return;
        setClient(detail);
        setNotes(noteList);
        setConsent(consentInfo);
        setMoods(moodList);
        setAppointments(appointments);
        setHomework(homeworkList);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load client');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [clientId]);

  const name = client ? `${client.firstName ?? ''} ${client.lastName ?? ''}`.trim() || client.email : '';

  /** Same discipline as NotesPage.tsx's "New note" button: POST /homework
   *  requires a real appointmentId tied to this therapist/client pair
   *  (assertAppointmentTie, server-side), so there is no client-picker or
   *  appointment-picker here — the therapist is pointed at a real session
   *  instead of one being fabricated for them. */
  function handleAssignHomeworkClick() {
    toast.info('Homework is tied to a session — open or start an appointment with this client to assign it.', {
      action: { label: 'Go to calendar', onClick: () => navigate('/calendar') },
    });
  }

  async function handleMarkComplete(id: number) {
    setMarkingCompleteId(id);
    try {
      const updated = await updateHomework(id, { status: 'completed' });
      setHomework((prev) => prev.map((h) => (h.id === id ? updated : h)));
      toast.success('Homework marked as completed');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not update this homework');
    } finally {
      setMarkingCompleteId(null);
    }
  }

  return (
    <>
      <PageHeader title="Client profile" />

      <main className="flex-1 overflow-y-auto p-7">
        <div className="mx-auto max-w-[1400px]">
          <button
            type="button"
            onClick={() => navigate('/clients')}
            className="mb-4 flex items-center gap-1 text-[13px] font-medium text-muted-text hover:text-action-dark"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
            All clients
          </button>

          {loading && <div className="p-10 text-center text-sm text-muted-text">Loading client…</div>}
          {error && <div className="p-10 text-center text-sm text-[#B06060]">{error}</div>}

          {!loading && !error && client && (
            <>
              <div className="mb-5 flex flex-wrap items-center justify-between gap-4 rounded-[14px] border border-rule bg-surface p-5 shadow-[0_1px_2px_0_rgba(28,24,18,.04)]">
                <div className="flex items-center gap-4">
                  <span className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-full bg-action-light text-base font-semibold text-action-dark">
                    {initialsOf(name)}
                  </span>
                  <div>
                    <div className="text-lg font-semibold text-ink">{name}</div>
                    <div className="text-[13px] text-muted-text">
                      {client.email}
                      {client.phone ? ` · ${client.phone}` : ''} · Client since{' '}
                      {new Date(client.createdAt).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}
                    </div>
                  </div>
                </div>
                <div className="flex gap-2.5">
                  <Button variant="outline" className="h-10 gap-2">
                    <MessageSquare className="h-4 w-4" />
                    Message
                  </Button>
                  <Button className="h-10 gap-2">
                    <Video className="h-4 w-4" />
                    Start session
                  </Button>
                </div>
              </div>

              <div className="mb-5 grid grid-cols-1 gap-5 sm:grid-cols-3">
                <div className="rounded-[14px] border border-rule bg-surface p-5">
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-text">Sessions completed</div>
                  <div className="mt-2 text-2xl font-semibold text-ink">
                    {appointments.filter((a) => a.status === 'completed').length}
                  </div>
                </div>
                <div className="rounded-[14px] border border-rule bg-surface p-5">
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-text">Next session</div>
                  <div className="mt-2 text-2xl font-semibold text-ink">
                    {(() => {
                      const next = nextSessionOf(appointments);
                      return next ? formatDateTime(next.startTime) : '—';
                    })()}
                  </div>
                </div>
                <div className="flex flex-col justify-between rounded-[14px] border border-rule bg-surface p-5">
                  <div className="flex items-center justify-between">
                    <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-text">Latest mood</div>
                    <span className="text-xs font-semibold text-action-dark">{moods.length > 0 ? `${moods.length} entries` : 'No data'}</span>
                  </div>
                  <div className="mt-auto pt-4">
                    <MoodIndicator moods={moods} className="h-6 gap-1" showScore={true} />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-5 xl:grid-cols-[2fr_1fr]">
                <div className="rounded-[14px] border border-rule bg-surface p-5">
                  <h3 className="mb-3 text-base font-semibold text-ink">Clinical notes</h3>
                  {notes.length === 0 && <p className="text-sm text-muted-text">No notes yet.</p>}
                  <div className="flex flex-col gap-3">
                    {notes.map((n) => (
                      <div key={n.id} className="rounded-lg border-l-[3px] border-action bg-canvas p-3.5">
                        <div className="text-[11px] font-semibold uppercase tracking-wider text-action-dark">
                          {formatDate(n.createdAt)} · {n.noteType}
                        </div>
                        <p className="mt-1.5 text-[13px] leading-relaxed text-body-text">
                          {n.clientSummary || n.content || 'No summary available.'}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex flex-col gap-5">
                  <div className="rounded-[14px] border border-rule bg-surface p-5">
                    <h3 className="mb-3 text-base font-semibold text-ink">Details</h3>
                    <dl className="flex flex-col gap-2.5 text-[13px]">
                      {[
                        ['Date of birth', client.dateOfBirth ? formatDate(client.dateOfBirth) : '—'],
                        ['Phone', client.phone ?? '—'],
                        ['Email', client.email],
                        ['Preferred therapy', client.clientProfile?.preferredTherapyType ?? '—'],
                        [
                          'Languages',
                          client.clientProfile?.preferredLanguages?.length
                            ? client.clientProfile.preferredLanguages.join(', ')
                            : '—',
                        ],
                        [
                          'Session length',
                          client.clientProfile?.preferredSessionLength
                            ? `${client.clientProfile.preferredSessionLength} min`
                            : '—',
                        ],
                      ].map(([label, value]) => (
                        <div key={label} className="flex items-center justify-between gap-3">
                          <dt className="text-muted-text">{label}</dt>
                          <dd className="text-right font-medium text-ink">{value}</dd>
                        </div>
                      ))}
                    </dl>
                  </div>

                  <div className="rounded-[14px] border border-rule bg-surface p-5">
                    <h3 className="mb-3 text-base font-semibold text-ink">Consent</h3>
                    {consent ? (
                      <div className="flex items-center gap-2 text-[13px]">
                        <ShieldCheck
                          className="h-4 w-4 flex-shrink-0"
                          style={{ color: consent.consentGiven ? '#1E7048' : '#B06060' }}
                        />
                        <span className="text-ink">
                          Data privacy (DPDP) —{' '}
                          {consent.consentGiven
                            ? `signed${consent.consentGivenAt ? ' ' + formatDate(consent.consentGivenAt) : ''}`
                            : 'not signed'}
                        </span>
                      </div>
                    ) : (
                      <p className="text-sm text-muted-text">Consent status unavailable.</p>
                    )}
                  </div>
                </div>
              </div>

              <div className="mt-5 rounded-[14px] border border-rule bg-surface p-5">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <h3 className="text-base font-semibold text-ink">Homework</h3>
                  <Button variant="outline" className="h-8 gap-1.5 text-xs" onClick={handleAssignHomeworkClick}>
                    Assign homework
                  </Button>
                </div>
                {homework.length === 0 && <p className="text-sm text-muted-text">No homework assigned yet.</p>}
                <div className="flex flex-col gap-3">
                  {sortHomeworkForDisplay(homework).map((h) => {
                    const meta = homeworkStatusMeta(h.status);
                    return (
                      <div key={h.id} className={`rounded-lg border-l-[3px] ${meta.borderClass} bg-canvas p-3.5`}>
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <div>
                            <div className="text-[13px] font-semibold text-ink">{h.title}</div>
                            <div className="mt-0.5 text-xs text-muted-text">
                              Assigned {formatDate(h.assignedDate)}
                              {h.dueDate ? ` · Due ${formatDate(h.dueDate)}` : ''}
                              {h.category ? ` · ${h.category}` : ''}
                            </div>
                          </div>
                          <span className={`flex-shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${meta.badgeClass}`}>
                            {meta.label}
                          </span>
                        </div>
                        {h.instructions && (
                          <p className="mt-2 text-[13px] leading-relaxed text-body-text">{h.instructions}</p>
                        )}
                        {h.clientResponse && (
                          <p className="mt-2 rounded bg-surface px-2.5 py-2 text-xs text-body-text">
                            <span className="font-semibold text-muted-text">Client response: </span>
                            {h.clientResponse}
                          </p>
                        )}
                        {canMarkHomeworkComplete(h.status) && (
                          <div className="mt-2.5">
                            <Button
                              variant="outline"
                              className="h-7 gap-1.5 text-xs"
                              disabled={markingCompleteId === h.id}
                              onClick={() => handleMarkComplete(h.id)}
                            >
                              {markingCompleteId === h.id ? 'Saving…' : 'Mark complete'}
                            </Button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          )}
        </div>
      </main>
    </>
  );
}
