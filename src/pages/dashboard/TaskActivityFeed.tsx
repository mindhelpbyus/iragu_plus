import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ListChecks } from 'lucide-react';
import { Checkbox } from '../../components/ui/checkbox';
import { TASK_CATEGORIES, type Task, type TaskCategory } from '../../api/tasks';
import { bucketOf, useTasks, type TaskBucket } from './useTasks';

const CATEGORY_STYLE: Record<TaskCategory, { bg: string; fg: string }> = {
  Documentation: { bg: '#F2F6F3', fg: '#175C3B' },
  Billing: { bg: '#FBF3E3', fg: '#8A6412' },
  'Client follow-up': { bg: '#E4F2EC', fg: '#145C34' },
  Requests: { bg: '#F5EDE8', fg: '#8E5A3D' },
  Compliance: { bg: '#EFEBF6', fg: '#5B4E8A' },
};

const BUCKET_LABEL: Record<TaskBucket, string> = { today: 'Today', week: 'This week', later: 'Later' };
const BUCKET_ORDER: TaskBucket[] = ['today', 'week', 'later'];

function formatDue(dueAt: string | null): string | null {
  if (!dueAt) return null;
  const due = new Date(dueAt);
  const now = new Date();
  const isOverdue = due < new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const label = due.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  return isOverdue ? `Overdue · ${label}` : label;
}

export function TaskActivityFeed() {
  const navigate = useNavigate();
  const { tasks, loading, error, categoryFilter, setCategoryFilter, toggleDone } = useTasks();

  const grouped = useMemo(() => {
    const g: Record<TaskBucket, Task[]> = { today: [], week: [], later: [] };
    for (const t of tasks) g[bucketOf(t.dueAt)].push(t);
    return g;
  }, [tasks]);

  return (
    <div className="rounded-[14px] border border-rule bg-surface p-5 shadow-[0_1px_2px_0_rgba(28,24,18,.04)]">
      <div className="flex items-center gap-2.5">
        <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-[9px] bg-action-light text-action-dark">
          <ListChecks className="h-4 w-4" />
        </div>
        <div className="text-sm font-semibold text-ink">Tasks</div>
      </div>

      <div className="mt-3.5 flex flex-wrap gap-1.5">
        <button
          type="button"
          onClick={() => setCategoryFilter('all')}
          className={`h-7 rounded-full border px-2.5 text-[11px] font-medium transition-colors ${
            categoryFilter === 'all' ? 'border-action bg-action-light text-action-dark' : 'border-rule text-muted-text hover:bg-canvas'
          }`}
        >
          All
        </button>
        {TASK_CATEGORIES.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => setCategoryFilter(c)}
            className={`h-7 rounded-full border px-2.5 text-[11px] font-medium transition-colors ${
              categoryFilter === c ? 'border-action bg-action-light text-action-dark' : 'border-rule text-muted-text hover:bg-canvas'
            }`}
          >
            {c}
          </button>
        ))}
      </div>

      <div className="mt-4 flex flex-col gap-4">
        {loading && <div className="py-4 text-center text-sm text-muted-text">Loading tasks…</div>}
        {error && <div className="py-4 text-center text-sm text-[#B06060]">{error}</div>}
        {!loading && !error && tasks.length === 0 && (
          <div className="py-4 text-center text-sm text-muted-text">No open tasks.</div>
        )}

        {!loading &&
          !error &&
          BUCKET_ORDER.filter((b) => grouped[b].length > 0).map((bucket) => (
            <div key={bucket}>
              <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-text">
                {BUCKET_LABEL[bucket]}
              </div>
              <div className="flex flex-col gap-1">
                {grouped[bucket].map((task) => {
                  const style = CATEGORY_STYLE[task.category];
                  const due = formatDue(task.dueAt);
                  return (
                    <div key={task.id} className="flex items-start gap-2.5 rounded-lg px-1.5 py-2 hover:bg-canvas">
                      <Checkbox
                        checked={task.done}
                        onCheckedChange={() => toggleDone(task)}
                        className="mt-0.5"
                        aria-label={`Mark "${task.title}" done`}
                      />
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-[13px] font-medium text-ink">{task.title}</div>
                        <div className="mt-1 flex flex-wrap items-center gap-1.5">
                          <span
                            className="rounded-full px-2 py-0.5 text-[10px] font-medium"
                            style={{ background: style.bg, color: style.fg }}
                          >
                            {task.category}
                          </span>
                          {due && <span className="text-[11px] text-[#8E7563]">{due}</span>}
                        </div>
                      </div>
                      {task.linkedTab && (
                        <button
                          type="button"
                          onClick={() => navigate(task.linkedTab!)}
                          className="flex-shrink-0 rounded-md px-2 py-1 text-[11px] font-medium text-action-dark hover:bg-action-light"
                        >
                          Open
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
      </div>
    </div>
  );
}
