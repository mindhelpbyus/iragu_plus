/**
 * api/tasks.ts — backend-initial's /tasks routes (quick-notes Lambda,
 * extended — see src/lambdas/quick-notes/index.js's itemType note). Backs
 * the Dashboard's task-driven activity feed. `dueAt` is a real ISO
 * timestamp or null ("someday") — bucket into Today/This week/Later
 * client-side, don't rely on a stored label.
 */
import { z } from 'zod';
import { apiFetch } from './client';

export const TASK_CATEGORIES = ['Documentation', 'Billing', 'Client follow-up', 'Requests', 'Compliance'] as const;
export type TaskCategory = (typeof TASK_CATEGORIES)[number];

const taskSchema = z.object({
  id: z.string(),
  title: z.string(),
  category: z.enum(TASK_CATEGORIES),
  dueAt: z.string().nullable(),
  done: z.boolean(),
  linkedTab: z.string().nullable(),
  createdAt: z.number(),
  updatedAt: z.number(),
});
export type Task = z.infer<typeof taskSchema>;

export async function listTasks(opts: { category?: TaskCategory; done?: boolean } = {}): Promise<Task[]> {
  const params = new URLSearchParams();
  if (opts.category) params.set('category', opts.category);
  if (opts.done !== undefined) params.set('done', String(opts.done));
  const qs = params.toString();
  const res = await apiFetch(`/tasks${qs ? `?${qs}` : ''}`, {
    schema: z.object({ items: z.array(taskSchema), count: z.number(), nextCursor: z.string().optional() }),
  });
  return res.items;
}

export interface CreateTaskInput {
  title: string;
  category: TaskCategory;
  dueAt?: string | null;
  linkedTab?: string | null;
}

export function createTask(input: CreateTaskInput): Promise<Task> {
  return apiFetch('/tasks', { method: 'POST', body: input, schema: taskSchema });
}

export interface UpdateTaskInput {
  title?: string;
  category?: TaskCategory;
  dueAt?: string | null;
  linkedTab?: string | null;
  done?: boolean;
}

export function updateTask(id: string, input: UpdateTaskInput): Promise<Task> {
  return apiFetch(`/tasks/${encodeURIComponent(id)}`, { method: 'PATCH', body: input, schema: taskSchema });
}

export async function deleteTask(id: string): Promise<void> {
  await apiFetch(`/tasks/${encodeURIComponent(id)}`, {
    method: 'DELETE',
    schema: z.object({ success: z.boolean(), message: z.string() }),
  });
}
