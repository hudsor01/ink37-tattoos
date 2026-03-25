'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  CreateCustomerSchema,
  type CreateCustomerData,
} from '@/lib/security/validation';
import {
  createCustomerAction,
  updateCustomerAction,
} from '@/lib/actions/customer-actions';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface CustomerFormProps {
  customer?: {
    id: string;
    firstName: string;
    lastName: string;
    email?: string | null;
    phone?: string | null;
    dateOfBirth?: Date | string | null;
    address?: string | null;
    city?: string | null;
    state?: string | null;
    postalCode?: string | null;
    country?: string | null;
    emergencyName?: string | null;
    emergencyPhone?: string | null;
    emergencyRel?: string | null;
    allergies?: string[];
    medicalConditions?: string[];
    preferredArtist?: string | null;
    notes?: string | null;
  };
  onSuccess?: () => void;
}

export function CustomerForm({ customer, onSuccess }: CustomerFormProps) {
  const queryClient = useQueryClient();
  const isEdit = !!customer;

  const form = useForm<CreateCustomerData>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- zodResolver typing mismatch with .default() in Zod schema
    resolver: zodResolver(CreateCustomerSchema) as any,
    defaultValues: {
      firstName: customer?.firstName ?? '',
      lastName: customer?.lastName ?? '',
      email: customer?.email ?? undefined,
      phone: customer?.phone ?? undefined,
      dateOfBirth: customer?.dateOfBirth
        ? typeof customer.dateOfBirth === 'string'
          ? customer.dateOfBirth
          : customer.dateOfBirth.toISOString()
        : undefined,
      address: customer?.address ?? undefined,
      city: customer?.city ?? undefined,
      state: customer?.state ?? undefined,
      postalCode: customer?.postalCode ?? undefined,
      country: customer?.country ?? undefined,
      emergencyName: customer?.emergencyName ?? undefined,
      emergencyPhone: customer?.emergencyPhone ?? undefined,
      emergencyRel: customer?.emergencyRel ?? undefined,
      allergies: customer?.allergies ?? [],
      medicalConditions: customer?.medicalConditions ?? [],
      preferredArtist: customer?.preferredArtist ?? undefined,
      notes: customer?.notes ?? undefined,
    },
  });

  async function onSubmit(data: CreateCustomerData) {
    try {
      const formData = new FormData();
      Object.entries(data).forEach(([key, value]) => {
        if (value === undefined || value === null) return;
        if (Array.isArray(value)) {
          value.forEach((v) => formData.append(key, v));
        } else {
          formData.append(key, String(value));
        }
      });

      if (isEdit && customer) {
        await updateCustomerAction(customer.id, formData);
        toast.success('Customer updated successfully');
      } else {
        await createCustomerAction(formData);
        toast.success('Customer created successfully');
      }

      await queryClient.invalidateQueries({ queryKey: ['customers'] });
      onSuccess?.();
    } catch {
      toast.error("Changes couldn't be saved. Please try again.");
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <Tabs defaultValue="basic">
          <TabsList>
            <TabsTrigger value="basic">Basic Info</TabsTrigger>
            <TabsTrigger value="medical">Medical</TabsTrigger>
            <TabsTrigger value="emergency">Emergency</TabsTrigger>
            <TabsTrigger value="additional">Additional</TabsTrigger>
          </TabsList>

          <TabsContent value="basic" className="space-y-4 pt-4">
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
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input
                      type="email"
                      placeholder="email@example.com"
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
          </TabsContent>

          <TabsContent value="medical" className="space-y-4 pt-4">
            <FormField
              control={form.control}
              name="dateOfBirth"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Date of Birth</FormLabel>
                  <FormControl>
                    <Input
                      type="date"
                      {...field}
                      value={
                        field.value
                          ? new Date(field.value).toISOString().split('T')[0]
                          : ''
                      }
                      onChange={(e) => {
                        const val = e.target.value;
                        field.onChange(
                          val ? new Date(val).toISOString() : undefined
                        );
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="allergies"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Allergies</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Latex, Red ink (comma-separated)"
                      value={field.value?.join(', ') ?? ''}
                      onChange={(e) =>
                        field.onChange(
                          e.target.value
                            .split(',')
                            .map((s) => s.trim())
                            .filter(Boolean)
                        )
                      }
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="medicalConditions"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Medical Conditions</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Diabetes, Hemophilia (comma-separated)"
                      value={field.value?.join(', ') ?? ''}
                      onChange={(e) =>
                        field.onChange(
                          e.target.value
                            .split(',')
                            .map((s) => s.trim())
                            .filter(Boolean)
                        )
                      }
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </TabsContent>

          <TabsContent value="emergency" className="space-y-4 pt-4">
            <FormField
              control={form.control}
              name="emergencyName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Emergency Contact Name</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Contact name"
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
              name="emergencyPhone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Emergency Contact Phone</FormLabel>
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
            <FormField
              control={form.control}
              name="emergencyRel"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Relationship</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Spouse, parent, etc."
                      {...field}
                      value={field.value ?? ''}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </TabsContent>

          <TabsContent value="additional" className="space-y-4 pt-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Address</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="123 Main St"
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
                name="city"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>City</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="City"
                        {...field}
                        value={field.value ?? ''}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="state"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>State</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="TX"
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
                name="postalCode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Postal Code</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="75001"
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
                name="country"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Country</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="US"
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
              name="preferredArtist"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Preferred Artist</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Artist name"
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
          </TabsContent>
        </Tabs>

        <div className="flex justify-end gap-2 pt-4">
          <Button type="submit" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting
              ? 'Saving...'
              : isEdit
                ? 'Update Customer'
                : 'Create Customer'}
          </Button>
        </div>
      </form>
    </Form>
  );
}
