/**
 * TODO(backend): every value here is placeholder data from the design prototype.
 * Replace with real reads once endpoints exist:
 *  - metrics (active clients, sessions this week, avg mood) -> backend-initial /clients, /appointments
 *  - revenue metric                                          -> billing_payment earnings summary
 *  - todaysSchedule                                          -> backend-initial /appointments?date=today
 *  - clientActivity                                          -> backend-initial activity/audit feed
 */

export interface MetricCardData {
  label: string;
  value: string;
  delta: string;
}

export const METRICS: MetricCardData[] = [
  { label: 'Active clients', value: '124', delta: '+8 vs last week' },
  { label: 'Sessions this week', value: '28', delta: '+3 vs last week' },
  { label: 'Revenue (₹)', value: '₹1,24,500', delta: '+12% vs last week' },
  { label: 'Avg mood score', value: '7.2 / 10', delta: '+0.4 vs last week' },
];

export type AppointmentMode = 'ext' | 'int';

export interface ScheduleAppointment {
  time: string;
  name: string;
  type: string;
  tag: 'Individual' | 'Couple' | 'Group' | 'Intake';
  mode: AppointmentMode;
}

export const TODAYS_SCHEDULE: ScheduleAppointment[] = [
  { time: '10:00 – 10:50', name: 'Arjun Kapoor', type: 'Individual · CBT · Zoom', tag: 'Individual', mode: 'ext' },
  { time: '11:15 – 12:00', name: 'Ananya & Rohan S.', type: 'Couple therapy · In-person', tag: 'Couple', mode: 'int' },
  { time: '14:00 – 14:45', name: 'Meera Krishnan', type: 'Intake assessment · Jitsi', tag: 'Intake', mode: 'ext' },
  { time: '15:30 – 16:30', name: 'Support circle (8)', type: 'Group · Anxiety · In-person', tag: 'Group', mode: 'int' },
];

export interface ClientActivityItem {
  name: string;
  activity: string;
  time: string;
  dot?: string;
}

export const CLIENT_ACTIVITY: ClientActivityItem[] = [
  { name: 'Arjun Kapoor', activity: 'Completed mood check-in', time: '2h ago' },
  { name: 'Sneha Pillai', activity: 'Sent a message', time: '3h ago', dot: '#1E7048' },
  { name: 'Rahul Sharma', activity: 'Logged homework', time: '5h ago' },
  { name: 'Ananya Sen', activity: 'Booked a follow-up', time: 'yesterday' },
  { name: 'Vivek Iyer', activity: 'Missed check-in', time: 'yesterday', dot: '#B06060' },
];

export function initialsOf(name: string): string {
  return name
    .replace(/[^A-Za-z& ]/g, '')
    .split(' ')
    .filter(Boolean)
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

const TAG_COLORS: Record<ScheduleAppointment['tag'], { bg: string; fg: string }> = {
  Individual: { bg: '#E8F2EB', fg: '#175C3B' },
  Couple: { bg: '#EFEDF5', fg: '#6B6490' },
  Group: { bg: '#F2F6F3', fg: '#4A6F59' },
  Intake: { bg: '#FAF3E2', fg: '#8A6A28' },
};

export function tagColors(tag: ScheduleAppointment['tag']) {
  return TAG_COLORS[tag];
}

export function modeColors(mode: AppointmentMode) {
  return mode === 'ext'
    ? { accent: '#1E7048', tint: '#E8F2EB', timeColor: '#175C3B' }
    : { accent: '#9A90B8', tint: '#EFEDF5', timeColor: '#6B6490' };
}
