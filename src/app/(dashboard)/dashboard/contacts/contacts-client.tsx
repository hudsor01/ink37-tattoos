'use client';

import { useState, useTransition } from 'react';
import { format } from 'date-fns';
import { updateContactStatusAction } from '@/lib/actions/contact-status-action';
import { toast } from 'sonner';
import { StatusBadge } from '@/components/dashboard/status-badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Mail, Phone, MessageSquare } from 'lucide-react';

type Contact = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  message: string;
  status: string;
  adminNotes: string | null;
  createdAt: string;
  updatedAt: string;
};

interface ContactsClientProps {
  contacts: Contact[];
}

const STATUSES = ['NEW', 'READ', 'REPLIED', 'RESOLVED'] as const;

export function ContactsClient({ contacts }: ContactsClientProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleStatusChange(id: string, status: string) {
    startTransition(async () => {
      try {
        await updateContactStatusAction(id, status as 'NEW' | 'READ' | 'REPLIED' | 'RESOLVED');
        toast.success('Status updated');
      } catch {
        toast.error('Failed to update status');
      }
    });
  }

  if (contacts.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <MessageSquare className="h-10 w-10 text-muted-foreground/50 mb-3" />
          <h3 className="text-lg font-semibold">No contact submissions</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Messages from the contact form will appear here.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {contacts.map((contact) => (
        <Card key={contact.id} className={contact.status === 'NEW' ? 'border-primary/30' : ''}>
          <CardHeader
            className="cursor-pointer"
            onClick={() => setExpandedId(expandedId === contact.id ? null : contact.id)}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <StatusBadge status={contact.status} />
                <CardTitle className="text-base">{contact.name}</CardTitle>
              </div>
              <span className="text-sm text-muted-foreground">
                {format(new Date(contact.createdAt), 'MMM d, yyyy h:mm a')}
              </span>
            </div>
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <Mail className="h-3.5 w-3.5" />
                {contact.email}
              </span>
              {contact.phone && (
                <span className="flex items-center gap-1">
                  <Phone className="h-3.5 w-3.5" />
                  {contact.phone}
                </span>
              )}
            </div>
          </CardHeader>
          {expandedId === contact.id && (
            <CardContent className="space-y-4">
              <p className="text-sm whitespace-pre-wrap">{contact.message}</p>
              <div className="flex items-center gap-3">
                <Select
                  value={contact.status}
                  onValueChange={(val) => val && handleStatusChange(contact.id, val)}
                  disabled={isPending}
                >
                  <SelectTrigger className="w-[140px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUSES.map((s) => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.open(`mailto:${contact.email}?subject=Re: Your message to Ink 37 Tattoos`, '_blank')}
                >
                  <Mail className="h-4 w-4 mr-1" />
                  Reply via Email
                </Button>
              </div>
            </CardContent>
          )}
        </Card>
      ))}
    </div>
  );
}
