'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from '@/components/ui/form';
import { createSessionAction } from '@/lib/actions/session-actions';
import { toast } from 'sonner';

const SessionFormSchema = z.object({
  customerId: z.string().min(1, 'Customer is required'),
  artistId: z.string().min(1, 'Artist is required'),
  appointmentId: z.string().optional(),
  appointmentDate: z.string().min(1, 'Date is required'),
  duration: z.number().int().positive('Duration must be positive'),
  designDescription: z.string().min(1, 'Design description is required'),
  placement: z.string().min(1, 'Placement is required'),
  size: z.string().min(1, 'Size is required'),
  style: z.string().min(1, 'Style is required'),
  hourlyRate: z.number().positive('Rate must be positive'),
  estimatedHours: z.number().positive('Hours must be positive'),
  depositAmount: z.number().nonnegative().default(0),
  totalCost: z.number().positive('Total cost must be positive'),
  consentSigned: z.boolean().default(false),
  aftercareProvided: z.boolean().default(false),
  notes: z.string().optional(),
});

type SessionFormData = z.infer<typeof SessionFormSchema>;

interface SessionFormProps {
  onSuccess?: () => void;
}

export function SessionForm({ onSuccess }: SessionFormProps) {
  const form = useForm<SessionFormData>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- zodResolver typing mismatch with .default() in Zod schema
    resolver: zodResolver(SessionFormSchema) as any,
    defaultValues: {
      customerId: '',
      artistId: '',
      appointmentId: '',
      appointmentDate: '',
      duration: 0,
      designDescription: '',
      placement: '',
      size: '',
      style: '',
      hourlyRate: 0,
      estimatedHours: 0,
      depositAmount: 0,
      totalCost: 0,
      consentSigned: false,
      aftercareProvided: false,
      notes: '',
    },
  });

  const hourlyRate = form.watch('hourlyRate');
  const estimatedHours = form.watch('estimatedHours');

  useEffect(() => {
    if (hourlyRate && estimatedHours) {
      const calculated = hourlyRate * estimatedHours;
      form.setValue('totalCost', calculated);
    }
  }, [hourlyRate, estimatedHours, form]);

  async function onSubmit(data: SessionFormData) {
    const formData = new FormData();
    Object.entries(data).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        formData.append(key, String(value));
      }
    });

    toast.promise(
      createSessionAction(formData).then((result) => {
        onSuccess?.();
        return result;
      }),
      {
        loading: 'Logging session...',
        success: 'Session logged successfully',
        error: "Changes couldn't be saved. Please try again.",
      }
    );
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 max-h-[60vh] overflow-y-auto px-1">
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="customerId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Customer ID</FormLabel>
                <FormControl>
                  <Input placeholder="Customer UUID" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="artistId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Artist ID</FormLabel>
                <FormControl>
                  <Input placeholder="Artist UUID" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="appointmentDate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Date</FormLabel>
                <FormControl>
                  <Input type="datetime-local" {...field} />
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
                    placeholder="120"
                    {...field}
                    onChange={(e) => field.onChange(e.target.valueAsNumber || 0)}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="designDescription"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Design Description</FormLabel>
              <FormControl>
                <Textarea placeholder="Describe the tattoo design..." {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-3 gap-4">
          <FormField
            control={form.control}
            name="placement"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Placement</FormLabel>
                <FormControl>
                  <Input placeholder="e.g., Upper arm" {...field} />
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
                  <Input placeholder='e.g., 6"x4"' {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="style"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Style</FormLabel>
                <FormControl>
                  <Input placeholder="e.g., Realism" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="border-t pt-4">
          <h4 className="text-sm font-semibold mb-3">Pricing</h4>
          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="hourlyRate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Hourly Rate ($)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="150.00"
                      {...field}
                      onChange={(e) => field.onChange(e.target.valueAsNumber || 0)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="estimatedHours"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Estimated Hours</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="0.5"
                      placeholder="3"
                      {...field}
                      onChange={(e) => field.onChange(e.target.valueAsNumber || 0)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="depositAmount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Deposit ($)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      {...field}
                      onChange={(e) => field.onChange(e.target.valueAsNumber || 0)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="totalCost"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Total Cost ($)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="Calculated"
                      readOnly
                      className="bg-muted"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        <div className="border-t pt-4">
          <div className="flex gap-6">
            <FormField
              control={form.control}
              name="consentSigned"
              render={({ field }) => (
                <FormItem className="flex items-center gap-2 space-y-0">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <FormLabel className="font-normal">Consent Signed</FormLabel>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="aftercareProvided"
              render={({ field }) => (
                <FormItem className="flex items-center gap-2 space-y-0">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <FormLabel className="font-normal">Aftercare Provided</FormLabel>
                </FormItem>
              )}
            />
          </div>
        </div>

        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Notes</FormLabel>
              <FormControl>
                <Textarea placeholder="Additional notes..." {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting ? 'Saving...' : 'Log Session'}
        </Button>
      </form>
    </Form>
  );
}
