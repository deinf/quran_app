export type ShareTheme = {
  id: string;
  label: string;
  colors: [string, string, ...string[]];
  text: string;
  muted: string;
  rule: string;
  outline?: string;
};

export const SHARE_THEMES: ShareTheme[] = [
  {
    id: 'sage',
    label: 'Sage',
    colors: ['#DCE6D9', '#CBD9C7'],
    text: '#1B2A1C',
    muted: 'rgba(27,42,28,0.7)',
    rule: 'rgba(27,42,28,0.3)',
    outline: '#BFCFBB',
  },
  {
    id: 'celestial',
    label: 'Celestial',
    colors: ['#F6F2E7', '#EFE9DA'],
    text: '#26312B',
    muted: 'rgba(38,49,43,0.72)',
    rule: 'rgba(38,49,43,0.32)',
    outline: '#E2DCCB',
  },
  {
    id: 'dusty',
    label: 'Dusty',
    colors: ['#EEDDDF', '#E0C9CD'],
    text: '#3A2A2D',
    muted: 'rgba(58,42,45,0.76)',
    rule: 'rgba(58,42,45,0.32)',
    outline: '#D3B9BE',
  },
  {
    id: 'sand',
    label: 'Sand',
    colors: ['#E6D8C3', '#D6C3A8'],
    text: '#3A3126',
    muted: 'rgba(58,49,38,0.8)',
    rule: 'rgba(58,49,38,0.34)',
  },
  {
    id: 'night',
    label: 'Night',
    colors: ['#1C1C1E', '#0E0E10'],
    text: '#F4F4F5',
    muted: 'rgba(244,244,245,0.62)',
    rule: 'rgba(244,244,245,0.3)',
  },
  {
    id: 'emerald',
    label: 'Emerald',
    colors: ['#12503C', '#0A3729'],
    text: '#EAF5EF',
    muted: 'rgba(234,245,239,0.68)',
    rule: 'rgba(234,245,239,0.32)',
  },
  {
    id: 'midnight',
    label: 'Midnight',
    colors: ['#1B2A4A', '#101B31'],
    text: '#EAF0FA',
    muted: 'rgba(234,240,250,0.66)',
    rule: 'rgba(234,240,250,0.3)',
  },
  {
    id: 'plum',
    label: 'Plum',
    colors: ['#42304F', '#2C2036'],
    text: '#F2ECF6',
    muted: 'rgba(242,236,246,0.66)',
    rule: 'rgba(242,236,246,0.3)',
  },
  {
    id: 'clay',
    label: 'Clay',
    colors: ['#7E4634', '#653526'],
    text: '#FFF6F1',
    muted: 'rgba(255,246,241,0.72)',
    rule: 'rgba(255,246,241,0.34)',
  },
  {
    id: 'teal',
    label: 'Teal',
    colors: ['#1F5F63', '#12464A'],
    text: '#E8F6F6',
    muted: 'rgba(232,246,246,0.76)',
    rule: 'rgba(232,246,246,0.32)',
  },
  {
    id: 'paper',
    label: 'Paper',
    colors: ['#FFFFFF', '#F4F4F2'],
    text: '#1E2622',
    muted: 'rgba(30,38,34,0.66)',
    rule: 'rgba(30,38,34,0.22)',
    outline: '#E5E5E1',
  },
  {
    id: 'gold',
    label: 'Gold',
    colors: ['#3A2E17', '#241C0E'],
    text: '#F6E7C1',
    muted: 'rgba(246,231,193,0.66)',
    rule: 'rgba(246,231,193,0.34)',
  },
];

export const DEFAULT_SHARE_THEME = SHARE_THEMES[0];

export type ShareAlignment = 'left' | 'center' | 'right';

export const SHARE_FONT_SIZE = { min: 18, max: 40, step: 2, default: 24 } as const;
