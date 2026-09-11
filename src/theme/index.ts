import { Easing, Platform } from 'react-native';

export type Palette = {
  bg: string;
  surface: string;
  surfaceAlt: string;
  surfaceContainer: string;
  border: string;
  divider: string;
  text: string;
  textMuted: string;
  textFaint: string;
  primary: string;
  primaryText: string;
  primarySoft: string;
  onPrimarySoft: string;
  accent: string;
  accentSoft: string;
  onAccent: string;
  arabic: string;
  highlight: string;
  danger: string;
  dangerSoft: string;
  shadow: string;
  heroGradient: [string, string];
  onHero: string;
  onHeroSoft: string;
  onHeroMuted: string;
  onHeroFaint: string;
  onHeroAccent: string;
};

const light: Palette = {
  bg: '#F6F2EA',
  surface: '#FFFFFF',
  surfaceAlt: '#F0EBE1',
  surfaceContainer: '#EFEAE0',
  border: '#E4DDCD',
  divider: '#EDE7DB',
  text: '#1A211D',
  textMuted: '#4E5A53',
  textFaint: '#5F6962',
  primary: '#1B5843',
  primaryText: '#FFFFFF',
  primarySoft: '#E2EDE6',
  onPrimarySoft: '#124633',
  accent: '#B98B36',
  accentSoft: '#F7EEDC',
  onAccent: '#241B08',
  arabic: '#121814',
  highlight: '#FBF3E1',
  danger: '#B3261E',
  dangerSoft: '#F9E3E1',
  shadow: '#243B31',
  heroGradient: ['#25634C', '#153F31'],
  onHero: '#FFFFFF',
  onHeroSoft: 'rgba(255,255,255,0.15)',
  onHeroMuted: 'rgba(255,255,255,0.88)',
  onHeroFaint: 'rgba(255,255,255,0.75)',
  onHeroAccent: '#EFD39A',
};

const dark: Palette = {
  bg: '#0E1512',
  surface: '#17201C',
  surfaceAlt: '#1F2A25',
  surfaceContainer: '#1A241F',
  border: '#2A3831',
  divider: '#212D27',
  text: '#E8EFEA',
  textMuted: '#A8B7AD',
  textFaint: '#8B9992',
  primary: '#4FC295',
  primaryText: '#05271B',
  primarySoft: '#173026',
  onPrimarySoft: '#8FD9B8',
  accent: '#D6B064',
  accentSoft: '#2C2417',
  onAccent: '#241B08',
  arabic: '#F1F7F2',
  highlight: '#262112',
  danger: '#F2857C',
  dangerSoft: '#33201E',
  shadow: '#000000',
  heroGradient: ['#1E5241', '#12332A'],
  onHero: '#EEF6F1',
  onHeroSoft: 'rgba(255,255,255,0.10)',
  onHeroMuted: 'rgba(255,255,255,0.88)',
  onHeroFaint: 'rgba(255,255,255,0.75)',
  onHeroAccent: '#EFD39A',
};

export const palettes = { light, dark };

export type ThemeName = keyof typeof palettes;

export const radius = { xs: 6, sm: 10, md: 14, lg: 18, xl: 22, xxl: 28, pill: 999 } as const;

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;

export const type = {
  displayLarge: { fontSize: 52, lineHeight: 56, fontWeight: '700', letterSpacing: -1.8 },
  display: { fontSize: 30, lineHeight: 35, fontWeight: '700', letterSpacing: -0.8 },
  title: { fontSize: 20, lineHeight: 26, fontWeight: '700', letterSpacing: -0.4 },
  heading: { fontSize: 15.5, lineHeight: 21, fontWeight: '600', letterSpacing: -0.15 },
  body: { fontSize: 15, lineHeight: 23, fontWeight: '400' },
  caption: { fontSize: 13, lineHeight: 19, fontWeight: '400' },
  label: { fontSize: 11, lineHeight: 14, fontWeight: '700', letterSpacing: 0.6 },
} as const;

export const motion = {
  fast: 130,
  base: 220,
  slow: 320,
  emphasized: Easing.bezier(0.2, 0, 0, 1),
  standard: Easing.bezier(0.3, 0, 0.2, 1),
} as const;

export const TAP_TARGET = 48;

export const HAIRLINE = 1;

export const ARABIC_FONTS = {
  scheherazade: {
    key: 'ScheherazadeNew-Regular',
    label: 'Scheherazade',
    lineHeightRatio: 1.95,
    fullCoverage: true,
  },
  quran: {
    key: 'AmiriQuran-Regular',
    label: 'Amiri Qur’an',
    lineHeightRatio: 2.1,
    fullCoverage: false,
  },
  naskh: {
    key: 'Amiri-Regular',
    label: 'Amiri Naskh',
    lineHeightRatio: 1.9,
    fullCoverage: false,
  },
} as const;

export type ArabicFontKey = keyof typeof ARABIC_FONTS;

export const SERIF = Platform.select({ ios: 'Georgia', default: 'serif' });
