import { connection } from 'next/server';
import {
  getSignedConsentsWithExpiration,
  getConsentForms,
  getActiveConsentForm,
} from '@/lib/dal/consent';
import { ConsentPageClient } from './consent-page-client';

export const metadata = {
  title: 'Consent Management',
};

interface ConsentPageProps {
  searchParams: Promise<{
    search?: string;
    filter?: string;
    page?: string;
  }>;
}

export default async function ConsentPage({ searchParams }: ConsentPageProps) {
  await connection();

  const params = await searchParams;
  const page = params.page ? parseInt(params.page, 10) : 1;
  const search = params.search || '';
  const filter = (params.filter || 'all') as 'all' | 'active' | 'expired' | 'pending';

  const [consents, consentForms, activeForm] = await Promise.all([
    getSignedConsentsWithExpiration({
      page: isNaN(page) ? 1 : page,
      pageSize: 20,
      search: search || undefined,
      filter,
    }),
    getConsentForms(),
    getActiveConsentForm(),
  ]);

  // Serialize dates for client component
  const serializedConsents = {
    ...consents,
    data: consents.data.map((c) => ({
      ...c,
      appointmentDate: c.appointmentDate.toISOString(),
      consentSignedAt: c.consentSignedAt?.toISOString() ?? null,
      consentExpiresAt: c.consentExpiresAt?.toISOString() ?? null,
    })),
  };

  const serializedForms = consentForms.map((f) => ({
    ...f,
    createdAt: f.createdAt.toISOString(),
    updatedAt: f.updatedAt.toISOString(),
  }));

  const serializedActiveForm = activeForm
    ? {
        ...activeForm,
        createdAt: activeForm.createdAt.toISOString(),
        updatedAt: activeForm.updatedAt.toISOString(),
      }
    : null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Consent Management</h1>
        <p className="text-muted-foreground">
          Track signed consent forms, expiration status, and manage form versions.
        </p>
      </div>
      <ConsentPageClient
        consents={serializedConsents}
        consentForms={serializedForms}
        activeForm={serializedActiveForm}
        searchQuery={search}
        filterValue={filter}
      />
    </div>
  );
}
