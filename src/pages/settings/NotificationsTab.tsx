import { Switch } from '../../components/ui/switch';
import type { NotificationPreferences } from '../../api/notificationPreferences';
import { SettingsSectionHeader } from './settingsUi';

interface NotificationsTabProps {
  prefs: NotificationPreferences | null;
  loading: boolean;
  saving: boolean;
  onToggle: (field: keyof NotificationPreferences) => void;
}

const ROWS: { field: keyof NotificationPreferences; label: string; description: string }[] = [
  { field: 'pushEnabled', label: 'Push notifications', description: 'New requests, messages, and session reminders' },
  { field: 'soundEnabled', label: 'Notification sound', description: 'Play a sound when a notification arrives' },
  { field: 'vibrationEnabled', label: 'Vibration', description: 'Vibrate on notification (mobile devices)' },
];

export function NotificationsTab({ prefs, loading, saving, onToggle }: NotificationsTabProps) {
  return (
    <>
      <SettingsSectionHeader
        title="Notification preferences"
        description="These are the real, current controls — a per-category breakdown (new requests, payouts, missed check-ins, product updates, separately) isn't built yet; every notification type uses these same three switches for now."
      />

      {loading && <div className="py-10 text-center text-sm text-muted-text">Loading…</div>}

      {!loading && prefs && (
        <div className="flex flex-col">
          {ROWS.map((row) => (
            <div
              key={row.field}
              className="flex items-center justify-between gap-4 border-b border-surface-warm py-3.5 last:border-b-0"
            >
              <div>
                <div className="text-sm font-medium text-ink">{row.label}</div>
                <div className="mt-0.5 text-xs text-muted-text">{row.description}</div>
              </div>
              <Switch
                checked={prefs[row.field]}
                disabled={saving}
                onCheckedChange={() => onToggle(row.field)}
              />
            </div>
          ))}
        </div>
      )}
    </>
  );
}
