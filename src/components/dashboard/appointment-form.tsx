'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  CreateAppointmentSchema,
  type CreateAppointmentData,
} from '@/lib/security/validation';
import {
  createAppointmentAction,
  updateAppointmentAction,
} from '@/lib/actions/appointment-actions';
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const APPOINTMENT_TYPES = [
  { value: 'CONSULTATION', label: 'Consultation' },
  { value: 'DESIGN_REVIEW', label: 'Design Review' },
  { value: 'TATTOO_SESSION', label: 'Tattoo Session' },
  { value: 'TOUCH_UP', label: 'Touch-Up' },
  { value: 'REMOVAL', label: 'Removal' },
] as const;

interface AppointmentFormProps {
  appointment?: {
    id: string;
    customerId: string;
    scheduledDate: string | Date;
    duration?: number | null;
    type: string;
    firstName: string;
    lastName: string;
    email: string;
    phone?: string | null;
    tattooType?: string | null;
    size?: string | null;
    placement?: string | null;
    description?: string | null;
    notes?: string | null;
  };
  customerId?: string;
  onSuccess?: () => void;
}

export function AppointmentForm({
  appointment,
  customerId,
  onSuccess,
}: AppointmentFormProps) {
  const queryClient = useQueryClient();
  const isEdit = !!appointment;

  const form = useForm<CreateAppointmentData>({
    resolver: zodResolver(CreateAppointmentSchema),
    defaultValues: {
      customerId: appointment?.customerId ?? customerId ?? '',
      scheduledDate: appointment?.scheduledDate
        ? typeof appointment.scheduledDate === 'string'
          ? appointment.scheduledDate
          : appointment.scheduledDate.toISOString()
        : '',
      duration: appointment?.duration ?? undefined,
      type: (appointment?.type as CreateAppointmentData['type']) ?? 'CONSULTATION',
      firstName: appointment?.firstName ?? '',
      lastName: appointment?.lastName ?? '',
      email: appointment?.email ?? '',
      phone: appointment?.phone ?? undefined,
      tattooType: appointment?.tattooType ?? undefined,
      size: appointment?.size ?? undefined,
      placement: appointment?.placement ?? undefined,
      description: appointment?.description ?? undefined,
      notes: appointment?.notes ?? undefined,
    },
  });

  async function onSubmit(data: CreateAppointmentData) {
    try {
      const formData = new FormData();
      Object.entries(data).forEach(([key, value]) => {
        if (value === undefined || value === null) return;
        formData.append(key, String(value));
      });

      if (isEdit && appointment) {
        await updateAppointmentAction(appointment.id, formData);
        toast.success('Appointment updated successfully');
      } else {
        await createAppointmentAction(formData);
        toast.success('Appointment created successfully');
      }

      await queryClient.invalidateQueries({ queryKey: ['appointments'] });
      onSuccess?.();
    } catch {
      toast.error("Changes couldn't be saved. Please try again.");
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="customerId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Customer ID *</FormLabel>
              <FormControl>
                <Input placeholder="Customer UUID" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="firstName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>First Name *</FormLabel>
                <FormControl>
                  <Input placeholder="First name" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="lastName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Last Name *</FormLabel>
                <FormControl>
                  <Input placeholder="Last name" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email *</FormLabel>
                <FormControl>
                  <Input type="email" placeholder="email@example.com" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="phone"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Phone</FormLabel>
                <FormControl>
                  <Input
                    placeholder="(555) 555-5555"
                    {...field}
                    value={field.value ?? ''}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="scheduledDate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Scheduled Date *</FormLabel>
                <FormControl>
                  <Input
                    type="datetime-local"
                    {...field}
                    value={
                      field.value
                        ? new Date(field.value).toISOString().slice(0, 16)
                        : ''
                    }
                    onChange={(e) => {
                      const val = e.target.value;
                      field.onChange(val ? new Date(val).toISOString() : '');
                    }}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="duration"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Duration (minutes)</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    placeholder="60"
                    {...field}
                    value={field.value ?? ''}
                    onChange={(e) => {
                      const val = e.target.value;
                      field.onChange(val ? parseInt(val, 10) : undefined);
                    }}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="type"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Appointment Type *</FormLabel>
              <Select
                value={field.value}
                onValueChange={(val) => field.onChange(val ?? 'CONSULTATION')}
              >
                <FormControl>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {APPOINTMENT_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-3 gap-4">
          <FormField
            control={form.control}
            name="tattooType"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Tattoo Type</FormLabel>
                <FormControl>
                  <Input
                    placeholder="Style"
                    {...field}
                    value={field.value ?? ''}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="size"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Size</FormLabel>
                <FormControl>
                  <Input
                    placeholder='e.g. 4"x6"'
                    {...field}
                    value={field.value ?? ''}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="placement"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Placement</FormLabel>
                <FormControl>
                  <Input
                    placeholder="e.g. Upper arm"
                    {...field}
                    value={field.value ?? ''}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Describe the tattoo design..."
                  {...field}
                  value={field.value ?? ''}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Notes</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Additional notes..."
                  {...field}
                  value={field.value ?? ''}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end gap-2 pt-4">
          <Button type="submit" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting
              ? 'Saving...'
              : isEdit
                ? 'Update Appointment'
                : 'Create Appointment'}
          </Button>
        </div>
      </form>
    </Form>
  );
}
