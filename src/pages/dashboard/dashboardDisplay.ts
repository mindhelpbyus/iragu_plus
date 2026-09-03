/**
 * dashboardDisplay.ts — display-only helpers shared by the dashboard's
 * real, backend-fed components (TodaysSchedule.tsx, useDashboardMetrics.ts).
 * Was named mockData.ts; renamed once the last hardcoded metric/schedule/
 * activity data was replaced with real reads — nothing here is placeholder
 * data anymore, only pure formatting helpers.
 */

export type ScheduleTag = 'Individual' | 'Couple' | 'Group' | 'Intake';
export type AppointmentMode = 'ext' | 'int';

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

const TAG_COLORS: Record<ScheduleTag, { bg: string; fg: string }> = {
  Individual: { bg: '#E8F2EB', fg: '#175C3B' },
  Couple: { bg: '#EFEDF5', fg: '#6B6490' },
  Group: { bg: '#F2F6F3', fg: '#4A6F59' },
  Intake: { bg: '#FAF3E2', fg: '#8A6A28' },
};

export function tagColors(tag: ScheduleTag) {
  return TAG_COLORS[tag];
}

export function modeColors(mode: AppointmentMode) {
  return mode === 'ext'
    ? { accent: '#1E7048', tint: '#E8F2EB', timeColor: '#175C3B' }
    : { accent: '#9A90B8', tint: '#EFEDF5', timeColor: '#6B6490' };
}
