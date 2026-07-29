// Fallback for using MaterialIcons on Android and web.

import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { SymbolWeight, SymbolViewProps } from 'expo-symbols';
import { ComponentProps } from 'react';
import { OpaqueColorValue, type StyleProp, type TextStyle } from 'react-native';

type IconMapping = Record<string, ComponentProps<typeof MaterialIcons>['name']>;

/**
 * Add your SF Symbols to Material Icons mappings here.
 * - see Material Icons in the [Icons Directory](https://icons.expo.fyi).
 * - see SF Symbols in the [SF Symbols](https://developer.apple.com/sf-symbols/) app.
 */
const MAPPING: IconMapping = {
  'house.fill': 'home',
  'paperplane.fill': 'send',
  'chevron.left.forwardslash.chevron.right': 'code',
  'chevron.right': 'chevron-right',
  'sparkles': 'auto-awesome',
  'chart.bar.fill': 'bar-chart',
  'gearshape.fill': 'settings',
  'flame.fill': 'local-fire-department',
  'checkmark.circle.fill': 'check-circle',
  'star.fill': 'star',
  'lock.fill': 'lock',
  'bolt.fill': 'flash-on',
  'trophy.fill': 'emoji-events',
  'add': 'add',
  'close': 'close',
  'crown.fill': 'workspace-premium',
  'arrow.right': 'arrow-forward',
};

/**
 * An icon component that uses native SF Symbols on iOS, and Material Icons on Android and web.
 * This ensures a consistent look across platforms, and optimal resource usage.
 * Icon `name`s are based on SF Symbols and require manual mapping to Material Icons.
 */
export function IconSymbol({
  name,
  size = 24,
  color,
  style,
}: {
  name: string;
  size?: number;
  color: string | OpaqueColorValue;
  style?: StyleProp<TextStyle>;
  weight?: SymbolWeight;
}) {
  const iconName = MAPPING[name] || 'help-outline';
  return <MaterialIcons color={color} size={size} name={iconName} style={style} />;
}
