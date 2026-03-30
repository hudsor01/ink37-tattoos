'use client';

import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { Calendar, MessageSquare, UserCircle, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';

import { InlineEdit } from '@/components/dashboard/inline-edit';
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
import { updateCustomerAction } from '@/lib/actions/customer-actions';
import type { TimelineEntry } from '@/lib/dal/customers';
import Link from 'next/link';

interface CustomerUser {
  id: string;
  email: string;
  name: string;
}

interface Appointment {
  id: string;
  scheduledDate: Date | string;
  type: string;
  status: string;
  description: string | null;
}

interface Session {
  id: string;
  appointmentDate: Date | string;
  designDescription: string;
  placement: string;
  status: string;
  totalCost: number;
}

interface Customer {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  postalCode: string | null;
  country: string | null;
  notes: string | null;
  allergies: string[] | null;
  medicalConditions: string[] | null;
  emergencyName: string | null;
  emergencyPhone: string | null;
  emergencyRel: string | null;
  userId: string | null;
  user: CustomerUser | null;
  appointments: Appointment[];
  tattooSessions: Session[];
  createdAt: Date | string;
}

interface CustomerDetailClientProps {
  customer: Customer;
  timeline: TimelineEntry[];
}

export function CustomerDetailClient({ customer, timeline }: CustomerDetailClientProps) {
  const router = useRouter();

  async function handleSaveField(field: string, value: string) {
    const formData = new FormData();
    formData.set(field, value);
    try {
      await updateCustomerAction(customer.id, formData);
      toast.success('Updated successfully');
      router.refresh();
    } catch {
      toast.error('Failed to update. Please try again.');
      throw new Error('Update failed');
    }
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-6 md:grid-cols-2">
        {/* Contact Info */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Contact Information</CardTitle>
              {/* Portal Account Indicator */}
              {customer.user ? (
                <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
                  <UserCircle className="mr-1 h-3 w-3" />
                  Portal Linked
                </Badge>
              ) : (
                <Badge variant="secondary">
                  <UserCircle className="mr-1 h-3 w-3" />
                  No Portal Account
                </Badge>
              )}
            </div>
            {customer.user && (
              <p className="text-xs text-muted-foreground">{customer.user.email}</p>
            )}
          </CardHeader>
          <CardContent className="space-y-2">
            <div>
              <span className="text-xs font-medium text-muted-foreground">First Name</span>
              <InlineEdit
                value={customer.firstName}
                onSave={(v) => handleSaveField('firstName', v)}
                label="First Name"
              />
            </div>
            <div>
              <span className="text-xs font-medium text-muted-foreground">Last Name</span>
              <InlineEdit
                value={customer.lastName}
                onSave={(v) => handleSaveField('lastName', v)}
                label="Last Name"
              />
            </div>
            <div>
              <span className="text-xs font-medium text-muted-foreground">Email</span>
              <InlineEdit
                value={customer.email ?? ''}
                onSave={(v) => handleSaveField('email', v)}
                label="Email"
                placeholder="No email"
              />
            </div>
            <div>
              <span className="text-xs font-medium text-muted-foreground">Phone</span>
              <InlineEdit
                value={customer.phone ?? ''}
                onSave={(v) => handleSaveField('phone', v)}
                label="Phone"
                placeholder="No phone"
              />
            </div>
            <div>
              <span className="text-xs font-medium text-muted-foreground">Address</span>
              <InlineEdit
                value={customer.address ?? ''}
                onSave={(v) => handleSaveField('address', v)}
                label="Address"
                placeholder="No address"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <span className="text-xs font-medium text-muted-foreground">City</span>
                <InlineEdit
                  value={customer.city ?? ''}
                  onSave={(v) => handleSaveField('city', v)}
                  label="City"
                  placeholder="No city"
                />
              </div>
              <div>
                <span className="text-xs font-medium text-muted-foreground">State</span>
                <InlineEdit
                  value={customer.state ?? ''}
                  onSave={(v) => handleSaveField('state', v)}
                  label="State"
                  placeholder="No state"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <span className="text-xs font-medium text-muted-foreground">Postal Code</span>
                <InlineEdit
                  value={customer.postalCode ?? ''}
                  onSave={(v) => handleSaveField('postalCode', v)}
                  label="Postal Code"
                  placeholder="No postal code"
                />
              </div>
              <div>
                <span className="text-xs font-medium text-muted-foreground">Country</span>
                <InlineEdit
                  value={customer.country ?? ''}
                  onSave={(v) => handleSaveField('country', v)}
                  label="Country"
                  placeholder="No country"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Medical Info */}
        <Card>
          <CardHeader>
            <CardTitle>Medical Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Allergies</p>
              {customer.allergies && customer.allergies.length > 0 ? (
                <div className="mt-1 flex flex-wrap gap-1">
                  {customer.allergies.map((allergy: string) => (
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
              <p className="text-sm font-medium text-muted-foreground">Medical Conditions</p>
              {customer.medicalConditions && customer.medicalConditions.length > 0 ? (
                <div className="mt-1 flex flex-wrap gap-1">
                  {customer.medicalConditions.map((condition: string) => (
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
                <p className="text-sm font-medium text-muted-foreground">Emergency Contact</p>
                <p className="text-sm">
                  {customer.emergencyName}
                  {customer.emergencyRel && ` (${customer.emergencyRel})`}
                  {customer.emergencyPhone && ` - ${customer.emergencyPhone}`}
                </p>
              </div>
            )}
            <div>
              <span className="text-xs font-medium text-muted-foreground">Notes</span>
              <InlineEdit
                value={customer.notes ?? ''}
                onSave={(v) => handleSaveField('notes', v)}
                label="Notes"
                type="textarea"
                placeholder="No notes"
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" render={<Link href={`/dashboard/appointments?customerId=${customer.id}`} />}>
              <Calendar className="mr-2 h-4 w-4" />
              New Appointment
              <ExternalLink className="ml-1 h-3 w-3" />
            </Button>
            <Button variant="outline" size="sm" render={<Link href={`/dashboard/sessions?customerId=${customer.id}`} />}>
              <Calendar className="mr-2 h-4 w-4" />
              New Session
              <ExternalLink className="ml-1 h-3 w-3" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Communication Timeline */}
      <Card>
        <CardHeader>
          <CardTitle>Communication Timeline</CardTitle>
        </CardHeader>
        <CardContent>
          {timeline.length > 0 ? (
            <div className="relative space-y-0">
              {/* Vertical connecting line */}
              <div className="absolute left-[9px] top-2 bottom-2 w-px bg-border" />
              {timeline.map((entry) => (
                <div key={`${entry.type}-${entry.id}`} className="relative flex gap-3 pb-4 last:pb-0">
                  {/* Timeline dot */}
                  <div
                    className={`relative z-10 mt-1.5 h-[18px] w-[18px] shrink-0 rounded-full border-2 ${
                      entry.type === 'appointment'
                        ? 'border-blue-500 bg-blue-100'
                        : 'border-green-500 bg-green-100'
                    }`}
                  >
                    {entry.type === 'appointment' ? (
                      <Calendar className="absolute inset-0 m-auto h-2.5 w-2.5 text-blue-600" />
                    ) : (
                      <MessageSquare className="absolute inset-0 m-auto h-2.5 w-2.5 text-green-600" />
                    )}
                  </div>
                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(entry.date), 'MMM d, yyyy')}
                      </span>
                      <Badge variant="secondary" className="text-xs capitalize">
                        {entry.type}
                      </Badge>
                      <StatusBadge status={entry.status} />
                    </div>
                    <p className="mt-0.5 text-sm truncate">{entry.summary}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="py-4 text-center text-sm text-muted-foreground">
              No communication history yet.
            </p>
          )}
        </CardContent>
      </Card>

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
                {customer.appointments.map((appt: Appointment) => (
                  <TableRow key={appt.id}>
                    <TableCell>
                      {format(new Date(appt.scheduledDate), 'MMM d, yyyy')}
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
                {customer.tattooSessions.map((session: Session) => (
                  <TableRow key={session.id}>
                    <TableCell>
                      {format(new Date(session.appointmentDate), 'MMM d, yyyy')}
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
