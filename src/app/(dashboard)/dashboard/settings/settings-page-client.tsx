'use client';

import { useState, useCallback, useMemo, useRef } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';
import { upsertSettingAction } from '@/lib/actions/settings-actions';
import { useUnsavedChanges } from '@/hooks/use-unsaved-changes';
import { toast } from 'sonner';
import { AlertTriangle } from 'lucide-react';

// ---------------------------------------------------------------------------
// Types & helpers
// ---------------------------------------------------------------------------

interface SettingsPageClientProps {
  initialSettings: Record<string, unknown>;
}

function getVal(
  settings: Record<string, unknown>,
  key: string,
  fallback = '',
): string {
  const v = settings[key];
  if (typeof v === 'string') return v;
  if (v != null) return String(v);
  return fallback;
}

function getBool(
  settings: Record<string, unknown>,
  key: string,
  fallback = false,
): boolean {
  const v = settings[key];
  if (typeof v === 'boolean') return v;
  return fallback;
}

function getJson<T>(
  settings: Record<string, unknown>,
  key: string,
  fallback: T,
): T {
  const v = settings[key];
  if (v != null && typeof v === 'object') return v as T;
  return fallback;
}

async function saveSetting(key: string, value: unknown, category: string) {
  const formData = new FormData();
  formData.append('key', key);
  formData.append(
    'value',
    typeof value === 'string' ? JSON.stringify(value) : JSON.stringify(value),
  );
  formData.append('category', category);
  await upsertSettingAction(formData);
}

// ---------------------------------------------------------------------------
// Tab key definitions
// ---------------------------------------------------------------------------

const STUDIO_KEYS = [
  'studio_name',
  'studio_address',
  'studio_phone',
  'studio_email',
  'studio_description',
  'studio_website',
  'logo_url',
  'brand_color',
  'social_instagram',
  'social_facebook',
] as const;

const EMAIL_KEYS = [
  'admin_email',
  'email_notifications_enabled',
  'appointment_confirmation_template',
  'appointment_reminder_template',
  'aftercare_template',
] as const;

const PAYMENT_KEYS = ['deposit_percentage', 'default_currency'] as const;

const HOURS_KEYS = [
  'cal_username',
  'cal_event_slugs',
  'default_session_duration',
  'business_hours',
] as const;

const LEGAL_KEYS = [
  'consent_form_text',
  'cancellation_policy_text',
  'privacy_policy_url',
] as const;

type TabId = 'studio' | 'email' | 'payment' | 'hours' | 'legal';

const TAB_KEYS_MAP: Record<TabId, readonly string[]> = {
  studio: STUDIO_KEYS,
  email: EMAIL_KEYS,
  payment: PAYMENT_KEYS,
  hours: HOURS_KEYS,
  legal: LEGAL_KEYS,
};

const TAB_CATEGORIES: Record<TabId, string> = {
  studio: 'studio',
  email: 'notifications',
  payment: 'payment',
  hours: 'booking',
  legal: 'legal',
};

// ---------------------------------------------------------------------------
// Default business hours
// ---------------------------------------------------------------------------

interface DayHours {
  open: string;
  close: string;
  isOpen: boolean;
}

type BusinessHours = Record<string, DayHours>;

const DAYS = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
] as const;

const DAY_LABELS: Record<string, string> = {
  monday: 'Monday',
  tuesday: 'Tuesday',
  wednesday: 'Wednesday',
  thursday: 'Thursday',
  friday: 'Friday',
  saturday: 'Saturday',
  sunday: 'Sunday',
};

const DEFAULT_HOURS: BusinessHours = Object.fromEntries(
  DAYS.map((d) => [
    d,
    {
      open: '09:00',
      close: '17:00',
      isOpen: d !== 'sunday',
    },
  ]),
);

// ---------------------------------------------------------------------------
// Hook: track dirty state per tab
// ---------------------------------------------------------------------------

function useTabDirty(
  current: Record<string, unknown>,
  initial: Record<string, unknown>,
  keys: readonly string[],
): boolean {
  return useMemo(() => {
    for (const key of keys) {
      const c = current[key];
      const i = initial[key];
      if (typeof c === 'object' || typeof i === 'object') {
        if (JSON.stringify(c) !== JSON.stringify(i)) return true;
      } else if (c !== i) {
        return true;
      }
    }
    return false;
  }, [current, initial, keys]);
}

// ---------------------------------------------------------------------------
// Unsaved changes warning banner
// ---------------------------------------------------------------------------

