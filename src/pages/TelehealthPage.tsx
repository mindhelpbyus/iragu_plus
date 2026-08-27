import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Loader2, CalendarX } from 'lucide-react';
import { TelehealthSplitView } from '../components/telehealth/TelehealthSplitView';
import { getAppointmentDetails, type AppointmentDetails } from '../api/appointmentsBackend';
import { getClientDetail, type ClientDetail } from '../api/clientDetail';

export default function TelehealthPage() {
  const { appointmentId } = useParams<{ appointmentId: string }>();
  const [appointment, setAppointment] = useState<AppointmentDetails | null>(null);
  const [client, setClient] = useState<ClientDetail | null>(null);
  const [loading, setLoading] = useState(Boolean(appointmentId));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!appointmentId) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    (async () => {
      try {
        const appt = await getAppointmentDetails(appointmentId);
        if (cancelled) return;
        setAppointment(appt);
        // Client detail is best-effort — the call still works without it (DOB
        // just won't render), so a failure here shouldn't block the session.
        try {
          const c = await getClientDetail(String(appt.clientId));
          if (!cancelled) setClient(c);
        } catch {
          if (!cancelled) setClient(null);
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load appointment');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [appointmentId]);

  if (!appointmentId) {
    return (
      <div className="flex h-[calc(100vh-80px)] flex-col items-center justify-center gap-3 text-center">
        <CalendarX className="h-10 w-10 text-muted-foreground" />
        <div>
          <p className="font-semibold text-foreground">No session selected</p>
          <p className="text-sm text-muted-foreground">
            Open a video session from{' '}
            <Link to="/calendar" className="text-primary hover:underline">
              the calendar
            </Link>{' '}
            or today's schedule.
          </p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex h-[calc(100vh-80px)] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !appointment) {
    return (
      <div className="flex h-[calc(100vh-80px)] flex-col items-center justify-center gap-3 text-center">
        <CalendarX className="h-10 w-10 text-destructive" />
        <div>
          <p className="font-semibold text-foreground">Couldn't load this session</p>
          <p className="text-sm text-muted-foreground">{error || 'Appointment not found.'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full">
      <TelehealthSplitView appointment={appointment} client={client} />
    </div>
  );
}
