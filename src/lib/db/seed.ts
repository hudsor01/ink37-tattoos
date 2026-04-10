import { drizzle } from 'drizzle-orm/neon-serverless';
import { Pool, neonConfig } from '@neondatabase/serverless';
import ws from 'ws';
import { tattooArtist, settings, consentForm } from './schema';

// Required for WebSocket connections in Node.js/Bun
neonConfig.webSocketConstructor = ws;

async function seed() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error('DATABASE_URL environment variable is required');
    process.exit(1);
  }

  // Create a Pool so we can explicitly close the connection (addresses review concern #5)
  const pool = new Pool({ connectionString: databaseUrl });
  const db = drizzle({ client: pool });

  try {
    console.log('Seeding database...');

    // 1. Upsert artist profile (placeholder data, not real)
    const [artist] = await db.insert(tattooArtist).values({
      name: 'Studio Artist',
      email: 'artist@ink37tattoos.com',
      phone: '(555) 000-0000',
      specialties: ['Custom', 'Traditional', 'Japanese', 'Realism'],
      hourlyRate: 150,
      isActive: true,
      bio: 'Professional tattoo artist. Update this profile from the admin dashboard.',
      instagramHandle: '@ink37tattoos',
      yearsExperience: 10,
    }).onConflictDoUpdate({
      target: tattooArtist.email,
      set: { updatedAt: new Date() },
    }).returning();
    console.log(`  Artist: ${artist.name} (${artist.email})`);

    // 2. Upsert default settings (hours, policies, contact placeholders)
    const defaultSettings = [
      { key: 'studio_name', value: 'Ink 37 Tattoos', category: 'studio', description: 'Studio display name' },
      { key: 'studio_email', value: 'contact@ink37tattoos.com', category: 'studio', description: 'Studio contact email' },
      { key: 'studio_phone', value: '(555) 000-0000', category: 'studio', description: 'Studio phone number' },
      { key: 'studio_address', value: 'Crowley, TX', category: 'studio', description: 'Studio address' },
      { key: 'studio_hours', value: { Mon: '10:00-18:00', Tue: '10:00-18:00', Wed: '10:00-18:00', Thu: '10:00-18:00', Fri: '10:00-18:00', Sat: '10:00-18:00', Sun: 'Closed' }, category: 'hours', description: 'Operating hours by day' },
      { key: 'deposit_percentage', value: 20, category: 'payment', description: 'Default deposit percentage for appointments' },
      { key: 'minimum_deposit', value: 50, category: 'payment', description: 'Minimum deposit amount in dollars' },
      { key: 'cancellation_policy', value: 'Cancellations must be made at least 48 hours in advance. Deposits are non-refundable for no-shows or late cancellations.', category: 'policy', description: 'Cancellation policy text' },
      { key: 'aftercare_instructions', value: 'Keep the bandage on for 2-4 hours. Wash gently with fragrance-free soap. Apply a thin layer of unscented moisturizer. Avoid direct sunlight, swimming, and soaking for 2 weeks.', category: 'policy', description: 'Default aftercare instructions' },
      { key: 'booking_lead_time_days', value: 2, category: 'booking', description: 'Minimum days in advance for booking' },
      { key: 'reminder_hours_before', value: [24, 48], category: 'booking', description: 'Hours before appointment to send reminders' },
    ];

    for (const s of defaultSettings) {
      await db.insert(settings).values({
        key: s.key,
        value: s.value,
        category: s.category,
        description: s.description,
      }).onConflictDoUpdate({
        target: settings.key,
        set: { value: s.value, updatedAt: new Date() },
      });
    }
    console.log(`  Settings: ${defaultSettings.length} entries upserted`);

    // 3. Upsert consent form v1 (full legal document, ready to use)
    await db.insert(consentForm).values({
      version: 1,
      title: 'Tattoo Consent Form',
      content: `TATTOO CONSENT AND RELEASE FORM

I, the undersigned, hereby consent to the application of a tattoo by Ink 37 Tattoos and its artists.

ACKNOWLEDGMENTS AND AGREEMENTS:

1. HEALTH DECLARATION
I confirm that I am not under the influence of alcohol or drugs. I do not have diabetes, epilepsy, hemophilia, a heart condition, or any other medical condition that might affect healing. I am not pregnant or nursing. I do not have a communicable disease including hepatitis or HIV/AIDS. I have disclosed any allergies, medical conditions, or medications to my artist.

2. PROCEDURE RISKS
I acknowledge that a tattoo is a permanent change to my appearance. I understand the risks include but are not limited to: infection, allergic reaction, scarring, keloid formation, and unsatisfactory results. I have been informed of the aftercare procedures necessary to properly care for my tattoo during the healing process.

3. AFTERCARE RESPONSIBILITY
I agree to follow all aftercare instructions provided by my artist. I understand that failure to follow aftercare instructions may result in damage to the tattoo and/or infection. I understand that touch-ups due to my own negligence in aftercare are not covered free of charge.

4. AGE VERIFICATION
I certify that I am at least 18 years of age (or accompanied by a legal guardian with valid ID if the jurisdiction allows minors with parental consent). I have provided valid government-issued photo identification.

5. DESIGN APPROVAL
I have reviewed and approved the design, placement, and size of the tattoo to be applied. I understand that a tattoo is a subjective art form and that variations in color and design may exist between the original design and the finished tattoo. I understand that exact color, size, and placement matches to reference images cannot be guaranteed.

6. STUDIO STANDARDS
I have been given the opportunity to inspect the studio and observe the sterilization procedures used. I am satisfied that the studio meets acceptable standards of hygiene and safety. I understand that all needles are single-use, sterile, and disposed of after my session.

7. LIABILITY RELEASE
I release Ink 37 Tattoos, its owner, and its artists from any and all liability, claims, damages, and expenses arising from the tattoo procedure, including but not limited to any claims for personal injury, infection, or dissatisfaction with the tattoo. This release is binding upon myself, my heirs, and assigns.

8. PHOTOGRAPHY CONSENT
I consent to photographs being taken of my tattoo for the artist's portfolio and social media. I understand I may opt out of this by notifying my artist before the session begins.

9. REFUND POLICY
I understand that all deposits are non-refundable. I understand that tattoos are custom artwork and refunds are not available for completed work. Disputes regarding quality should be raised within 30 days of the session.

By signing below, I acknowledge that I have read, understood, and agree to all of the above terms and conditions. I confirm that all information I have provided is true and accurate.

Signature: _________________________  Date: _______________
Printed Name: _________________________`,
      isActive: true,
    }).onConflictDoUpdate({
      target: consentForm.version,
      set: { updatedAt: new Date() },
    });
    console.log('  Consent form: v1 upserted');

    console.log('Seed complete.');
  } finally {
    // Explicit connection cleanup -- prevents WebSocket from keeping process alive
    await pool.end();
  }
}

seed()
  .catch((err) => {
    console.error('Seed failed:', err);
    process.exit(1);
  })
  .then(() => process.exit(0));
