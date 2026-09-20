import { describe, it, expect, vi, afterEach } from 'vitest';
import { noteStatusLabel } from './NotesPage';

describe('noteStatusLabel', () => {
  afterEach(() => vi.useRealTimers());

  it('unsigned note is a draft regardless of age', () => {
    expect(noteStatusLabel({ isSigned: false, createdAt: new Date().toISOString() })).toBe('Draft — unsigned');
  });

  it('signed and within 48h shows the remaining lock window', () => {
    vi.useFakeTimers().setSystemTime(new Date('2026-09-19T12:00:00Z'));
    const createdAt = new Date('2026-09-19T00:00:00Z').toISOString(); // 12h ago
    expect(noteStatusLabel({ isSigned: true, createdAt })).toBe('Signed · locks in 36h');
  });

  it('signed and past 48h is locked', () => {
    vi.useFakeTimers().setSystemTime(new Date('2026-09-19T12:00:00Z'));
    const createdAt = new Date('2026-09-16T12:00:00Z').toISOString(); // 72h ago
    expect(noteStatusLabel({ isSigned: true, createdAt })).toBe('Signed & locked');
  });
});
