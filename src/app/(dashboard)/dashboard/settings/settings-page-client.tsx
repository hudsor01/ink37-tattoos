'use client';

import { useState } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { upsertSettingAction } from '@/lib/actions/settings-actions';
import { toast } from 'sonner';

interface SettingsPageClientProps {
  initialSettings: Record<string, unknown>;
}

function getVal(settings: Record<string, unknown>, key: string, fallback = ''): string {
  const v = settings[key];
  if (typeof v === 'string') return v;
  if (v != null) return String(v);
  return fallback;
}

function getBool(settings: Record<string, unknown>, key: string, fallback = false): boolean {
  const v = settings[key];
  if (typeof v === 'boolean') return v;
  return fallback;
}

async function saveSetting(key: string, value: unknown, category: string) {
  const formData = new FormData();
  formData.append('key', key);
  formData.append('value', typeof value === 'string' ? JSON.stringify(value) : JSON.stringify(value));
  formData.append('category', category);
  await upsertSettingAction(formData);
}

export function SettingsPageClient({ initialSettings }: SettingsPageClientProps) {
  const [settings, setSettings] = useState(initialSettings);
  const [saving, setSaving] = useState(false);

  function updateLocal(key: string, value: unknown) {
    setSettings((prev) => ({ ...prev, [key]: value }));
  }

  async function saveCategory(category: string, keys: string[]) {
    setSaving(true);
    toast.promise(
      (async () => {
        for (const key of keys) {
          if (settings[key] !== initialSettings[key]) {
            await saveSetting(key, settings[key], category);
          }
        }
      })().finally(() => setSaving(false)),
      {
        loading: 'Saving settings...',
        success: 'Settings saved',
        error: "Changes couldn't be saved. Please try again.",
      }
    );
  }

  return (
    <Tabs defaultValue="studio">
      <TabsList>
        <TabsTrigger value="studio">Studio Info</TabsTrigger>
        <TabsTrigger value="booking">Booking</TabsTrigger>
        <TabsTrigger value="notifications">Notifications</TabsTrigger>
        <TabsTrigger value="appearance">Appearance</TabsTrigger>
      </TabsList>

      <TabsContent value="studio">
        <Card>
          <CardHeader>
            <CardTitle>Studio Information</CardTitle>
            <CardDescription>Basic details about your tattoo studio.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <label className="text-sm font-medium">Studio Name
              <Input
                value={getVal(settings, 'studio_name')}
                onChange={(e) => updateLocal('studio_name', e.target.value)}
                placeholder="Ink37 Tattoos"
              />
            </label>
            <label className="text-sm font-medium">Address
              <Input
                value={getVal(settings, 'studio_address')}
                onChange={(e) => updateLocal('studio_address', e.target.value)}
                placeholder="123 Main St"
              />
            </label>
            <div className="grid grid-cols-2 gap-4">
              <label className="text-sm font-medium">Phone
                <Input
                  value={getVal(settings, 'studio_phone')}
                  onChange={(e) => updateLocal('studio_phone', e.target.value)}
                  placeholder="(555) 123-4567"
                />
              </label>
              <label className="text-sm font-medium">Email
                <Input
                  value={getVal(settings, 'studio_email')}
                  onChange={(e) => updateLocal('studio_email', e.target.value)}
                  placeholder="info@ink37tattoos.com"
                />
              </label>
            </div>
            <label className="text-sm font-medium">Description
              <Textarea
                value={getVal(settings, 'studio_description')}
                onChange={(e) => updateLocal('studio_description', e.target.value)}
                placeholder="Tell clients about your studio..."
              />
            </label>
            <label className="text-sm font-medium">Website URL
              <Input
                value={getVal(settings, 'studio_website')}
                onChange={(e) => updateLocal('studio_website', e.target.value)}
                placeholder="https://ink37tattoos.com"
              />
            </label>
            <Button
              onClick={() =>
                saveCategory('studio', [
                  'studio_name',
                  'studio_address',
                  'studio_phone',
                  'studio_email',
                  'studio_description',
                  'studio_website',
                ])
              }
              disabled={saving}
            >
              {saving ? 'Saving...' : 'Save Studio Info'}
            </Button>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="booking">
        <Card>
          <CardHeader>
            <CardTitle>Booking Configuration</CardTitle>
            <CardDescription>Cal.com integration and session defaults.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <label className="text-sm font-medium">Cal.com Username
              <Input
                value={getVal(settings, 'cal_username')}
                onChange={(e) => updateLocal('cal_username', e.target.value)}
                placeholder="your-cal-username"
              />
            </label>
            <label className="text-sm font-medium">Event Type Slugs (comma-separated)
              <Input
                value={getVal(settings, 'cal_event_slugs')}
                onChange={(e) => updateLocal('cal_event_slugs', e.target.value)}
                placeholder="consultation,tattoo-session,touch-up"
              />
            </label>
            <label className="text-sm font-medium">Default Session Duration (minutes)
              <Input
                type="number"
                value={getVal(settings, 'default_session_duration', '60')}
                onChange={(e) => updateLocal('default_session_duration', e.target.value)}
              />
            </label>
            <Button
              onClick={() =>
                saveCategory('booking', [
                  'cal_username',
                  'cal_event_slugs',
                  'default_session_duration',
                ])
              }
              disabled={saving}
            >
              {saving ? 'Saving...' : 'Save Booking Settings'}
            </Button>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="notifications">
        <Card>
          <CardHeader>
            <CardTitle>Notification Settings</CardTitle>
            <CardDescription>Configure email notifications.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <label className="text-sm font-medium">Admin Notification Email
              <Input
                value={getVal(settings, 'admin_email')}
                onChange={(e) => updateLocal('admin_email', e.target.value)}
                placeholder="admin@ink37tattoos.com"
              />
            </label>
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <p className="text-sm font-medium">Email Notifications</p>
                <p className="text-xs text-muted-foreground">
                  Receive email alerts for new bookings and inquiries.
                </p>
              </div>
              <Switch
                checked={getBool(settings, 'email_notifications_enabled', true)}
                onCheckedChange={(checked) =>
                  updateLocal('email_notifications_enabled', checked)
                }
              />
            </div>
            <Button
              onClick={() =>
                saveCategory('notifications', [
                  'admin_email',
                  'email_notifications_enabled',
                ])
              }
              disabled={saving}
            >
              {saving ? 'Saving...' : 'Save Notification Settings'}
            </Button>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="appearance">
        <Card>
          <CardHeader>
            <CardTitle>Appearance</CardTitle>
            <CardDescription>Branding and visual settings.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <label className="text-sm font-medium">Logo URL
              <Input
                value={getVal(settings, 'logo_url')}
                onChange={(e) => updateLocal('logo_url', e.target.value)}
                placeholder="https://..."
              />
            </label>
            <label className="text-sm font-medium">Brand Color
              <Input
                value={getVal(settings, 'brand_color', '#1a1a1a')}
                onChange={(e) => updateLocal('brand_color', e.target.value)}
                placeholder="#1a1a1a"
              />
            </label>
            <label className="text-sm font-medium">Instagram URL
              <Input
                value={getVal(settings, 'social_instagram')}
                onChange={(e) => updateLocal('social_instagram', e.target.value)}
                placeholder="https://instagram.com/..."
              />
            </label>
            <label className="text-sm font-medium">Facebook URL
              <Input
                value={getVal(settings, 'social_facebook')}
                onChange={(e) => updateLocal('social_facebook', e.target.value)}
                placeholder="https://facebook.com/..."
              />
            </label>
            <Button
              onClick={() =>
                saveCategory('appearance', [
                  'logo_url',
                  'brand_color',
                  'social_instagram',
                  'social_facebook',
                ])
              }
              disabled={saving}
            >
              {saving ? 'Saving...' : 'Save Appearance'}
            </Button>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
}
