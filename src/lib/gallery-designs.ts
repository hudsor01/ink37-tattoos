/**
 * Static gallery designs served from public/images/.
 * Mirrors the shape of `tattoo_design` rows so the page can pass them
 * straight to <GalleryClient> without a DB round-trip.
 *
 * Pre-DB-migration this is what the gallery rendered. The DB-backed
 * version is still wired up for the admin upload flow (see
 * `getPublicDesigns` in src/lib/dal/designs.ts) — when designs are
 * uploaded and approved, they can be folded back in or this file
 * can be retired.
 */
export interface GalleryDesign {
  id: string;
  name: string;
  description: string | null;
  fileUrl: string;
  thumbnailUrl: string | null;
  designType: string | null;
  size: string | null;
  style: string | null;
  tags: string[] | null;
  popularity: number;
  createdAt: Date;
}

export const GALLERY_DESIGNS: GalleryDesign[] = [
  {
    id: 'design-japanese',
    name: 'Japanese Traditional',
    description: 'Japanese traditional sleeve with rich symbolism.',
    fileUrl: '/images/japanese.jpg',
    thumbnailUrl: '/images/japanese.jpg',
    designType: 'Japanese',
    size: 'Large',
    style: 'Japanese',
    tags: ['Arm'],
    popularity: 90,
    createdAt: new Date('2025-01-01'),
  },
  {
    id: 'design-realism',
    name: 'Photorealistic Portrait',
    description: 'Black-and-grey realism with photographic shading.',
    fileUrl: '/images/realism.jpg',
    thumbnailUrl: '/images/realism.jpg',
    designType: 'Realism',
    size: 'Large',
    style: 'Realism',
    tags: ['Arm'],
    popularity: 85,
    createdAt: new Date('2025-02-01'),
  },
  {
    id: 'design-traditional',
    name: 'American Traditional',
    description: 'Bold lines and classic palette.',
    fileUrl: '/images/traditional.jpg',
    thumbnailUrl: '/images/traditional.jpg',
    designType: 'Traditional',
    size: 'Medium',
    style: 'Traditional',
    tags: ['Arm'],
    popularity: 80,
    createdAt: new Date('2025-03-01'),
  },
  {
    id: 'design-christ-crosses',
    name: 'Christ Crosses Sleeve',
    description: 'Religious realism sleeve work.',
    fileUrl: '/images/christ-crosses.jpg',
    thumbnailUrl: '/images/christ-crosses.jpg',
    designType: 'Realism',
    size: 'Large',
    style: 'Realism',
    tags: ['Arm'],
    popularity: 88,
    createdAt: new Date('2025-04-01'),
  },
  {
    id: 'design-praying-nun',
    name: 'Praying Nun',
    description: 'Detailed religious portrait on the left arm.',
    fileUrl: '/images/praying-nun-left-arm.jpg',
    thumbnailUrl: '/images/praying-nun-left-arm.jpg',
    designType: 'Realism',
    size: 'Large',
    style: 'Realism',
    tags: ['Arm'],
    popularity: 86,
    createdAt: new Date('2025-05-01'),
  },
  {
    id: 'design-dragonballz',
    name: 'Dragon Ball Z Left Arm',
    description: 'Anime/illustrative arm piece.',
    fileUrl: '/images/dragonballz-left-arm.jpg',
    thumbnailUrl: '/images/dragonballz-left-arm.jpg',
    designType: 'Illustrative',
    size: 'Large',
    style: 'Illustrative',
    tags: ['Arm'],
    popularity: 78,
    createdAt: new Date('2025-06-01'),
  },
  {
    id: 'design-leg-piece',
    name: 'Leg Piece',
    description: 'Custom leg work.',
    fileUrl: '/images/leg-piece.jpg',
    thumbnailUrl: '/images/leg-piece.jpg',
    designType: 'Realism',
    size: 'Large',
    style: 'Realism',
    tags: ['Leg'],
    popularity: 82,
    createdAt: new Date('2025-07-01'),
  },
  {
    id: 'design-cover-ups',
    name: 'Cover-Up',
    description: 'Cover-up tattoo transformation.',
    fileUrl: '/images/cover-ups.jpg',
    thumbnailUrl: '/images/cover-ups.jpg',
    designType: 'Realism',
    size: 'Medium',
    style: 'Realism',
    tags: ['Arm'],
    popularity: 75,
    createdAt: new Date('2025-08-01'),
  },
  {
    id: 'design-custom',
    name: 'Custom Design',
    description: 'One-of-a-kind custom commission.',
    fileUrl: '/images/custom-designs.jpg',
    thumbnailUrl: '/images/custom-designs.jpg',
    designType: 'Illustrative',
    size: 'Large',
    style: 'Illustrative',
    tags: ['Arm'],
    popularity: 84,
    createdAt: new Date('2025-09-01'),
  },
];
