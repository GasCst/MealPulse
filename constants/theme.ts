const tintColorLight = '#84CC16'; // Lime Green accent
const tintColorDark = '#BEF264';

export const Colors = {
  light: {
    text: '#0F172A',
    textMuted: '#64748B',
    background: '#F8FAFC',
    cardBackground: '#FFFFFF',
    tint: tintColorLight,
    icon: '#64748B',
    tabIconDefault: '#94A3B8',
    tabIconSelected: tintColorLight,
    limeBanner: '#D9F99D',
    limeDark: '#4D7C0F',
    emerald: '#10B981',
    proGold: '#F59E0B',
    border: 'rgba(0, 0, 0, 0.06)',
    cardShadow: 'rgba(0, 0, 0, 0.04)',
  },
  dark: {
    text: '#F8FAFC',
    textMuted: '#94A3B8',
    background: '#090D16',
    cardBackground: '#131C2E',
    tint: tintColorDark,
    icon: '#94A3B8',
    tabIconDefault: '#475569',
    tabIconSelected: tintColorDark,
    limeBanner: 'rgba(190, 242, 100, 0.18)',
    limeDark: '#BEF264',
    emerald: '#10B981',
    proGold: '#F59E0B',
    border: 'rgba(255, 255, 255, 0.08)',
    cardShadow: 'rgba(0, 0, 0, 0.3)',
  },
};

export const Fonts = {
  sans: 'System',
  mono: 'SpaceMono',
  rounded: 'System',
};

export const MonetizationPlans = {
  weekly: {
    id: 'weekly',
    name: 'Weekly Pass',
    price: '4.99 €',
    period: '/ week',
    description: '3-Day Free Trial • Cancel anytime',
    badge: 'MOST POPULAR',
    mrrEquivalent: 21.62,
  },
  monthly: {
    id: 'monthly',
    name: 'Monthly PRO',
    price: '17.99 €',
    period: '/ month',
    description: 'Save 30% vs weekly billing',
    badge: 'SAVE 30%',
    mrrEquivalent: 17.99,
  },
  yearly: {
    id: 'yearly',
    name: 'Annual VIP',
    price: '74.99 €',
    period: '/ year',
    description: '6.25 € / month billed annually',
    badge: 'BEST VALUE (70% OFF)',
    mrrEquivalent: 6.25,
  },
  jackpot: {
    id: 'jackpot',
    name: '80% OFF Jackpot',
    price: '2.99 €',
    period: '/ month',
    description: 'Exclusive 80% OFF Spin Wheel Winner Special',
    badge: 'JACKPOT 80% OFF',
    mrrEquivalent: 2.99,
  },
};
