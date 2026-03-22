import { format } from 'date-fns';
import { Palette, CheckCircle2, ShieldCheck } from 'lucide-react';
import { getPortalSessions, getPortalDesigns } from '@/lib/dal/portal';
import { StatusBadge } from '@/components/dashboard/status-badge';
import { ConsentForm } from '@/components/portal/consent-form';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from '@/components/ui/card';

const currencyFormat = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
});

export default async function PortalTattoosPage() {
  const [sessions, designs] = await Promise.all([
    getPortalSessions(),
    getPortalDesigns(),
  ]);

  if (sessions.length === 0 && designs.length === 0) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">My Tattoos</h1>
        <Card>
          <CardContent className="py-12 text-center">
            <Palette className="mx-auto mb-4 size-12 text-muted-foreground" />
            <p className="text-lg font-medium">No tattoo sessions yet</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Your tattoo sessions and designs will appear here.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold">My Tattoos</h1>

      {/* Sessions section */}
      {sessions.length > 0 && (
        <section className="space-y-4">
          <h2 className="text-lg font-semibold">Sessions</h2>
          <div className="space-y-4">
            {sessions.map((session) => (
              <SessionCard key={session.id} session={session} />
            ))}
          </div>
        </section>
      )}

      {/* Designs section */}
      {designs.length > 0 && (
        <section className="space-y-4">
          <h2 className="text-lg font-semibold">Designs</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {designs.map((design) => (
              <DesignCard key={design.id} design={design} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function SessionCard({
  session,
}: {
  session: {
    id: string;
    appointmentDate: Date | null;
    duration: number | null;
    status: string;
    designDescription: string | null;
    placement: string | null;
    size: string | null;
    style: string | null;
    referenceImages: string[];
    totalCost: unknown;
    depositAmount: unknown;
    paidAmount: unknown;
    consentSigned: boolean;
    consentSignedAt: Date | null;
    consentSignedBy: string | null;
    aftercareProvided: boolean;
    appointment: {
      id: string;
      scheduledDate: Date;
      type: string | null;
    } | null;
  };
}) {
  const totalCost = Number(session.totalCost) || 0;
  const depositAmount = Number(session.depositAmount) || 0;
  const paidAmount = Number(session.paidAmount) || 0;
  const balance = totalCost - paidAmount;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle>
              {session.appointmentDate
                ? format(new Date(session.appointmentDate), 'MMM d, yyyy')
                : 'Date TBD'}
            </CardTitle>
            {session.designDescription && (
              <p className="mt-1 text-sm text-muted-foreground">
                {session.designDescription}
              </p>
            )}
          </div>
          <StatusBadge status={session.status} />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Details */}
        <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm text-muted-foreground">
          {session.placement && <span>Placement: {session.placement}</span>}
          {session.size && <span>Size: {session.size}</span>}
          {session.style && <span>Style: {session.style}</span>}
          {session.duration && <span>Duration: {session.duration} min</span>}
        </div>

        {/* Pricing (D-16: total/deposit/balance only, no hourlyRate or estimatedHours) */}
        {totalCost > 0 && (
          <div className="flex flex-wrap gap-x-4 gap-y-1 rounded-md bg-gray-50 px-3 py-2 text-sm">
            <span>
              <span className="text-muted-foreground">Total:</span>{' '}
              <span className="font-medium">{currencyFormat.format(totalCost)}</span>
            </span>
            <span>
              <span className="text-muted-foreground">Deposit:</span>{' '}
              <span className="font-medium">{currencyFormat.format(depositAmount)}</span>
            </span>
            <span>
              <span className="text-muted-foreground">Balance:</span>{' '}
              <span className="font-medium">{currencyFormat.format(balance)}</span>
            </span>
          </div>
        )}

        {/* Reference images (D-19: view only, no download) */}
        {session.referenceImages.length > 0 && (
          <div>
            <p className="mb-2 text-sm font-medium">Reference Images</p>
            <div className="flex flex-wrap gap-2">
              {session.referenceImages.map((url, i) => (
                <img
                  key={i}
                  src={url}
                  alt={`Reference ${i + 1}`}
                  className="size-24 rounded-md border object-cover"
                  draggable={false}
                />
              ))}
            </div>
          </div>
        )}

        {/* Aftercare badge */}
        {session.aftercareProvided && (
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="size-4 text-green-600" />
            <span className="text-sm text-green-700">Aftercare instructions provided</span>
          </div>
        )}

        {/* Consent status */}
        {session.consentSigned ? (
          <div className="flex items-center gap-1.5 rounded-md bg-green-50 px-3 py-2">
            <CheckCircle2 className="size-4 text-green-600" />
            <span className="text-sm font-medium text-green-700">Consent Signed</span>
            {session.consentSignedAt && (
              <span className="text-sm text-green-600">
                on {format(new Date(session.consentSignedAt), 'MMM d, yyyy')}
              </span>
            )}
            {session.consentSignedBy && (
              <span className="text-sm text-green-600">
                by {session.consentSignedBy}
              </span>
            )}
          </div>
        ) : (
          <ConsentForm sessionId={session.id} />
        )}
      </CardContent>
    </Card>
  );
}

function DesignCard({
  design,
}: {
  design: {
    id: string;
    name: string | null;
    description: string | null;
    designType: string | null;
    style: string | null;
    size: string | null;
    fileUrl: string | null;
    thumbnailUrl: string | null;
    isApproved: boolean;
    createdAt: Date;
  };
}) {
  return (
    <Card>
      {/* Design image (D-19: view only) */}
      {(design.thumbnailUrl || design.fileUrl) && (
        <div className="overflow-hidden rounded-t-xl">
          <img
            src={design.thumbnailUrl ?? design.fileUrl!}
            alt={design.name ?? 'Tattoo design'}
            className="h-48 w-full object-cover"
            draggable={false}
          />
        </div>
      )}
      <CardHeader>
        <div className="flex items-start justify-between">
          <CardTitle>{design.name ?? 'Untitled Design'}</CardTitle>
          <span
            className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
              design.isApproved
                ? 'bg-green-100 text-green-800'
                : 'bg-yellow-100 text-yellow-800'
            }`}
          >
            {design.isApproved ? 'Approved' : 'Pending Approval'}
          </span>
        </div>
      </CardHeader>
      <CardContent>
        {design.description && (
          <p className="mb-2 text-sm">{design.description}</p>
        )}
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
          {design.designType && <span>Type: {design.designType}</span>}
          {design.style && <span>Style: {design.style}</span>}
          {design.size && <span>Size: {design.size}</span>}
          <span>Added: {format(new Date(design.createdAt), 'MMM d, yyyy')}</span>
        </div>
      </CardContent>
    </Card>
  );
}
