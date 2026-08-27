const tintColorLight = '#4CAF50'; // Fresh Green accent from video
const tintColorDark = '#BEF264';

export const Colors = {
  light: {
    text: '#0F172A',
    textMuted: '#64748B',
    background: '#F4F8F4',
    cardBackground: '#FFFFFF',
    tint: tintColorLight,
    icon: '#64748B',
    tabIconDefault: '#94A3B8',
    tabIconSelected: '#0F172A',
    
    // Core accents from Stitch Bio-Pulse Nutrition
    coral: '#FF6B4A',
    coralLight: '#FFF0ED',
    coralDark: '#E55636',
    
    green: '#10B981',
    greenLight: '#EFF8F2',
    greenDark: '#047857',
    
    lime: '#84CC16',
    limeLight: '#F4FBF1',
    limeBanner: '#D9F99D',
    limeDark: '#4D7C0F',
    
    amber: '#F59E0B',
    amberLight: '#FEF3C7',
    
    sky: '#0284C7',
    skyLight: '#E0F2FE',
    emerald: '#10B981',
    emeraldLight: '#D1FAE5',
    
    macroCarb: '#F59E0B',
    macroProtein: '#10B981',
    macroFat: '#FF6B4A',
    
    breakfastTint: '#FFF0ED',
    snackTint: '#EFF8F2',
    lunchTint: '#F4FBF1',
    dinnerTint: '#FFF9E6',

    proGold: '#F59E0B',
    border: 'rgba(0, 0, 0, 0.06)',
    cardShadow: 'rgba(0, 0, 0, 0.05)',
  },
  dark: {
    text: '#FEFFF1',
    textMuted: '#94A3B8',
    background: '#0F131C',
    cardBackground: '#181C26',
    tint: tintColorDark,
    icon: '#94A3B8',
    tabIconDefault: '#475569',
    tabIconSelected: '#BEF264',
    
    coral: '#FF6B4A',
    coralLight: 'rgba(255, 107, 74, 0.15)',
    coralDark: '#FF8A65',
    
    green: '#10B981',
    greenLight: 'rgba(16, 185, 129, 0.15)',
    greenDark: '#34D399',
    
    lime: '#BEF264',
    limeLight: 'rgba(190, 242, 100, 0.15)',
    limeBanner: 'rgba(190, 242, 100, 0.18)',
    limeDark: '#BEF264',
    
    amber: '#FFA726',
    amberLight: 'rgba(255, 167, 38, 0.15)',
    
    sky: '#38BDF8',
    skyLight: 'rgba(56, 189, 248, 0.15)',
    emerald: '#10B981',
    emeraldLight: 'rgba(16, 185, 129, 0.15)',
    
    macroCarb: '#FFA726',
    macroProtein: '#10B981',
    macroFat: '#FF6B4A',
    
    breakfastTint: '#221918',
    snackTint: '#14221C',
    lunchTint: '#18241C',
    dinnerTint: '#242116',

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
