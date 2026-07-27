import { z } from 'zod';
import { apiFetch } from './client';

export const moodSchema = z.object({
  id: z.number(),
  userId: z.number(),
  mood: z.string(),
  createdAt: z.string(),
});

export type DailyMood = z.infer<typeof moodSchema>;

export async function getClientMoods(userId: number, startDate?: string, endDate?: string): Promise<DailyMood[]> {
  try {
    let url = `/moods?userId=${userId}`;
    if (startDate) url += `&startDate=${encodeURIComponent(startDate)}`;
    if (endDate) url += `&endDate=${encodeURIComponent(endDate)}`;
    
    const res = await apiFetch(url, {
      schema: z.object({ success: z.boolean(), data: z.array(moodSchema) }),
      rawEnvelope: true,
    });
    return res.data;
  } catch (error) {
    console.error('Failed to fetch client moods', error);
    return [];
  }
}

export function getDateRangeForMoods(appointments: { startTime: string; status: string }[] = []) {
  const now = new Date();
  
  const pastSessions = [...appointments]
    .filter((a) => new Date(a.startTime) <= now && ['completed', 'confirmed'].includes(a.status))
    .sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime());
    
  const futureSessions = [...appointments]
    .filter((a) => new Date(a.startTime) > now && a.status === 'confirmed')
    .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());

  const lastSession = pastSessions[0];
  const nextSession = futureSessions[0];

  const startDate = lastSession ? new Date(lastSession.startTime).toISOString() : undefined;
  const endDate = nextSession ? new Date(nextSession.startTime).toISOString() : now.toISOString();

  return { startDate, endDate };
}
