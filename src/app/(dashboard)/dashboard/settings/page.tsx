import { getSettings } from '@/lib/dal/settings';
import { SettingsPageClient } from './settings-page-client';

export default async function SettingsPage() {
  const settings = await getSettings();

  // Transform settings array into a keyed map for easy access
  const settingsMap: Record<string, unknown> = {};
  for (const s of settings) {
    settingsMap[s.key] = s.value;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Settings</h1>
        <p className="text-muted-foreground">
          Manage studio configuration and preferences.
        </p>
      </div>
      <SettingsPageClient initialSettings={settingsMap} />
    </div>
  );
}
