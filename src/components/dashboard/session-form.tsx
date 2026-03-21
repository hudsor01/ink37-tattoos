'use client';

import { useEffect } from 'react';
import { useForm, type FieldValues, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
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
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(SessionFormSchema) as never,
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

  const hourlyRate = watch('hourlyRate');
  const estimatedHours = watch('estimatedHours');

  useEffect(() => {
    if (hourlyRate && estimatedHours) {
      const calculated = hourlyRate * estimatedHours;
      setValue('totalCost', calculated);
    }
  }, [hourlyRate, estimatedHours, setValue]);

  async function onSubmit(data: Record<string, unknown>) {
    try {
      const formData = new FormData();
      Object.entries(data).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          formData.append(key, String(value));
        }
      });
      await createSessionAction(formData);
      toast.success('Session logged successfully');
      onSuccess?.();
    } catch {
      toast.error("Changes couldn't be saved. Please try again.");
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 max-h-[60vh] overflow-y-auto px-1">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-sm font-medium">Customer ID</label>
          <Input {...register('customerId')} placeholder="Customer UUID" />
          {errors.customerId && (
            <p className="text-xs text-destructive mt-1">{errors.customerId.message}</p>
          )}
        </div>
        <div>
          <label className="text-sm font-medium">Artist ID</label>
          <Input {...register('artistId')} placeholder="Artist UUID" />
          {errors.artistId && (
            <p className="text-xs text-destructive mt-1">{errors.artistId.message}</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-sm font-medium">Date</label>
          <Input type="datetime-local" {...register('appointmentDate')} />
          {errors.appointmentDate && (
            <p className="text-xs text-destructive mt-1">{errors.appointmentDate.message}</p>
          )}
        </div>
        <div>
          <label className="text-sm font-medium">Duration (minutes)</label>
          <Input
            type="number"
            {...register('duration', { valueAsNumber: true })}
            placeholder="120"
          />
          {errors.duration && (
            <p className="text-xs text-destructive mt-1">{errors.duration.message}</p>
          )}
        </div>
      </div>

      <div>
        <label className="text-sm font-medium">Design Description</label>
        <Textarea {...register('designDescription')} placeholder="Describe the tattoo design..." />
        {errors.designDescription && (
          <p className="text-xs text-destructive mt-1">{errors.designDescription.message}</p>
        )}
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className="text-sm font-medium">Placement</label>
          <Input {...register('placement')} placeholder="e.g., Upper arm" />
          {errors.placement && (
            <p className="text-xs text-destructive mt-1">{errors.placement.message}</p>
          )}
        </div>
        <div>
          <label className="text-sm font-medium">Size</label>
          <Input {...register('size')} placeholder='e.g., 6"x4"' />
          {errors.size && (
            <p className="text-xs text-destructive mt-1">{errors.size.message}</p>
          )}
        </div>
        <div>
          <label className="text-sm font-medium">Style</label>
          <Input {...register('style')} placeholder="e.g., Realism" />
          {errors.style && (
            <p className="text-xs text-destructive mt-1">{errors.style.message}</p>
          )}
        </div>
      </div>

      <div className="border-t pt-4">
        <h4 className="text-sm font-semibold mb-3">Pricing</h4>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium">Hourly Rate ($)</label>
            <Input
              type="number"
              step="0.01"
              {...register('hourlyRate', { valueAsNumber: true })}
              placeholder="150.00"
            />
            {errors.hourlyRate && (
              <p className="text-xs text-destructive mt-1">{errors.hourlyRate.message}</p>
            )}
          </div>
          <div>
            <label className="text-sm font-medium">Estimated Hours</label>
            <Input
              type="number"
              step="0.5"
              {...register('estimatedHours', { valueAsNumber: true })}
              placeholder="3"
            />
            {errors.estimatedHours && (
              <p className="text-xs text-destructive mt-1">{errors.estimatedHours.message}</p>
            )}
          </div>
          <div>
            <label className="text-sm font-medium">Deposit ($)</label>
            <Input
              type="number"
              step="0.01"
              {...register('depositAmount', { valueAsNumber: true })}
              placeholder="0.00"
            />
          </div>
          <div>
            <label className="text-sm font-medium">Total Cost ($)</label>
            <Input
              type="number"
              step="0.01"
              {...register('totalCost', { valueAsNumber: true })}
              placeholder="Calculated"
              readOnly
              className="bg-muted"
            />
            {errors.totalCost && (
              <p className="text-xs text-destructive mt-1">{errors.totalCost.message}</p>
            )}
          </div>
        </div>
      </div>

      <div className="border-t pt-4">
        <div className="flex gap-6">
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" {...register('consentSigned')} className="rounded" />
            Consent Signed
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" {...register('aftercareProvided')} className="rounded" />
            Aftercare Provided
          </label>
        </div>
      </div>

      <div>
        <label className="text-sm font-medium">Notes</label>
        <Textarea {...register('notes')} placeholder="Additional notes..." />
      </div>

      <Button type="submit" className="w-full" disabled={isSubmitting}>
        {isSubmitting ? 'Saving...' : 'Log Session'}
      </Button>
    </form>
  );
}
