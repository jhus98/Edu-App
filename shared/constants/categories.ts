export const CATEGORIES = [
  'HISTORY',
  'SCIENCE',
  'SPACE',
  'NATURE',
  'GEOGRAPHY',
  'PHILOSOPHY',
  'TECHNOLOGY',
  'ART',
] as const;

export type Category = (typeof CATEGORIES)[number];

export const CATEGORY_CONFIG: Record<
  Category,
  { gradientStart: string; gradientEnd: string; accent: string; label: string; emoji: string }
> = {
  HISTORY: {
    gradientStart: '#1a0800',
    gradientEnd: '#6b2200',
    accent: '#fb923c',
    label: 'History',
    emoji: '🏛️',
  },
  SCIENCE: {
    gradientStart: '#001408',
    gradientEnd: '#005028',
    accent: '#34d399',
    label: 'Science',
    emoji: '🔬',
  },
  SPACE: {
    gradientStart: '#00040f',
    gradientEnd: '#001060',
    accent: '#60a5fa',
    label: 'Space',
    emoji: '🚀',
  },
  NATURE: {
    gradientStart: '#060f00',
    gradientEnd: '#213d00',
    accent: '#a3e635',
    label: 'Nature',
    emoji: '🌿',
  },
  GEOGRAPHY: {
    gradientStart: '#160010',
    gradientEnd: '#560038',
    accent: '#f472b6',
    label: 'Geography',
    emoji: '🌍',
  },
  PHILOSOPHY: {
    gradientStart: '#08001a',
    gradientEnd: '#2d0070',
    accent: '#c084fc',
    label: 'Philosophy',
    emoji: '🧠',
  },
  TECHNOLOGY: {
    gradientStart: '#001018',
    gradientEnd: '#003d5c',
    accent: '#38bdf8',
    label: 'Technology',
    emoji: '⚡',
  },
  ART: {
    gradientStart: '#1a0010',
    gradientEnd: '#5c0038',
    accent: '#f9a8d4',
    label: 'Art',
    emoji: '🎨',
  },
};
