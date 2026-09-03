import { useCallback, useEffect, useState } from 'react';
import { listTasks, updateTask, type Task, type TaskCategory } from '../../api/tasks';

export type TaskBucket = 'today' | 'week' | 'later';

export function bucketOf(dueAt: string | null): TaskBucket {
  if (!dueAt) return 'later';
  const due = new Date(dueAt);
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const endOfToday = new Date(startOfToday.getTime() + 24 * 60 * 60 * 1000);
  const endOfWeek = new Date(startOfToday.getTime() + 7 * 24 * 60 * 60 * 1000);
  if (due < endOfToday) return 'today'; // overdue folds into Today, surfaced not hidden
  if (due < endOfWeek) return 'week';
  return 'later';
}

export function useTasks() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<TaskCategory | 'all'>('all');

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const items = await listTasks({ done: false });
      setTasks(items);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load tasks');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const toggleDone = useCallback(async (task: Task) => {
    setTasks((prev) => prev.filter((t) => t.id !== task.id)); // optimistic: leaves the incomplete list
    try {
      await updateTask(task.id, { done: !task.done });
    } catch {
      setTasks((prev) => [...prev, task]); // rollback
    }
  }, []);

  const visible = categoryFilter === 'all' ? tasks : tasks.filter((t) => t.category === categoryFilter);

  return { tasks: visible, loading, error, categoryFilter, setCategoryFilter, toggleDone, reload: load };
}
