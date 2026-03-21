'use server';

import { UpdateSettingsSchema } from '@/lib/security/validation';
import { upsertSetting } from '@/lib/dal/settings';
import { logAudit } from '@/lib/dal/audit';
import { getCurrentSession } from '@/lib/auth';
import { headers } from 'next/headers';
import { revalidatePath } from 'next/cache';

export async function upsertSettingAction(formData: FormData) {
  const session = await getCurrentSession();
  if (!session?.user) throw new Error('Unauthorized');

  const raw = Object.fromEntries(formData);
  // Parse JSON value if provided as string
  let value: unknown = raw.value;
  if (typeof value === 'string') {
    try {
      value = JSON.parse(value);
    } catch {
      // Keep as string if not valid JSON
    }
  }

  const validated = UpdateSettingsSchema.parse({
    ...raw,
    value,
  });

  const result = await upsertSetting(validated);

  const hdrs = await headers();
  logAudit({
    userId: session.user.id,
    action: 'UPSERT',
    resource: 'settings',
    resourceId: validated.key,
    ip: hdrs.get('x-forwarded-for') ?? 'unknown',
    userAgent: hdrs.get('user-agent') ?? 'unknown',
    metadata: { changes: validated },
  }).catch(() => {});

  revalidatePath('/dashboard/settings');
  return result;
}
