import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { PageHeader } from '../components/layout/PageHeader';
import { Button } from '../components/ui/button';
import { Search, Lock, Download } from 'lucide-react';
import { useNotes } from './notes/useNotes';
import { initialsOf } from './calendar/calendarConstants';

const SOAP_FIELDS: { key: 'subjective' | 'objective' | 'assessment' | 'plan'; label: string; letter: string }[] = [
  { key: 'subjective', label: 'Subjective', letter: 'S' },
  { key: 'objective', label: 'Objective', letter: 'O' },
  { key: 'assessment', label: 'Assessment', letter: 'A' },
  { key: 'plan', label: 'Plan', letter: 'P' },
];

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

/** "Signed · locks in 36h" / "Signed & locked" / "Draft — unsigned", matching the design's 3 lifecycle strings. */
export function noteStatusLabel(note: { isSigned: boolean; createdAt: string }): string {
  if (!note.isSigned) return 'Draft — unsigned';
  const ageHours = (Date.now() - new Date(note.createdAt).getTime()) / 3_600_000;
  return ageHours < 48 ? `Signed · locks in ${Math.max(1, Math.round(48 - ageHours))}h` : 'Signed & locked';
}

export default function NotesPage() {
  const navigate = useNavigate();
  const { notes, clientNames, loading, error, selectedId, setSelectedId, selected, saving, save, sign } = useNotes();
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [draft, setDraft] = useState<Record<string, string>>({});

  const noteTypes = useMemo(() => Array.from(new Set(notes.map((n) => n.noteType))), [notes]);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return notes.filter((n) => {
      if (typeFilter !== 'all' && n.noteType !== typeFilter) return false;
      if (!q) return true;
      const name = (n.clientId ? clientNames[n.clientId] : '') ?? '';
      return name.toLowerCase().includes(q) || (n.content ?? '').toLowerCase().includes(q);
    });
  }, [notes, search, typeFilter, clientNames]);

  function fieldValue(key: string): string {
    if (draft[key] !== undefined) return draft[key];
    return (selected?.[key as keyof typeof selected] as string | null) ?? '';
  }

  async function handleBlur(key: 'subjective' | 'objective' | 'assessment' | 'plan') {
    if (!selected || selected.isSigned || draft[key] === undefined) return;
    try {
      await save(selected.id, { [key]: draft[key] });
    } catch {
      toast.error('Could not save — try again');
    }
  }

  async function handleSign() {
    if (!selected) return;
    try {
      await sign(selected.id);
      toast.success('Note signed and locked');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not sign this note');
    }
  }

  return (
    <>
      <PageHeader title="Notes" />
      <main className="flex-1 overflow-y-auto p-7">
        <div className="mx-auto max-w-[1400px]">
          <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
            <div>
              <h2 className="text-[28px] font-medium tracking-tight text-ink">Notes</h2>
              <p className="mt-1 text-sm text-muted-text">SOAP format · notes lock 48h after signing</p>
            </div>
            <Button
              className="h-10 gap-2"
              onClick={() =>
                toast.info('Notes are tied to a session — open or start an appointment to add one.', {
                  action: { label: 'Go to calendar', onClick: () => navigate('/calendar') },
                })
              }
            >
              New note
            </Button>
          </div>

          {error && <div className="mb-4 rounded-lg border border-[#E5C6C6] bg-[#FBEFEF] px-4 py-2.5 text-sm text-[#8E4848]">{error}</div>}

          <div className="grid grid-cols-1 gap-5 lg:grid-cols-[300px_minmax(0,1fr)]">
            <div className="flex flex-col gap-3">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 h-[13px] w-[13px] -translate-y-1/2 text-muted-text" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search notes"
                  className="h-9 w-full rounded-lg border border-rule bg-surface pl-[30px] pr-2.5 text-[13px] text-ink outline-none transition-colors focus:border-action"
                />
              </div>

              <div className="flex flex-wrap gap-1.5">
                {['all', ...noteTypes].map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setTypeFilter(t)}
                    className={`h-7 rounded-full border px-2.5 text-[11.5px] font-medium capitalize transition-colors ${
                      typeFilter === t
                        ? 'border-action bg-action-light text-action-dark'
                        : 'border-rule bg-surface text-[#48382E] hover:bg-action-light/40'
                    }`}
                  >
                    {t === 'all' ? 'All' : t.replace(/_/g, ' ')}
                  </button>
                ))}
              </div>

              <div className="flex flex-col gap-1.5 overflow-hidden rounded-[14px] border border-rule bg-surface">
                {loading && <div className="p-6 text-center text-sm text-muted-text">Loading…</div>}
                {!loading && visible.length === 0 && (
                  <div className="p-6 text-center text-sm text-muted-text">No notes found.</div>
                )}
                {!loading &&
                  visible.map((n) => {
                    const name = n.clientId ? clientNames[n.clientId] ?? 'Client' : 'Client';
                    const active = n.id === selectedId;
                    return (
                      <button
                        key={n.id}
                        type="button"
                        onClick={() => {
                          setSelectedId(n.id);
                          setDraft({});
                        }}
                        className={`flex flex-col gap-0.5 border-l-[3px] px-3.5 py-2.5 text-left transition-colors ${
                          active ? 'border-action bg-action-light/40' : 'border-transparent hover:bg-canvas'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="truncate text-[13px] font-semibold text-ink">{name}</span>
                          <span className="flex-shrink-0 rounded-full bg-action-light px-1.5 py-0.5 text-[9.5px] font-semibold capitalize text-action-dark">
                            {n.noteType.replace(/_/g, ' ')}
                          </span>
                        </div>
                        <div className="truncate text-xs text-muted-text">
                          {formatDate(n.createdAt)} · {noteStatusLabel(n)}
                        </div>
                      </button>
                    );
                  })}
              </div>
            </div>

            <div className="rounded-[14px] border border-rule bg-surface p-5">
              {!selected && !loading && (
                <div className="py-16 text-center text-sm text-muted-text">Select a note to view it.</div>
              )}
              {selected && (
                <>
                  <div className="mb-5 flex flex-wrap items-start justify-between gap-3 border-b border-rule pb-4">
                    <div className="flex items-center gap-3">
                      <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-action-light text-sm font-semibold text-action-dark">
                        {initialsOf(selected.clientId ? clientNames[selected.clientId] ?? 'Client' : 'Client')}
                      </span>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-base font-semibold text-ink">
                            {selected.clientId ? clientNames[selected.clientId] ?? 'Client' : 'Client'}
                          </span>
                          <span className="rounded-full bg-action-light px-2 py-0.5 text-[10px] font-semibold capitalize text-action-dark">
                            {selected.noteType.replace(/_/g, ' ')}
                          </span>
                        </div>
                        <div className="text-xs text-muted-text">
                          {formatDate(selected.createdAt)} · {noteStatusLabel(selected)}
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" className="h-9 gap-1.5 text-[13px]">
                        <Download className="h-3.5 w-3.5" />
                        Export
                      </Button>
                      {!selected.isSigned && (
                        <Button className="h-9 gap-1.5 text-[13px]" onClick={handleSign} disabled={saving}>
                          <Lock className="h-3.5 w-3.5" />
                          Sign & lock
                        </Button>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col gap-4">
                    {SOAP_FIELDS.map((f) => (
                      <div key={f.key}>
                        <div className="mb-1.5 flex items-center gap-2">
                          <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded bg-action-light text-[10px] font-bold text-action-dark">
                            {f.letter}
                          </span>
                          <span className="text-[10.5px] font-semibold uppercase tracking-[0.1em] text-action-dark">
                            {f.label}
                          </span>
                        </div>
                        <textarea
                          value={fieldValue(f.key)}
                          onChange={(e) => setDraft((d) => ({ ...d, [f.key]: e.target.value }))}
                          onBlur={() => handleBlur(f.key)}
                          disabled={selected.isSigned}
                          rows={3}
                          className="w-full resize-none rounded-lg border border-rule bg-canvas p-3 text-[13px] leading-relaxed text-body-text outline-none transition-colors focus:border-action disabled:opacity-70"
                        />
                      </div>
                    ))}
                  </div>

                  <div className="mt-5 flex items-center gap-2 rounded-lg bg-canvas px-3.5 py-2.5 text-xs text-muted-text">
                    {saving ? 'Saving…' : 'Auto-saved'} · Audit trail on · Visible only to you and your supervisor
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
