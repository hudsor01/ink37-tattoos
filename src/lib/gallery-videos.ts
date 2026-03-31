export interface GalleryVideo {
  id: string;
  name: string;
  url: string;
  posterUrl: string;
  style: string;
  placement: string;
}

// Videos served from public/videos/ (22MB total, small enough for static hosting)
export const GALLERY_VIDEOS: GalleryVideo[] = [
  {
    id: 'video-1',
    name: 'Christ Crosses Left Arm Sleeve',
    url: '/videos/christ-crosses-left-arm-sleeve.mp4',
    posterUrl: '/videos/christ-crosses-left-arm-sleeve-poster.jpg',
    style: 'Realism',
    placement: 'Arm',
  },
  {
    id: 'video-2',
    name: 'Christ Crosses Right Arm',
    url: '/videos/christ-crosses-right-arm.mp4',
    posterUrl: '/videos/christ-crosses-right-arm-poster.jpg',
    style: 'Realism',
    placement: 'Arm',
  },
  {
    id: 'video-3',
    name: 'Clock Lion Left Arm',
    url: '/videos/clock-lion-left-arm.mp4',
    posterUrl: '/videos/clock-lion-left-arm-poster.jpg',
    style: 'Realism',
    placement: 'Arm',
  },
  {
    id: 'video-4',
    name: 'Clock Roses',
    url: '/videos/clock-roses.mp4',
    posterUrl: '/videos/clock-roses-poster.jpg',
    style: 'Realism',
    placement: 'Body',
  },
  {
    id: 'video-5',
    name: 'Dragonball Z Left Arm',
    url: '/videos/dragonballz-left-arm.mp4',
    posterUrl: '/videos/dragonballz-left-arm-poster.jpg',
    style: 'Anime',
    placement: 'Arm',
  },
  {
    id: 'video-6',
    name: 'Praying Hands Left Arm',
    url: '/videos/praying-hands-left-arm.mp4',
    posterUrl: '/videos/praying-hands-left-arm-poster.jpg',
    style: 'Realism',
    placement: 'Arm',
  },
  {
    id: 'video-7',
    name: 'Praying Nun',
    url: '/videos/praying-nun.mp4',
    posterUrl: '/videos/praying-nun-poster.jpg',
    style: 'Realism',
    placement: 'Body',
  },
];
