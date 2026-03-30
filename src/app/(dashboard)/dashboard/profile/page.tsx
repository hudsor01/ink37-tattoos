import { connection } from 'next/server';
import { getArtistProfile } from '@/lib/dal/artists';
import { ProfileClient } from './profile-client';

export default async function ProfilePage() {
  await connection();
  const profile = await getArtistProfile();

  if (!profile) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="font-heading text-2xl font-bold tracking-tight">
            Artist Profile
          </h1>
          <p className="text-muted-foreground">
            Manage your profile, bio, and business information.
          </p>
        </div>
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-12">
          <p className="text-sm text-muted-foreground">
            No artist profile found. Please create one in the database.
          </p>
        </div>
      </div>
    );
  }

  // Serialize dates to ISO strings for client component
  const serialized = {
    ...profile,
    createdAt: profile.createdAt.toISOString(),
    updatedAt: profile.updatedAt.toISOString(),
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold tracking-tight">
          Artist Profile
        </h1>
        <p className="text-muted-foreground">
          Manage your profile, bio, and business information.
        </p>
      </div>
      <ProfileClient profile={serialized} />
    </div>
  );
}
