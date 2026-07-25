export interface ClientRow {
  id: string;
  name: string;
  email: string;
  phone: string;
  status: 'active' | 'inactive';
  totalSessions: number;
  nextAppointment: string | null;
  safetyRisk?: string;
}
