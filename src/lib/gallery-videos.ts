export interface GalleryVideo {
  id: string;
  name: string;
  url: string;
  posterUrl: string;
  style: string;
  placement: string;
}

// URLs populated after running: BLOB_READ_WRITE_TOKEN=<token> bun run scripts/upload-videos.ts
export const GALLERY_VIDEOS: GalleryVideo[] = [
  {
    id: 'video-1',
    name: 'Christ Crosses Left Arm Sleeve',
    url: 'PLACEHOLDER_URL',
    posterUrl: 'PLACEHOLDER_URL',
    style: 'Realism',
    placement: 'Arm',
  },
  {
    id: 'video-2',
    name: 'Christ Crosses Right Arm',
    url: 'PLACEHOLDER_URL',
    posterUrl: 'PLACEHOLDER_URL',
    style: 'Realism',
    placement: 'Arm',
  },
  {
    id: 'video-3',
    name: 'Clock Lion Left Arm',
    url: 'PLACEHOLDER_URL',
    posterUrl: 'PLACEHOLDER_URL',
    style: 'Realism',
    placement: 'Arm',
  },
  {
    id: 'video-4',
    name: 'Clock Roses',
    url: 'PLACEHOLDER_URL',
    posterUrl: 'PLACEHOLDER_URL',
    style: 'Realism',
    placement: 'Body',
  },
  {
    id: 'video-5',
    name: 'Dragonball Z Left Arm',
    url: 'PLACEHOLDER_URL',
    posterUrl: 'PLACEHOLDER_URL',
    style: 'Anime',
    placement: 'Arm',
  },
  {
    id: 'video-6',
    name: 'Praying Hands Left Arm',
    url: 'PLACEHOLDER_URL',
    posterUrl: 'PLACEHOLDER_URL',
    style: 'Realism',
    placement: 'Arm',
  },
  {
    id: 'video-7',
    name: 'Praying Nun',
    url: 'PLACEHOLDER_URL',
    posterUrl: 'PLACEHOLDER_URL',
    style: 'Realism',
    placement: 'Body',
  },
];
