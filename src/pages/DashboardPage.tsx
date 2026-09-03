import { CalendarDays, Plus, Search, Users, Activity as ActivityIcon } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { PageHeader } from '../components/layout/PageHeader';
import { useAuthStore } from '../store/authStore';
import { MetricCard, type MetricCardData } from './dashboard/MetricCard';
import { TodaysSchedule } from './dashboard/TodaysSchedule';
import { ComplianceCard } from './dashboard/ComplianceCard';
import { TaskActivityFeed } from './dashboard/TaskActivityFeed';
import { useDashboardMetrics } from './dashboard/useDashboardMetrics';

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

export default function DashboardPage() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const firstName = (user?.name ?? 'there').replace(/^Dr\.?\s*/i, '').split(' ')[0];
  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'long' });
  const metrics = useDashboardMetrics();

  const sessionsTodayLabel =
    metrics.sessionsToday == null ? '' : ` · You have ${metrics.sessionsToday} session${metrics.sessionsToday === 1 ? '' : 's'} today`;

  // Revenue is deliberately not a metric card here — surfacing a single
  // top-line figure is its own product decision (which period, which
  // framing); see EarningsPage for the real billing_payment-backed numbers.
  // The activity feed is the real TaskActivityFeed card below, not a metric.
  const metricCards: (MetricCardData & { icon: React.ReactNode })[] = [
    { label: 'Active clients', value: metrics.activeClients != null ? String(metrics.activeClients) : null, icon: <Users /> },
    { label: 'Sessions this week', value: metrics.sessionsThisWeek != null ? String(metrics.sessionsThisWeek) : null, icon: <CalendarDays /> },
    { label: 'Avg mood score', value: metrics.avgMoodScore != null ? `${metrics.avgMoodScore} / 10` : null, icon: <ActivityIcon /> },
  ];

  return (
    <>
      <PageHeader title="">
        <div className="pointer-events-none absolute left-1/2 top-1/2 hidden w-[360px] -translate-x-1/2 -translate-y-1/2 md:block">
          <div className="pointer-events-auto relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-text" />
            <input
              type="search"
              placeholder="Search clients, notes, sessions…"
              className="h-10 w-full rounded-[10px] border border-transparent bg-canvas pl-[38px] pr-3.5 text-sm text-ink outline-none transition-colors focus:border-action focus:bg-surface focus:shadow-[0_0_0_3px_rgba(30,112,72,.14)]"
            />
          </div>
        </div>
      </PageHeader>

      <main className="flex-1 overflow-y-auto p-7">
        <div className="mx-auto flex max-w-[1400px] flex-wrap items-end justify-between gap-4 pb-6">
          <div>
            <h2 className="text-[28px] font-medium tracking-tight text-ink">{getGreeting()}, {firstName}</h2>
            <p className="mt-1 text-sm text-muted-text">{today}{sessionsTodayLabel}</p>
          </div>
          <div className="flex gap-2.5">
            <Button variant="outline" className="h-10 gap-2" onClick={() => navigate('/calendar')}>
              <CalendarDays className="h-4 w-4" />
              Book slot
            </Button>
            <Button className="h-10 gap-2" onClick={() => navigate('/clients')}>
              <Plus className="h-4 w-4" />
              New client
            </Button>
          </div>
        </div>

        <div className="mx-auto max-w-[1400px]">
          <div className="mb-6 grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {metricCards.map((m) => (
              <MetricCard key={m.label} {...m} />
            ))}
          </div>

          <div className="grid grid-cols-1 gap-5 xl:grid-cols-[2fr_1fr]">
            <TodaysSchedule />
            <div className="flex flex-col gap-5">
              <TaskActivityFeed />
              <ComplianceCard />
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
