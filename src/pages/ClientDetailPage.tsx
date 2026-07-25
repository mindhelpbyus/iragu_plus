import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ChevronLeft, MessageSquare, Video, ShieldCheck } from 'lucide-react';
import { PageHeader } from '../components/layout/PageHeader';
import { Button } from '../components/ui/button';
import { getClientDetail, getClientNotes, getClientConsent, type ClientDetail, type ClinicalNote } from '../api/clientDetail';
import { initialsOf } from './calendar/calendarConstants';

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

export default function ClientDetailPage() {
  const { clientId } = useParams<{ clientId: string }>();
  const navigate = useNavigate();

  const [client, setClient] = useState<ClientDetail | null>(null);
  const [notes, setNotes] = useState<ClinicalNote[]>([]);
  const [consent, setConsent] = useState<Awaited<ReturnType<typeof getClientConsent>> | null>(null);
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
    ])
      .then(([detail, noteList, consentInfo]) => {
        if (cancelled) return;
        setClient(detail);
        setNotes(noteList);
        setConsent(consentInfo);
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
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-text">Booking history</div>
                  <div className="mt-2 text-2xl font-semibold text-ink">
                    {client.hasConfirmedBooking ? 'Has sessions' : 'No sessions yet'}
                  </div>
                </div>
                <div className="rounded-[14px] border border-rule bg-surface p-5">
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-text">Preferred therapy</div>
                  <div className="mt-2 text-2xl font-semibold text-ink">
                    {client.clientProfile?.preferredTherapyType ?? '—'}
                  </div>
                </div>
                <div className="rounded-[14px] border border-rule bg-surface p-5">
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-text">Location</div>
                  <div className="mt-2 text-2xl font-semibold text-ink">{client.clientProfile?.location ?? '—'}</div>
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
            </>
          )}
        </div>
      </main>
    </>
  );
}
