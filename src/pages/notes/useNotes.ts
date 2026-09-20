import { useCallback, useEffect, useMemo, useState } from 'react';
import { getMyTherapistId } from '../../api/therapistMe';
import { getMyClients } from '../../api/clients';
import {
  listTherapistNotes,
  updateClinicalNote,
  signClinicalNote,
  type ClinicalNoteRecord,
  type UpdateClinicalNoteRequest,
} from '../../api/clinicalNotes';

export function useNotes() {
  const [notes, setNotes] = useState<ClinicalNoteRecord[]>([]);
  const [clientNames, setClientNames] = useState<Record<number, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const therapistId = await getMyTherapistId();
      const [noteRows, clientsRes] = await Promise.all([
        listTherapistNotes(String(therapistId)),
        getMyClients({ limit: 100 }).catch(() => ({ data: [] as { id: number; firstName: string | null; lastName: string | null }[] })),
      ]);
      setNotes(noteRows);
      setClientNames(
        Object.fromEntries(
          clientsRes.data.map((c) => [c.id, `${c.firstName ?? ''} ${c.lastName ?? ''}`.trim() || 'Client']),
        ),
      );
      if (noteRows.length > 0) setSelectedId((prev) => prev ?? noteRows[0].id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load notes');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const selected = useMemo(() => notes.find((n) => n.id === selectedId) ?? null, [notes, selectedId]);

  const save = useCallback(async (id: number, patch: UpdateClinicalNoteRequest) => {
    setSaving(true);
    try {
      const updated = await updateClinicalNote(id, patch);
      setNotes((prev) => prev.map((n) => (n.id === id ? updated : n)));
      return updated;
    } finally {
      setSaving(false);
    }
  }, []);

  const sign = useCallback(async (id: number) => {
    setSaving(true);
    try {
      const signed = await signClinicalNote(id);
      setNotes((prev) => prev.map((n) => (n.id === id ? signed : n)));
      return signed;
    } finally {
      setSaving(false);
    }
  }, []);

  return { notes, clientNames, loading, error, selectedId, setSelectedId, selected, saving, save, sign };
}
