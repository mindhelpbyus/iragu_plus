/**
 * RFC 5545 iCalendar (.ics) generator for therapy appointment invites.
 */

export interface IcsEventParams {
  title: string;
  description: string;
  startTime: Date;
  endTime: Date;
  locationUrl?: string;
  organizerName?: string;
  organizerEmail?: string;
  attendeeEmail?: string;
}

function formatDateToICS(date: Date): string {
  return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
}

export function generateIcsContent(event: IcsEventParams): string {
  const uid = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}@iragu.app`;
  const dtStamp = formatDateToICS(new Date());
  const dtStart = formatDateToICS(event.startTime);
  const dtEnd = formatDateToICS(event.endTime);

  const cleanDescription = (event.description || '').replace(/\n/g, '\\n');

  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Iragu Plus//Telehealth Practice Management//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:REQUEST',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${dtStamp}`,
    `DTSTART:${dtStart}`,
    `DTEND:${dtEnd}`,
    `SUMMARY:${event.title}`,
    `DESCRIPTION:${cleanDescription}`,
    event.locationUrl ? `LOCATION:${event.locationUrl}` : '',
    event.locationUrl ? `URL:${event.locationUrl}` : '',
    event.organizerEmail
      ? `ORGANIZER;CN=${event.organizerName || 'Therapist'}:mailto:${event.organizerEmail}`
      : '',
    event.attendeeEmail ? `ATTENDEE;ROLE=REQ-PARTICIPANT;RSVP=TRUE:mailto:${event.attendeeEmail}` : '',
    'STATUS:CONFIRMED',
    'BEGIN:VALARM',
    'TRIGGER:-PT15M',
    'ACTION:DISPLAY',
    `DESCRIPTION:Reminder: ${event.title}`,
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR',
  ]
    .filter(Boolean)
    .join('\r\n');
}

export function downloadIcsFile(filename: string, event: IcsEventParams): void {
  const icsData = generateIcsContent(event);
  const blob = new Blob([icsData], { type: 'text/calendar;charset=utf-8' });
  const link = document.createElement('a');
  link.href = window.URL.createObjectURL(blob);
  link.setAttribute('download', `${filename.replace(/[^a-zA-Z0-9-_]/g, '_')}.ics`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
