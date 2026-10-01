import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { TouchableOpacity } from './ui/FeedbackPressable';
import { useTheme } from '@/context/ThemeContext';
import { useLanguage } from '@/context/LanguageContext';
import { foodImageCandidates } from '@/services/foodImageSources';

interface Props {
  uri?: string;
  alternatives?: readonly string[];
  emoji?: string;
  name: string;
  style: StyleProp<ViewStyle>;
  emojiSize?: number;
  contentFit?: 'contain' | 'cover';
}

// A keyed child prevents an old request or recycled row from changing a new photo.
export function FoodThumbnail(props: Props) {
  const urls = foodImageCandidates(props.uri, props.alternatives);
  return <ThumbnailSources key={JSON.stringify(urls)} {...props} urls={urls} />;
}

function ThumbnailSources({ urls, emoji = '🍽️', name, style, emojiSize = 24, contentFit = 'contain' }: Props & { urls: string[] }) {
  const { colors } = useTheme();
  const { t } = useLanguage();
  const [attempt, setAttempt] = useState(0);
  const [retry, setRetry] = useState(0);
  const uri = urls[attempt];
  return (
    <View style={[styles.frame, style]}>
      <Text style={{ fontSize: emojiSize }} accessibilityLabel={name}>{emoji}</Text>
      {uri ? (
        <ImageAttempt key={`${retry}:${uri}`} uri={uri} name={name} contentFit={contentFit} onFailure={() => setAttempt(index => index + 1)} />
      ) : urls.length > 0 ? (
        <TouchableOpacity style={[styles.badge, { backgroundColor: colors.cardBg }]} accessibilityLabel={t('tts_retry')} sound="tap" onPress={event => {
          event.stopPropagation();
          setAttempt(0);
          setRetry(value => value + 1);
        }}>
          <Ionicons name="refresh" size={13} color={colors.textSecondary} />
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

function ImageAttempt({ uri, name, contentFit, onFailure }: { uri: string; name: string; contentFit: 'contain' | 'cover'; onFailure: () => void }) {
  const { colors } = useTheme();
  const [loading, setLoading] = useState(true);
  const active = useRef(true);
  const finished = useRef(false);
  const failRef = useRef(onFailure);
  failRef.current = onFailure;
  useEffect(() => {
    active.current = true;
    const timer = setTimeout(() => {
      if (active.current && !finished.current) {
        finished.current = true;
        failRef.current();
      }
    }, 8000);
    return () => { active.current = false; clearTimeout(timer); };
  }, [uri]);
  return <>
    <Image
      source={{ uri }}
      style={[StyleSheet.absoluteFillObject, { opacity: loading ? 0 : 1, backgroundColor: colors.cardBg }]}
      contentFit={contentFit}
      cachePolicy="memory-disk"
      recyclingKey={uri}
      accessibilityLabel={name}
      onLoad={() => {
        if (active.current && !finished.current) {
          finished.current = true;
          setLoading(false);
        }
      }}
      onError={() => {
        if (active.current && !finished.current) {
          finished.current = true;
          failRef.current();
        }
      }}
    />
    {loading && <ActivityIndicator size="small" color={colors.coral} style={[styles.badge, { backgroundColor: colors.cardBg }]} />}
  </>;
}

const styles = StyleSheet.create({
  frame: { alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  badge: { position: 'absolute', right: 0, bottom: 0, width: 20, height: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
});