function UnsavedBanner({ onDiscard }: { onDiscard: () => void }) {
  return (
    <div className="mb-4 flex items-center gap-3 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-500/30 dark:bg-amber-950/30 dark:text-amber-200">
      <AlertTriangle className="h-4 w-4 shrink-0" />
      <span className="flex-1">
        You have unsaved changes. Save or discard before switching tabs.
      </span>
      <Button variant="outline" size="sm" onClick={onDiscard}>
        Discard Changes
      </Button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function SettingsPageClient({ initialSettings }: SettingsPageClientProps) {
  const [settings, setSettings] = useState(initialSettings);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<TabId>('studio');
  const [showUnsavedWarning, setShowUnsavedWarning] = useState(false);
  const pendingTabRef = useRef<TabId | null>(null);

  // Track dirty per tab
  const studioDirty = useTabDirty(settings, initialSettings, STUDIO_KEYS as unknown as string[]);
  const emailDirty = useTabDirty(settings, initialSettings, EMAIL_KEYS as unknown as string[]);
  const paymentDirty = useTabDirty(settings, initialSettings, PAYMENT_KEYS as unknown as string[]);
  const hoursDirty = useTabDirty(settings, initialSettings, HOURS_KEYS as unknown as string[]);
  const legalDirty = useTabDirty(settings, initialSettings, LEGAL_KEYS as unknown as string[]);

  const dirtyMap: Record<TabId, boolean> = {
    studio: studioDirty,
    email: emailDirty,
    payment: paymentDirty,
    hours: hoursDirty,
    legal: legalDirty,
  };

  const anyDirty = Object.values(dirtyMap).some(Boolean);

  // Browser-level beforeunload for any dirty tab
  useUnsavedChanges(anyDirty);

  function updateLocal(key: string, value: unknown) {
    setSettings((prev) => ({ ...prev, [key]: value }));
  }

  const handleTabSwitch = useCallback(
    (newTab: string) => {
      if (dirtyMap[activeTab]) {
        pendingTabRef.current = newTab as TabId;
        setShowUnsavedWarning(true);
        return;
      }
      setShowUnsavedWarning(false);
      setActiveTab(newTab as TabId);
    },
    [activeTab, dirtyMap],
  );

  function discardAndSwitch() {
    // Revert active tab settings to initial
    const keys = TAB_KEYS_MAP[activeTab];
    setSettings((prev) => {
      const next = { ...prev };
      for (const k of keys) {
        next[k] = initialSettings[k];
      }
      return next;
    });
    setShowUnsavedWarning(false);
    if (pendingTabRef.current) {
      setActiveTab(pendingTabRef.current);
      pendingTabRef.current = null;
    }
  }

  async function saveCategory(tabId: TabId) {
    const keys = TAB_KEYS_MAP[tabId];
    const category = TAB_CATEGORIES[tabId];
    setSaving(true);
    toast.promise(
      (async () => {
        for (const key of keys) {
          const currentVal = settings[key];
          const initialVal = initialSettings[key];
          const changed =
            typeof currentVal === 'object' || typeof initialVal === 'object'
              ? JSON.stringify(currentVal) !== JSON.stringify(initialVal)
              : currentVal !== initialVal;
          if (changed) {
            await saveSetting(key, currentVal, category);
          }
        }
      })().finally(() => setSaving(false)),
      {
        loading: 'Saving settings...',
        success: 'Settings saved',
        error: "Changes couldn't be saved. Please try again.",
      },
    );
  }

  // -----------------------------------------------------------------------
  // Business hours helpers
  // -----------------------------------------------------------------------

  const businessHours: BusinessHours = getJson(
    settings,
    'business_hours',
    DEFAULT_HOURS,
  );

  function updateHoursDay(day: string, field: keyof DayHours, value: string | boolean) {
    const updated = {
      ...businessHours,
      [day]: { ...businessHours[day], [field]: value },
    };
    updateLocal('business_hours', updated);
  }

  // -----------------------------------------------------------------------
  // Render
  // -----------------------------------------------------------------------

  return (
    <Tabs value={activeTab} onValueChange={handleTabSwitch}>
      <TabsList>
        <TabsTrigger value="studio">
          Studio Info{dirtyMap.studio ? ' *' : ''}
        </TabsTrigger>
        <TabsTrigger value="email">
          Email Templates{dirtyMap.email ? ' *' : ''}
        </TabsTrigger>
        <TabsTrigger value="payment">
          Payment Config{dirtyMap.payment ? ' *' : ''}
        </TabsTrigger>
        <TabsTrigger value="hours">
          Business Hours{dirtyMap.hours ? ' *' : ''}
        </TabsTrigger>
        <TabsTrigger value="legal">
          Legal/Terms{dirtyMap.legal ? ' *' : ''}
        </TabsTrigger>
      </TabsList>

      {/* ---- Studio Info ---- */}
      <TabsContent value="studio">
        {showUnsavedWarning && activeTab === 'studio' && (
          <UnsavedBanner onDiscard={discardAndSwitch} />
        )}
        <Card>
          <CardHeader>
            <CardTitle>Studio Information</CardTitle>
            <CardDescription>
              Basic details, branding, and social links for your studio.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <label className="text-sm font-medium">
              Studio Name
              <Input
                value={getVal(settings, 'studio_name')}
                onChange={(e) => updateLocal('studio_name', e.target.value)}
                placeholder="Ink37 Tattoos"
              />
            </label>
            <label className="text-sm font-medium">
              Address
              <Input
                value={getVal(settings, 'studio_address')}
                onChange={(e) => updateLocal('studio_address', e.target.value)}
                placeholder="123 Main St"
              />
            </label>
            <div className="grid grid-cols-2 gap-4">
              <label className="text-sm font-medium">
                Phone
                <Input
                  value={getVal(settings, 'studio_phone')}
                  onChange={(e) => updateLocal('studio_phone', e.target.value)}
                  placeholder="(555) 123-4567"
                />
              </label>
              <label className="text-sm font-medium">
                Email
                <Input
                  value={getVal(settings, 'studio_email')}
                  onChange={(e) => updateLocal('studio_email', e.target.value)}
                  placeholder="info@ink37tattoos.com"
                />
              </label>
            </div>
            <label className="text-sm font-medium">
              Description
              <Textarea
                value={getVal(settings, 'studio_description')}
                onChange={(e) =>
                  updateLocal('studio_description', e.target.value)
                }
                placeholder="Tell clients about your studio..."
              />
            </label>
            <label className="text-sm font-medium">
              Website URL
              <Input
                value={getVal(settings, 'studio_website')}
                onChange={(e) => updateLocal('studio_website', e.target.value)}
                placeholder="https://ink37tattoos.com"
              />
            </label>

            {/* Appearance fields merged from old Appearance tab */}
            <div className="border-t pt-4">
              <h3 className="mb-3 text-sm font-semibold text-muted-foreground">
                Branding & Social
              </h3>
              <div className="space-y-4">
                <label className="text-sm font-medium">
                  Logo URL
                  <Input
                    value={getVal(settings, 'logo_url')}
                    onChange={(e) => updateLocal('logo_url', e.target.value)}
                    placeholder="https://..."
                  />
                </label>
                <label className="text-sm font-medium">
                  Brand Color
                  <Input
                    value={getVal(settings, 'brand_color', '#1a1a1a')}
                    onChange={(e) => updateLocal('brand_color', e.target.value)}
                    placeholder="#1a1a1a"
                  />
                </label>
                <label className="text-sm font-medium">
                  Instagram URL
                  <Input
                    value={getVal(settings, 'social_instagram')}
                    onChange={(e) =>
                      updateLocal('social_instagram', e.target.value)
                    }
                    placeholder="https://instagram.com/..."
                  />
                </label>
                <label className="text-sm font-medium">
                  Facebook URL
                  <Input
                    value={getVal(settings, 'social_facebook')}
                    onChange={(e) =>
                      updateLocal('social_facebook', e.target.value)
                    }
                    placeholder="https://facebook.com/..."
                  />
                </label>
              </div>
            </div>

            <Button
              onClick={() => saveCategory('studio')}
              disabled={saving || !dirtyMap.studio}
            >
              {saving ? 'Saving...' : 'Save Studio Info'}
            </Button>
          </CardContent>
        </Card>
      </TabsContent>

      {/* ---- Email Templates ---- */}
      <TabsContent value="email">
        {showUnsavedWarning && activeTab === 'email' && (
          <UnsavedBanner onDiscard={discardAndSwitch} />
        )}
        <Card>
          <CardHeader>
            <CardTitle>Email Templates</CardTitle>
            <CardDescription>
              Configure notification emails and template content.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <label className="text-sm font-medium">
              Admin Notification Email
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
                checked={getBool(
                  settings,
                  'email_notifications_enabled',
                  true,
                )}
                onCheckedChange={(checked) =>
                  updateLocal('email_notifications_enabled', checked)
                }
              />
            </div>

            <div className="border-t pt-4">
              <h3 className="mb-3 text-sm font-semibold text-muted-foreground">
                Templates
              </h3>
              <div className="space-y-4">
                <label className="text-sm font-medium">
                  Appointment Confirmation Template
                  <Textarea
                    value={getVal(
                      settings,
                      'appointment_confirmation_template',
                    )}
                    onChange={(e) =>
                      updateLocal(
                        'appointment_confirmation_template',
                        e.target.value,
                      )
                    }
                    placeholder="Hi {name}, your appointment on {date} at {time} has been confirmed..."
                    rows={4}
                  />
                </label>
                <label className="text-sm font-medium">
                  Appointment Reminder Template
                  <Textarea
                    value={getVal(settings, 'appointment_reminder_template')}
                    onChange={(e) =>
                      updateLocal(
                        'appointment_reminder_template',
                        e.target.value,
                      )
                    }
                    placeholder="Hi {name}, this is a reminder about your upcoming appointment on {date}..."
                    rows={4}
                  />
                </label>
                <label className="text-sm font-medium">
                  Aftercare Template
                  <Textarea
                    value={getVal(settings, 'aftercare_template')}
                    onChange={(e) =>
                      updateLocal('aftercare_template', e.target.value)
                    }
                    placeholder="Hi {name}, here are your aftercare instructions for your recent tattoo session..."
                    rows={4}
                  />
                </label>
              </div>
            </div>

            <Button
              onClick={() => saveCategory('email')}
              disabled={saving || !dirtyMap.email}
            >
              {saving ? 'Saving...' : 'Save Email Templates'}
            </Button>
          </CardContent>
        </Card>
      </TabsContent>

      {/* ---- Payment Config ---- */}
      <TabsContent value="payment">
        {showUnsavedWarning && activeTab === 'payment' && (
          <UnsavedBanner onDiscard={discardAndSwitch} />
        )}
        <Card>
          <CardHeader>
            <CardTitle>Payment Configuration</CardTitle>
            <CardDescription>
              Manage deposit settings and payment preferences.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <label className="text-sm font-medium">
              Deposit Percentage
              <div className="relative">
                <Input
                  type="number"
                  min={0}
                  max={100}
                  value={getVal(settings, 'deposit_percentage', '25')}
                  onChange={(e) =>
                    updateLocal('deposit_percentage', e.target.value)
                  }
                  placeholder="25"
                  className="pr-8"
                />
                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                  %
                </span>
              </div>
            </label>

            <div className="space-y-1.5">
              <span className="text-sm font-medium">Default Currency</span>
              <Select
                value={getVal(settings, 'default_currency', 'USD')}
                onValueChange={(val) => val && updateLocal('default_currency', val)}
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Select currency" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="USD">USD - US Dollar</SelectItem>
                  <SelectItem value="CAD">CAD - Canadian Dollar</SelectItem>
                  <SelectItem value="EUR">EUR - Euro</SelectItem>
                  <SelectItem value="GBP">GBP - British Pound</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="border-t pt-4">
              <h3 className="mb-3 text-sm font-semibold text-muted-foreground">
                Stripe Integration
              </h3>
              <div className="space-y-4">
                <div className="rounded-lg border bg-muted/50 p-4">
                  <p className="text-sm font-medium">Stripe Keys</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Manage Stripe keys in your environment variables. Keys are
                    not stored in the database for security.
                  </p>
                  <div className="mt-3 space-y-2">
                    <div className="flex items-center gap-2 text-xs font-mono text-muted-foreground">
                      <span>Publishable:</span>
                      <span>pk_...configured via env</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs font-mono text-muted-foreground">
                      <span>Secret:</span>
                      <span>sk_...configured via env</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <Button
              onClick={() => saveCategory('payment')}
              disabled={saving || !dirtyMap.payment}
            >
              {saving ? 'Saving...' : 'Save Payment Config'}
            </Button>
          </CardContent>
        </Card>
      </TabsContent>

      {/* ---- Business Hours ---- */}
      <TabsContent value="hours">
        {showUnsavedWarning && activeTab === 'hours' && (
          <UnsavedBanner onDiscard={discardAndSwitch} />
        )}
        <Card>
          <CardHeader>
            <CardTitle>Business Hours</CardTitle>
            <CardDescription>
              Set your operating hours and booking configuration.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <label className="text-sm font-medium">
                Cal.com Username
                <Input
                  value={getVal(settings, 'cal_username')}
                  onChange={(e) => updateLocal('cal_username', e.target.value)}
                  placeholder="your-cal-username"
                />
              </label>
              <label className="text-sm font-medium">
                Default Session Duration (minutes)
                <Input
                  type="number"
                  value={getVal(settings, 'default_session_duration', '60')}
                  onChange={(e) =>
                    updateLocal('default_session_duration', e.target.value)
                  }
                />
              </label>
            </div>
            <label className="text-sm font-medium">
              Event Type Slugs (comma-separated)
              <Input
                value={getVal(settings, 'cal_event_slugs')}
                onChange={(e) =>
                  updateLocal('cal_event_slugs', e.target.value)
                }
                placeholder="consultation,tattoo-session,touch-up"
              />
            </label>

            <div className="border-t pt-4">
              <h3 className="mb-3 text-sm font-semibold text-muted-foreground">
                Operating Hours
              </h3>
              <div className="space-y-3">
                {DAYS.map((day) => {
                  const dayHours = businessHours[day] ?? {
                    open: '09:00',
                    close: '17:00',
                    isOpen: day !== 'sunday',
                  };
                  return (
                    <div
                      key={day}
                      className="flex items-center gap-4 rounded-lg border p-3"
                    >
                      <span className="w-24 text-sm font-medium">
                        {DAY_LABELS[day]}
                      </span>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={dayHours.isOpen}
                          onCheckedChange={(checked) =>
                            updateHoursDay(day, 'isOpen', checked)
                          }
                        />
                        <span className="text-xs text-muted-foreground">
                          {dayHours.isOpen ? 'Open' : 'Closed'}
                        </span>
                      </div>
                      <Input
                        type="time"
                        value={dayHours.open}
                        onChange={(e) =>
                          updateHoursDay(day, 'open', e.target.value)
                        }
                        disabled={!dayHours.isOpen}
                        className="w-32"
                      />
                      <span className="text-xs text-muted-foreground">to</span>
                      <Input
                        type="time"
                        value={dayHours.close}
                        onChange={(e) =>
                          updateHoursDay(day, 'close', e.target.value)
                        }
                        disabled={!dayHours.isOpen}
                        className="w-32"
                      />
                    </div>
                  );
                })}
              </div>
            </div>

            <Button
              onClick={() => saveCategory('hours')}
              disabled={saving || !dirtyMap.hours}
            >
              {saving ? 'Saving...' : 'Save Business Hours'}
            </Button>
          </CardContent>
        </Card>
      </TabsContent>

      {/* ---- Legal/Terms ---- */}
      <TabsContent value="legal">
        {showUnsavedWarning && activeTab === 'legal' && (
          <UnsavedBanner onDiscard={discardAndSwitch} />
        )}
        <Card>
          <CardHeader>
            <CardTitle>Legal & Terms</CardTitle>
            <CardDescription>
              Manage consent forms, cancellation policies, and legal documents.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <label className="text-sm font-medium">
              Consent Form Text
              <Textarea
                value={getVal(settings, 'consent_form_text')}
                onChange={(e) =>
                  updateLocal('consent_form_text', e.target.value)
                }
                placeholder="I, the undersigned, consent to the tattoo procedure described above. I acknowledge that I have been informed of the risks involved..."
                rows={6}
              />
            </label>
            <label className="text-sm font-medium">
              Cancellation Policy
              <Textarea
                value={getVal(settings, 'cancellation_policy_text')}
                onChange={(e) =>
                  updateLocal('cancellation_policy_text', e.target.value)
                }
                placeholder="Cancellations must be made at least 48 hours before the scheduled appointment. Deposits are non-refundable for no-shows..."
                rows={4}
              />
            </label>
            <label className="text-sm font-medium">
              Privacy Policy URL
              <Input
                value={getVal(settings, 'privacy_policy_url')}
                onChange={(e) =>
                  updateLocal('privacy_policy_url', e.target.value)
                }
                placeholder="https://ink37tattoos.com/privacy"
              />
            </label>

            <Button
              onClick={() => saveCategory('legal')}
              disabled={saving || !dirtyMap.legal}
            >
              {saving ? 'Saving...' : 'Save Legal/Terms'}
            </Button>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
}
