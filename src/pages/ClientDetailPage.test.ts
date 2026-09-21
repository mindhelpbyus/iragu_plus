import { describe, it, expect } from 'vitest';
import { canMarkHomeworkComplete, homeworkStatusMeta, sortHomeworkForDisplay } from './ClientDetailPage';
import type { HomeworkRecord } from '../api/homework';

function hw(overrides: Partial<HomeworkRecord>): HomeworkRecord {
  return {
    id: 1,
    clientId: 10,
    therapistId: 20,
    appointmentId: 30,
    title: 'Thought record',
    instructions: null,
    category: null,
    status: 'assigned',
    assignedDate: '2026-09-15T00:00:00Z',
    dueDate: null,
    completedDate: null,
    clientResponse: null,
    therapistFeedback: null,
    templateId: null,
    createdAt: '2026-09-15T00:00:00Z',
    updatedAt: '2026-09-15T00:00:00Z',
    ...overrides,
  };
}

describe('canMarkHomeworkComplete', () => {
  it('allows marking complete from assigned', () => {
    expect(canMarkHomeworkComplete('assigned')).toBe(true);
  });

  it('allows marking complete from in_progress', () => {
    expect(canMarkHomeworkComplete('in_progress')).toBe(true);
  });

  it('allows marking complete from overdue', () => {
    expect(canMarkHomeworkComplete('overdue')).toBe(true);
  });

  it('does not allow marking complete again once already completed (terminal state)', () => {
    expect(canMarkHomeworkComplete('completed')).toBe(false);
  });

  it('is honest about an unrecognised status rather than defaulting to allowed', () => {
    expect(canMarkHomeworkComplete('some_future_status')).toBe(false);
  });
});

describe('homeworkStatusMeta', () => {
  it('labels each real backend status', () => {
    expect(homeworkStatusMeta('assigned').label).toBe('Assigned');
    expect(homeworkStatusMeta('in_progress').label).toBe('In progress');
    expect(homeworkStatusMeta('completed').label).toBe('Completed');
    expect(homeworkStatusMeta('overdue').label).toBe('Overdue');
  });

  it('falls back to the raw status string rather than hiding an unknown value', () => {
    expect(homeworkStatusMeta('mystery').label).toBe('mystery');
  });
});

describe('sortHomeworkForDisplay', () => {
  it('surfaces overdue before in_progress before assigned before completed', () => {
    const items = [
      hw({ id: 1, status: 'completed', completedDate: '2026-09-10T00:00:00Z' }),
      hw({ id: 2, status: 'assigned' }),
      hw({ id: 3, status: 'overdue' }),
      hw({ id: 4, status: 'in_progress' }),
    ];
    expect(sortHomeworkForDisplay(items).map((h) => h.id)).toEqual([3, 4, 2, 1]);
  });

  it('within the actionable group, sorts soonest-due first', () => {
    const items = [
      hw({ id: 1, status: 'assigned', dueDate: '2026-09-30T00:00:00Z' }),
      hw({ id: 2, status: 'assigned', dueDate: '2026-09-20T00:00:00Z' }),
      hw({ id: 3, status: 'assigned', dueDate: '2026-09-25T00:00:00Z' }),
    ];
    expect(sortHomeworkForDisplay(items).map((h) => h.id)).toEqual([2, 3, 1]);
  });

  it('sinks undated items to the end of the actionable group', () => {
    const items = [
      hw({ id: 1, status: 'assigned', dueDate: null }),
      hw({ id: 2, status: 'assigned', dueDate: '2026-09-20T00:00:00Z' }),
    ];
    expect(sortHomeworkForDisplay(items).map((h) => h.id)).toEqual([2, 1]);
  });

  it('sorts completed items most-recently-completed first', () => {
    const items = [
      hw({ id: 1, status: 'completed', completedDate: '2026-09-10T00:00:00Z' }),
      hw({ id: 2, status: 'completed', completedDate: '2026-09-18T00:00:00Z' }),
    ];
    expect(sortHomeworkForDisplay(items).map((h) => h.id)).toEqual([2, 1]);
  });

  it('does not mutate the input array', () => {
    const items = [hw({ id: 1, status: 'completed' }), hw({ id: 2, status: 'overdue' })];
    const originalOrder = items.map((h) => h.id);
    sortHomeworkForDisplay(items);
    expect(items.map((h) => h.id)).toEqual(originalOrder);
  });
});
