import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Modal, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { TouchableOpacity, Switch } from '@/components/ui/FeedbackPressable';
import { useButtonSounds } from '@/hooks/useButtonSounds';
import { useLanguage } from '@/context/LanguageContext';
import { useTheme } from '@/context/ThemeContext';
import { useSubscription } from '@/context/SubscriptionContext';
import { buttonSoundService } from '@/services/buttonSoundService';
import { soundChangeNeedsReward, type SoundChange } from '@/services/soundCustomizationAccess';
import { watchSoundRewardAd } from '@/services/soundRewardService';
import { BUTTON_SOUND_KINDS, SOUND_EFFECTS, SOUND_THEMES, resolveButtonSound, type ButtonSoundKind, type SoundEffectId, type SoundThemeId, type SoundChoice } from '@/constants/buttonSounds';

export function ButtonSoundSettingsModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { t } = useLanguage();
  const { colors, isDarkMode } = useTheme();
  const { isPro, openPaywall } = useSubscription();
  const { enabled, preferences, setEnabled } = useButtonSounds();
  const [tab, setTab] = useState<'themes' | 'actions'>('themes');
  const [action, setAction] = useState<ButtonSoundKind | null>(null);
  const [expanded, setExpanded] = useState<SoundThemeId | null>('classic');
  const [previewing, setPreviewing] = useState<SoundEffectId | null>(null);
  const [applying, setApplying] = useState(false);
  const [pending, setPending] = useState<SoundChange | null>(null);
  const [adStatus, setAdStatus] = useState<'loading' | 'showing' | null>(null);
  const [notice, setNotice] = useState('');
  const adRequest = useRef<AbortController | null>(null);
  const previewRevision = useRef(0);
  const surface = isDarkMode ? '#1B222A' : '#FFFFFF';
  const border = isDarkMode ? '#303B45' : '#E3E7E3';
  const text = colors.textPrimary;
  const muted = colors.textSecondary;
  const accent = isDarkMode ? '#C8F31D' : '#546C00';
  const activeTheme = SOUND_THEMES.find(theme => theme.id === preferences.theme)!;

  useEffect(() => {
    if (visible) return;
    adRequest.current?.abort();
    setPending(null); setAdStatus(null); setAction(null); setNotice('');
    previewRevision.current++;
    setPreviewing(null);
  }, [visible]);
  useEffect(() => () => { adRequest.current?.abort(); previewRevision.current++; }, []);

  const choiceLabel = (choice: SoundChoice) => {
    if (choice === 'silent') return t('sound_silent');
    const effect = SOUND_EFFECTS[choice];
    return `${t(`sound_theme_${effect.theme}`)} · ${t(effect.label)}`;
  };
  const changeLabel = (change: SoundChange) => change.type === 'theme'
    ? t(`sound_theme_${change.theme}`)
    : `${t(`sound_action_${change.kind.replace(/-/g, '_')}`)} · ${change.choice ? choiceLabel(change.choice) : t('sound_follow_theme')}`;

  const preview = async (effect: SoundEffectId, kind: ButtonSoundKind = 'confirm') => {
    const revision = ++previewRevision.current;
    setPreviewing(effect);
    try {
      const played = await buttonSoundService.preview(effect, kind);
      if (!played && revision === previewRevision.current) setNotice(t('sound_preview_error'));
    } finally { if (revision === previewRevision.current) setPreviewing(null); }
  };
  const commit = async (change: SoundChange) => {
    setApplying(true); setNotice('');
    try {
      if (change.type === 'theme') await buttonSoundService.setTheme(change.theme);
      else await buttonSoundService.setOverride(change.kind, change.choice);
      setNotice(t('sound_saved'));
    } catch { setNotice(t('sound_save_error')); }
    finally { setApplying(false); }
  };
  const requestChange = (change: SoundChange) => {
    if (applying || adStatus) return;
    if (change.type === 'theme' && change.theme === preferences.theme && !Object.keys(preferences.overrides).length) return;
    if (change.type === 'action' && change.choice === preferences.overrides[change.kind]) return;
    if (change.type === 'action' && change.choice !== undefined && change.choice === resolveButtonSound(change.kind, preferences)) return;
    setNotice('');
    if (soundChangeNeedsReward(change, preferences, isPro)) setPending(change);
    else void commit(change);
  };
  const close = () => { adRequest.current?.abort(); onClose(); };
  const back = () => {
    adRequest.current?.abort(); setAdStatus(null); setNotice('');
    if (pending) setPending(null);
    else setAction(null);
  };
  const watchAd = async () => {
    if (!pending || adStatus) return;
    const change = pending;
    const request = new AbortController();
    adRequest.current?.abort(); adRequest.current = request;
    setNotice('');
    const earned = await watchSoundRewardAd(request.signal, setAdStatus);
    if (request.signal.aborted) return;
    setAdStatus(null);
    if (earned) { setPending(null); await commit(change); }
    else setNotice(t('sound_ad_unavailable'));
  };
  const playButton = (effect: SoundEffectId, kind?: ButtonSoundKind) => (
    <TouchableOpacity sound={false} onPress={() => { void preview(effect, kind); }} disabled={!enabled || !!adStatus}
      accessibilityRole="button" accessibilityLabel={`${t('sound_preview')}: ${choiceLabel(effect)}`}
      style={[styles.play, { backgroundColor: isDarkMode ? '#293541' : '#EDF2EC', opacity: enabled ? 1 : .45 }]}>
      {previewing === effect ? <ActivityIndicator size="small" color={accent} /> : <Ionicons name="play" size={17} color={accent} />}
    </TouchableOpacity>
  );
  const choiceRow = (label: string, selected: boolean, onPress: () => void, effect?: SoundEffectId) => (
    <View style={[styles.choice, { backgroundColor: surface, borderColor: selected ? accent : border }]}>
      <TouchableOpacity sound={false} onPress={onPress} disabled={applying || !!adStatus} accessibilityRole="radio"
        accessibilityState={{ checked: selected }} style={styles.choiceMain}>
        <Ionicons name={selected ? 'checkmark-circle' : 'ellipse-outline'} size={22} color={selected ? accent : muted} />
        <Text style={[styles.label, { color: text, flex: 1 }]}>{label}</Text>
      </TouchableOpacity>
      {effect && playButton(effect, action || undefined)}
    </View>
  );

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={action || pending ? back : close}>
      <View style={styles.backdrop}>
        <SafeAreaView edges={['top', 'bottom']} style={[styles.sheet, { backgroundColor: isDarkMode ? '#10171E' : '#F5F7F2' }]}>
          <View style={[styles.header, { borderBottomColor: border }]}>
            {(action || pending) && <TouchableOpacity sound="close" onPress={back} accessibilityLabel={t('sound_back')} style={styles.headerButton}>
              <Ionicons name="arrow-back" size={23} color={text} />
            </TouchableOpacity>}
            <View style={{ flex: 1 }}>
              <Text style={[styles.title, { color: text }]}>{pending ? t('sound_unlock_title') : action ? t(`sound_action_${action.replace(/-/g, '_')}`) : t('button_sounds')}</Text>
              <Text style={[styles.small, { color: muted }]}>{t('sound_catalog_size')}</Text>
            </View>
            <TouchableOpacity sound="close" onPress={close} style={styles.headerButton} accessibilityLabel={t('sound_close')}>
              <Ionicons name="close" size={23} color={text} />
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={styles.content}>
            {pending ? <View style={[styles.gate, { backgroundColor: surface, borderColor: border }]}>
              <Text style={styles.gateEmoji}>🔊</Text>
              <Text style={[styles.title, { color: text, textAlign: 'center' }]}>{changeLabel(pending)}</Text>
              <Text style={[styles.help, { color: muted, textAlign: 'center' }]}>{t('sound_unlock_help')}</Text>
              <TouchableOpacity sound="primary" onPress={() => { void watchAd(); }} disabled={!!adStatus || applying}
                accessibilityState={{ busy: !!adStatus }} style={[styles.cta, { backgroundColor: '#C8F31D' }]}>
                {adStatus ? <ActivityIndicator color="#172009" /> : <Ionicons name="play-circle" size={22} color="#172009" />}
                <Text style={styles.ctaLabel}>{t(adStatus ? 'sound_ad_loading' : 'sound_watch_ad')}</Text>
              </TouchableOpacity>
              <TouchableOpacity sound="open" onPress={() => { close(); openPaywall('button_sounds'); }} disabled={!!adStatus}
                style={[styles.cta, { backgroundColor: isDarkMode ? '#293541' : '#EDF2EC' }]}>
                <Ionicons name="sparkles" size={19} color={accent} /><Text style={[styles.label, { color: text }]}>{t('sound_go_pro')}</Text>
              </TouchableOpacity>
            </View> : <>
              {!action && <>
                <View style={[styles.enabledRow, { backgroundColor: surface }]}>
                  <View style={{ flex: 1 }}><Text style={[styles.label, { color: text }]}>{t('sound_enabled')}</Text>
                    <Text style={[styles.small, { color: muted }]}>{isPro ? t('sound_pro_included') : t('sound_free_help')}</Text></View>
                  <Switch sound={true} value={enabled} onValueChange={value => { void setEnabled(value); }}
                    accessibilityLabel={t('sound_enabled')} trackColor={{ true: '#9CC400', false: border }} />
                </View>
                <View style={[styles.tabs, { backgroundColor: surface }]}>
                  {(['themes', 'actions'] as const).map(value => <TouchableOpacity key={value} sound="select" onPress={() => setTab(value)}
                    accessibilityRole="tab" accessibilityState={{ selected: tab === value }} style={[styles.tab, tab === value && { backgroundColor: '#C8F31D' }]}>
                    <Text style={[styles.label, { color: tab === value ? '#172009' : muted }]}>{t(`sound_${value}`)}</Text>
                  </TouchableOpacity>)}
                </View>
              </>}
              {!enabled && <Text style={[styles.help, { color: muted }]}>{t('sound_muted_hint')}</Text>}
              {action ? <>
                <Text style={[styles.help, { color: muted }]}>{t('sound_action_help')}</Text>
                {choiceRow(`${t('sound_follow_theme')} · ${t(activeTheme.label)}`, preferences.overrides[action] === undefined,
                  () => requestChange({ type: 'action', kind: action, choice: undefined }))}
                {choiceRow(t('sound_silent'), preferences.overrides[action] === 'silent',
                  () => requestChange({ type: 'action', kind: action, choice: 'silent' }))}
                {SOUND_THEMES.map(theme => <View key={theme.id}>
                  <TouchableOpacity sound={expanded === theme.id ? 'close' : 'open'} onPress={() => setExpanded(expanded === theme.id ? null : theme.id)} style={[styles.groupHeader, { borderBottomColor: border }]}
                    accessibilityState={{ expanded: expanded === theme.id }}>
                    <Text style={[styles.label, { color: text, flex: 1 }]}>{theme.emoji} {t(theme.label)}</Text>
                    <Ionicons name={expanded === theme.id ? 'chevron-up' : 'chevron-down'} size={17} color={muted} />
                  </TouchableOpacity>
                  {expanded === theme.id && (Object.keys(SOUND_EFFECTS) as SoundEffectId[]).filter(effect => SOUND_EFFECTS[effect].theme === theme.id).map(effect => (
                    <React.Fragment key={effect}>{choiceRow(t(SOUND_EFFECTS[effect].label), resolveButtonSound(action, preferences) === effect,
                      () => requestChange({ type: 'action', kind: action, choice: effect }), effect)}</React.Fragment>
                  ))}
                </View>)}
              </> : tab === 'themes' ? <>
                <Text style={[styles.help, { color: muted }]}>{t('sound_theme_help')}</Text>
                <View style={styles.grid}>
                  {SOUND_THEMES.map(theme => {
                    const selected = preferences.theme === theme.id;
                    return <View key={theme.id} style={[styles.themeCard, { backgroundColor: surface, borderColor: selected ? accent : border }]}>
                      <TouchableOpacity sound={false} onPress={() => requestChange({ type: 'theme', theme: theme.id })} disabled={applying}
                        accessibilityRole="button" accessibilityLabel={`${t('sound_apply_theme')}: ${t(theme.label)}`} style={styles.themeSelect}>
                        <View style={styles.themeTop}><Text style={styles.emoji}>{theme.emoji}</Text>
                          <Ionicons name={selected ? 'checkmark-circle' : theme.id === 'classic' || isPro ? 'radio-button-off' : 'lock-closed-outline'} size={19} color={selected ? accent : muted} /></View>
                        <Text style={[styles.label, { color: text }]}>{t(theme.label)}</Text>
                        <Text style={[styles.small, { color: muted, marginTop: 4 }]}>{t(selected ? Object.keys(preferences.overrides).length ? 'sound_customized' : 'sound_active' : 'sound_apply_theme')}</Text>
                      </TouchableOpacity>
                      <View style={[styles.previewRow, { borderTopColor: border }]}>
                        <Text style={[styles.small, { color: muted }]}>{t('sound_preview')}</Text>
                        {playButton(theme.cues.complete)}
                      </View>
                    </View>;
                  })}
                </View>
              </> : <>
                <Text style={[styles.help, { color: muted }]}>{t('sound_actions_help')}</Text>
                {BUTTON_SOUND_KINDS.map(kind => <TouchableOpacity key={kind} sound="open" onPress={() => { setAction(kind); setExpanded(preferences.theme); setNotice(''); }}
                  style={[styles.actionRow, { backgroundColor: surface, borderColor: border }]}>
                  <View style={{ flex: 1 }}><Text style={[styles.label, { color: text }]}>{t(`sound_action_${kind.replace(/-/g, '_')}`)}</Text>
                    <Text style={[styles.small, { color: muted, marginTop: 4 }]}>{choiceLabel(resolveButtonSound(kind, preferences))}</Text></View>
                  {preferences.overrides[kind] !== undefined && <Ionicons name="options" size={17} color={accent} />}
                  <Ionicons name="chevron-forward" size={19} color={muted} />
                </TouchableOpacity>)}
              </>}
              {!action && <TouchableOpacity sound="confirm" onPress={() => requestChange({ type: 'theme', theme: 'classic' })} disabled={applying}
                style={[styles.cta, { borderWidth: 1, borderColor: border }]}>
                <Ionicons name="refresh" size={18} color={muted} /><Text style={[styles.label, { color: muted }]}>{t('sound_reset')}</Text>
              </TouchableOpacity>}
            </>}
            {applying && <ActivityIndicator style={{ marginTop: 12 }} color={accent} />}
            {!!notice && <Text accessibilityLiveRegion="polite" style={[styles.notice, { color: text }]}>{notice}</Text>}
          </ScrollView>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,.65)', justifyContent: 'flex-end', alignItems: 'center' },
  sheet: { width: '100%', maxWidth: 620, height: '94%', borderTopLeftRadius: 26, borderTopRightRadius: 26, overflow: 'hidden' },
  header: { flexDirection: 'row', alignItems: 'center', padding: 18, gap: 8, borderBottomWidth: 1 },
  headerButton: { padding: 8, minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  content: { padding: 18, paddingBottom: 28 }, title: { fontSize: 21, fontWeight: '800' },
  label: { fontSize: 14, fontWeight: '700' }, small: { fontSize: 12, lineHeight: 17 },
  help: { fontSize: 13, lineHeight: 20, marginBottom: 16 },
  enabledRow: { flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 16, gap: 14, marginBottom: 16 },
  tabs: { flexDirection: 'row', borderRadius: 14, padding: 4, gap: 4, marginBottom: 18 },
  tab: { flex: 1, paddingVertical: 12, alignItems: 'center', borderRadius: 11 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 12 },
  themeCard: { width: '48%', borderWidth: 1, borderRadius: 18, overflow: 'hidden' },
  themeSelect: { padding: 14, minHeight: 116 }, themeTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  emoji: { fontSize: 29 }, previewRow: { borderTopWidth: 1, paddingHorizontal: 12, paddingVertical: 6, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  play: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  actionRow: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 16, borderRadius: 15, borderWidth: 1, marginBottom: 9 },
  groupHeader: { flexDirection: 'row', alignItems: 'center', paddingVertical: 18, borderBottomWidth: 1, marginBottom: 8 },
  choice: { flexDirection: 'row', alignItems: 'center', borderRadius: 14, borderWidth: 1, paddingRight: 6, marginBottom: 9 },
  choiceMain: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14, minHeight: 58 },
  cta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9, padding: 16, minHeight: 52, borderRadius: 15, marginTop: 14 },
  ctaLabel: { fontSize: 14, fontWeight: '800', color: '#172009', flexShrink: 1 },
  gate: { borderWidth: 1, borderRadius: 22, padding: 20, gap: 12 }, gateEmoji: { fontSize: 50, textAlign: 'center' },
  notice: { fontSize: 13, lineHeight: 20, marginTop: 14, padding: 12, textAlign: 'center' },
});
