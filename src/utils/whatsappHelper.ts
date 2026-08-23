/**
 * WhatsApp appointment confirmation & reminder link generator.
 */

export interface WhatsAppReminderParams {
  clientPhone: string;
  clientName: string;
  therapistName: string;
  sessionType: string;
  sessionDate: string; // e.g. "Tuesday, Aug 18, 2026"
  sessionTime: string; // e.g. "10:00 AM (IST)"
  meetingUrl?: string;
  clinicName?: string;
}

export function generateWhatsAppReminderUrl({
  clientPhone,
  clientName,
  therapistName,
  sessionType,
  sessionDate,
  sessionTime,
  meetingUrl,
  clinicName = 'Iragu Health',
}: WhatsAppReminderParams): string {
  const cleanPhone = clientPhone.replace(/[^0-9]/g, '');

  let message = `Hello ${clientName},\n\nThis is a friendly reminder for your upcoming therapy appointment with *${therapistName}* at ${clinicName}:\n\n`;
  message += `🗓 *Date:* ${sessionDate}\n`;
  message += `⏰ *Time:* ${sessionTime}\n`;
  message += `💬 *Session:* ${sessionType}\n`;

  if (meetingUrl) {
    message += `\n🔗 *Join Video Call:* ${meetingUrl}\n`;
  }

  message += `\nPlease ensure you are in a quiet, private space. If you need to reschedule, please let us know in advance.\n\nWarm regards,\n*${therapistName}*`;

  return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
}

export function openWhatsAppReminder(params: WhatsAppReminderParams): void {
  const url = generateWhatsAppReminderUrl(params);
  window.open(url, '_blank');
}
