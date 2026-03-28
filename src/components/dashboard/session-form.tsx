'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { FieldError } from '@/components/dashboard/field-error';
import { createSessionAction } from '@/lib/actions/session-actions';
import { toast } from 'sonner';
import { useUnsavedChanges } from '@/hooks/use-unsaved-changes';

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
    setError,
    formState: { errors, isSubmitting, isDirty },
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

  useUnsavedChanges(isDirty);

  useEffect(() => {
    if (hourlyRate && estimatedHours) {
      const calculated = hourlyRate * estimatedHours;
      setValue('totalCost', calculated);
    }
  }, [hourlyRate, estimatedHours, setValue]);

  async function onSubmit(data: Record<string, unknown>) {
    const formData = new FormData();
    Object.entries(data).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        formData.append(key, String(value));
      }
    });

    toast.promise(
      createSessionAction(formData).then((result) => {
        if (!result.success) {
          if (result.fieldErrors) {
            Object.entries(result.fieldErrors).forEach(([field, messages]) => {
              setError(field as keyof SessionFormData, {
                type: 'server',
                message: messages[0],
              });
            });
          }
          throw new Error(result.error || 'Something went wrong');
        }
        onSuccess?.();
        return result;
      }),
      {
        loading: 'Logging session...',
        success: 'Session logged successfully',
        error: (err) => err.message || "Changes couldn't be saved. Please try again.",
      }
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 max-h-[60vh] overflow-y-auto px-1">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="text-sm font-medium">Customer ID
          <Input {...register('customerId')} placeholder="Customer UUID" />
          </label>
          <FieldError errors={errors.customerId?.message ? [errors.customerId.message] : undefined} />
        </div>
        <div>
          <label className="text-sm font-medium">Artist ID
          <Input {...register('artistId')} placeholder="Artist UUID" />
          </label>
          <FieldError errors={errors.artistId?.message ? [errors.artistId.message] : undefined} />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="text-sm font-medium">Date
          <Input type="datetime-local" {...register('appointmentDate')} />
          </label>
          <FieldError errors={errors.appointmentDate?.message ? [errors.appointmentDate.message] : undefined} />
        </div>
        <div>
          <label className="text-sm font-medium">Duration (minutes)
          <Input
            type="number"
            {...register('duration', { valueAsNumber: true })}
            placeholder="120"
          />
          </label>
          <FieldError errors={errors.duration?.message ? [errors.duration.message] : undefined} />
        </div>
      </div>

      <div>
        <label className="text-sm font-medium">Design Description
        <Textarea {...register('designDescription')} placeholder="Describe the tattoo design..." />
        </label>
        <FieldError errors={errors.designDescription?.message ? [errors.designDescription.message] : undefined} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="text-sm font-medium">Placement
          <Input {...register('placement')} placeholder="e.g., Upper arm" />
          </label>
          <FieldError errors={errors.placement?.message ? [errors.placement.message] : undefined} />
        </div>
        <div>
          <label className="text-sm font-medium">Size
          <Input {...register('size')} placeholder='e.g., 6"x4"' />
          </label>
          <FieldError errors={errors.size?.message ? [errors.size.message] : undefined} />
        </div>
        <div>
          <label className="text-sm font-medium">Style
          <Input {...register('style')} placeholder="e.g., Realism" />
          </label>
          <FieldError errors={errors.style?.message ? [errors.style.message] : undefined} />
        </div>
      </div>

      <div className="border-t pt-4">
        <h4 className="text-sm font-semibold mb-3">Pricing</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium">Hourly Rate ($)
            <Input
              type="number"
              step="0.01"
              {...register('hourlyRate', { valueAsNumber: true })}
              placeholder="150.00"
            />
            </label>
            <FieldError errors={errors.hourlyRate?.message ? [errors.hourlyRate.message] : undefined} />
          </div>
          <div>
            <label className="text-sm font-medium">Estimated Hours
            <Input
              type="number"
              step="0.5"
              {...register('estimatedHours', { valueAsNumber: true })}
              placeholder="3"
            />
            </label>
            <FieldError errors={errors.estimatedHours?.message ? [errors.estimatedHours.message] : undefined} />
          </div>
          <div>
            <label className="text-sm font-medium">Deposit ($)
            <Input
              type="number"
              step="0.01"
              {...register('depositAmount', { valueAsNumber: true })}
              placeholder="0.00"
            />
            </label>
          </div>
          <div>
            <label className="text-sm font-medium">Total Cost ($)
            <Input
              type="number"
              step="0.01"
              {...register('totalCost', { valueAsNumber: true })}
              placeholder="Calculated"
              readOnly
              className="bg-muted"
            />
            </label>
            <FieldError errors={errors.totalCost?.message ? [errors.totalCost.message] : undefined} />
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
        <label className="text-sm font-medium">Notes
        <Textarea {...register('notes')} placeholder="Additional notes..." />
        </label>
      </div>

      <Button type="submit" className="w-full" disabled={isSubmitting}>
        {isSubmitting ? 'Saving...' : 'Log Session'}
      </Button>
    </form>
  );
}
