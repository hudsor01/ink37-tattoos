import { notFound } from 'next/navigation';
import Link from 'next/link';
import { format } from 'date-fns';
import { ArrowLeft, Mail, Phone, MapPin } from 'lucide-react';

import { getCustomerWithDetails } from '@/lib/dal/customers';
import { StatusBadge } from '@/components/dashboard/status-badge';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface CustomerDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function CustomerDetailPage({
  params,
}: CustomerDetailPageProps) {
  const { id } = await params;
  const customer = await getCustomerWithDetails(id);

  if (!customer) {
    notFound();
  }

  const fullAddress = [
    customer.address,
    customer.city,
    customer.state,
    customer.postalCode,
    customer.country,
  ]
    .filter(Boolean)
    .join(', ');

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" render={<Link href="/dashboard/customers" />}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Customers
        </Button>
      </div>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {customer.firstName} {customer.lastName}
          </h1>
          <p className="text-sm text-muted-foreground">
            Customer since{' '}
            {format(new Date(customer.createdAt), 'MMM d, yyyy')}
          </p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Contact Info */}
        <Card>
          <CardHeader>
            <CardTitle>Contact Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {customer.email && (
              <div className="flex items-center gap-2 text-sm">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <span>{customer.email}</span>
              </div>
            )}
            {customer.phone && (
              <div className="flex items-center gap-2 text-sm">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <span>{customer.phone}</span>
              </div>
            )}
            {fullAddress && (
              <div className="flex items-center gap-2 text-sm">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <span>{fullAddress}</span>
              </div>
            )}
            {!customer.email && !customer.phone && !fullAddress && (
              <p className="text-sm text-muted-foreground">
                No contact information on file.
              </p>
            )}
          </CardContent>
        </Card>

        {/* Medical Info */}
        <Card>
          <CardHeader>
            <CardTitle>Medical Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                Allergies
              </p>
              {customer.allergies && customer.allergies.length > 0 ? (
                <div className="mt-1 flex flex-wrap gap-1">
                  {customer.allergies.map((allergy) => (
                    <Badge key={allergy} variant="outline">
                      {allergy}
                    </Badge>
                  ))}
                </div>
              ) : (
                <p className="text-sm">None reported</p>
              )}
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                Medical Conditions
              </p>
              {customer.medicalConditions && customer.medicalConditions.length > 0 ? (
                <div className="mt-1 flex flex-wrap gap-1">
                  {customer.medicalConditions.map((condition) => (
                    <Badge key={condition} variant="outline">
                      {condition}
                    </Badge>
                  ))}
                </div>
              ) : (
                <p className="text-sm">None reported</p>
              )}
            </div>
            {customer.emergencyName && (
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Emergency Contact
                </p>
                <p className="text-sm">
                  {customer.emergencyName}
                  {customer.emergencyRel && ` (${customer.emergencyRel})`}
                  {customer.emergencyPhone && ` - ${customer.emergencyPhone}`}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Appointment History */}
      <Card>
        <CardHeader>
          <CardTitle>Appointment History</CardTitle>
        </CardHeader>
        <CardContent>
          {customer.appointments.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Description</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {customer.appointments.map((appt) => (
                  <TableRow key={appt.id}>
                    <TableCell>
                      {format(
                        new Date(appt.scheduledDate),
                        'MMM d, yyyy'
                      )}
                    </TableCell>
                    <TableCell className="capitalize">
                      {appt.type.replace(/_/g, ' ').toLowerCase()}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={appt.status} />
                    </TableCell>
                    <TableCell className="max-w-xs truncate">
                      {appt.description ?? '-'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="py-4 text-center text-sm text-muted-foreground">
              No appointments scheduled
            </p>
          )}
        </CardContent>
      </Card>

      {/* Session History */}
      <Card>
        <CardHeader>
          <CardTitle>Session History</CardTitle>
        </CardHeader>
        <CardContent>
          {customer.tattooSessions.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Design</TableHead>
                  <TableHead>Placement</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Cost</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {customer.tattooSessions.map((session) => (
                  <TableRow key={session.id}>
                    <TableCell>
                      {format(
                        new Date(session.appointmentDate),
                        'MMM d, yyyy'
                      )}
                    </TableCell>
                    <TableCell className="max-w-xs truncate">
                      {session.designDescription}
                    </TableCell>
                    <TableCell>{session.placement}</TableCell>
                    <TableCell>
                      <StatusBadge status={session.status} />
                    </TableCell>
                    <TableCell className="text-right">
                      ${session.totalCost.toString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="py-4 text-center text-sm text-muted-foreground">
              No sessions recorded
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
