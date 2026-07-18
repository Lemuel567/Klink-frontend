import { ImageSourcePropType } from 'react-native';

/**
 * Real church worship photos (assets/images/church/). Never compress or crop
 * destructively — always rendered with contentFit="cover".
 *
 * QUALITY NOTE: the first 8 are high-resolution and safe for full-screen
 * watermarks; the last 4 (celebration-1, worship-hands-2/3, crowd-2) are small
 * web thumbnails — use them ONLY for small card accents, never full screen.
 */
export const WorshipImages = {
  // High resolution — full-screen safe
  worshipSolo1: require('../../assets/images/church/worship-solo-1.jpg') as ImageSourcePropType,   // man, hand raised, warm cream
  congregation1: require('../../assets/images/church/congregation-1.jpg') as ImageSourcePropType,  // hands raised, amber stage light
  worshipSolo2: require('../../assets/images/church/worship-solo-2.jpg') as ImageSourcePropType,   // woman singing, blue/purple light
  prayer1: require('../../assets/images/church/prayer-1.jpg') as ImageSourcePropType,              // B&W, tears, looking up
  prayer2: require('../../assets/images/church/prayer-2.jpg') as ImageSourcePropType,              // man bowed in prayer, deep blue
  congregation2: require('../../assets/images/church/congregation-2.jpg') as ImageSourcePropType,  // bright sanctuary, clapping
  worshipHands1: require('../../assets/images/church/worship-hands-1.jpg') as ImageSourcePropType, // fist raised, crying out, arena
  crowd1: require('../../assets/images/church/crowd-1.jpg') as ImageSourcePropType,                // arena crowd collage, red/pink

  // High resolution — added 2026-07-18 (cpics import)
  worshipHands4: require('../../assets/images/church/worship-hands-4.jpg') as ImageSourcePropType, // hands raised under white spotlights, gold shirt
  praiseNature1: require('../../assets/images/church/praise-nature-1.jpg') as ImageSourcePropType, // arms open to heaven in a green forest, daylight

  // Low resolution — small accents only
  celebration1: require('../../assets/images/church/celebration-1.jpg') as ImageSourcePropType,
  worshipHands2: require('../../assets/images/church/worship-hands-2.jpg') as ImageSourcePropType,
  worshipHands3: require('../../assets/images/church/worship-hands-3.jpg') as ImageSourcePropType,
  crowd2: require('../../assets/images/church/crowd-2.webp') as ImageSourcePropType,

  // Low resolution — added 2026-07-18 (cpics import); accents only, never full screen
  worshipService1: require('../../assets/images/church/worship-service-1.jpg') as ImageSourcePropType,   // band + lyrics screen, warm hall
  singerTeal1: require('../../assets/images/church/singer-teal-1.webp') as ImageSourcePropType,          // singer with mic, teal stage light
  worshipLeader1: require('../../assets/images/church/worship-leader-1.webp') as ImageSourcePropType,    // worship leader at mic, warm amber
  congregation3: require('../../assets/images/church/congregation-3.webp') as ImageSourcePropType,       // vast conference hall, glowing screens
  congregation4: require('../../assets/images/church/congregation-4.webp') as ImageSourcePropType,       // arena worship, hand raised, red tones
  sanctuaryBlue1: require('../../assets/images/church/sanctuary-blue-1.webp') as ImageSourcePropType,    // blue-lit sanctuary, twin screens
  sanctuarySmall1: require('../../assets/images/church/sanctuary-small-1.webp') as ImageSourcePropType,  // small daylight sanctuary, warm carpet

  // Architectural interior — used for the Facilities tile (church hub), never
  // in the worship rotation (not a worship scene).
  churchInterior1: require('../../assets/images/church/church-interior-1.jpg') as ImageSourcePropType,
};

/**
 * High-res rotation for alternating hero/section backgrounds.
 * New photos are appended AFTER the existing ones (skill rule) so existing
 * index-based accents (getWorshipPhoto) keep their previous photos.
 */
export const WorshipPhotoArray: ImageSourcePropType[] = [
  WorshipImages.congregation1,
  WorshipImages.worshipSolo2,
  WorshipImages.worshipHands1,
  WorshipImages.prayer2,
  WorshipImages.congregation2,
  WorshipImages.worshipSolo1,
  WorshipImages.crowd1,
  WorshipImages.prayer1,
  WorshipImages.worshipHands4,
  WorshipImages.praiseNature1,
];

/** Alternate photos by index — adjacent items never repeat. */
export function getWorshipPhoto(index: number): ImageSourcePropType {
  return WorshipPhotoArray[Math.abs(index) % WorshipPhotoArray.length];
}

/** Fixed assignment per screen so each screen has a distinct atmosphere. */
export const ScreenPhotos = {
  splash: WorshipImages.congregation1,   // amber hands raised — the signature shot
  login: WorshipImages.worshipHands1,    // crying out to heaven
  register: WorshipImages.congregation2, // bright, welcoming sanctuary
  home: WorshipImages.congregation1,
  giving: WorshipImages.worshipSolo1,    // warm, personal devotion
  members: WorshipImages.crowd1,
  sermons: WorshipImages.congregation2,
  church: WorshipImages.crowd1,
  projects: WorshipImages.worshipHands1,
  prayer: WorshipImages.prayer2,         // bowed in prayer
  prayerNew: WorshipImages.prayer1,      // intimate B&W tears
  devotional: WorshipImages.worshipSolo1,
  profile: WorshipImages.worshipSolo2,   // blue/purple worship
  attendance: WorshipImages.congregation2,
} as const;
