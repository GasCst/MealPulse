import type { LanguageCode } from '@/constants/translations';
import { isNeapolitanVoice } from '@/services/voiceTextStyle';

export interface MorningBriefingSnapshot {
  dateKey: string;
  targetCalories: number;
  eatenCalories: number;
  burnedCalories: number;
  proteinLeft: number;
  includeBurnedInBudget: boolean;
}

// Shared by the homepage ring and spoken briefing, including the activity setting.
export function calculateCalorieBudget(target: number, eaten: number, burned: number, includeBurned: boolean) {
  const effectiveTarget = target + (includeBurned ? burned : 0);
  return { effectiveTarget, remainingCalories: Math.max(0, effectiveTarget - eaten) };
}

export function briefingContextKey(snapshot: MorningBriefingSnapshot, voiceId: string, language: LanguageCode): string {
  return JSON.stringify([snapshot.dateKey, snapshot.targetCalories, snapshot.eatenCalories,
    snapshot.burnedCalories, snapshot.proteinLeft, snapshot.includeBurnedInBudget, voiceId, language]);
}

export function morningBriefingFacts(snapshot: MorningBriefingSnapshot, voiceId: string, language: LanguageCode): string {
  const { eatenCalories: eaten, burnedCalories: burned, proteinLeft: protein } = snapshot;
  const { remainingCalories: remaining } = calculateCalorieBudget(
    snapshot.targetCalories, eaten, burned, snapshot.includeBurnedInBudget
  );
  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const todayWords = { it: 'Oggi', en: 'Today', es: 'Hoy', fr: "Aujourd’hui", de: 'Heute', zh: '今天', ja: '今日' };
  const period = snapshot.dateKey === today ? todayWords[language]
    : new Date(`${snapshot.dateKey}T12:00:00`).toLocaleDateString(language, { day: 'numeric', month: 'long', year: 'numeric' });
  if (language === 'it' && isNeapolitanVoice(voiceId)) {
    return `${snapshot.dateKey === today ? 'Oje' : period}: hai magnato ${eaten} calorie e ne hai bruciate ${burned} cu 'o movimento. Te restano ${remaining} calorie e ${protein} grammi 'e proteine.`;
  }
  const facts: Record<LanguageCode, string> = {
    it: `${period}: ${eaten} calorie assunte, ${burned} bruciate con l’attività. Restano ${remaining} calorie e ${protein} grammi di proteine.`,
    en: `${period}: ${eaten} calories eaten, ${burned} burned through activity. You have ${remaining} calories and ${protein} grams of protein remaining.`,
    es: `${period}: ${eaten} calorías consumidas, ${burned} quemadas con actividad. Quedan ${remaining} calorías y ${protein} gramos de proteína.`,
    fr: `${period} : ${eaten} calories consommées, ${burned} brûlées par l’activité. Il reste ${remaining} calories et ${protein} grammes de protéines.`,
    de: `${period}: ${eaten} Kalorien gegessen, ${burned} durch Bewegung verbrannt. Es bleiben ${remaining} Kalorien und ${protein} Gramm Protein.`,
    zh: `${period}：已摄入${eaten}卡路里，活动消耗${burned}卡路里。还剩${remaining}卡路里和${protein}克蛋白质。`,
    ja: `${period}：摂取${eaten}キロカロリー、活動で消費${burned}キロカロリー。残りは${remaining}キロカロリーとタンパク質${protein}グラムです。`,
  };
  return facts[language];
}

export function briefingEncouragement(voiceId: string, language: LanguageCode): string {
  if (language === 'it' && isNeapolitanVoice(voiceId)) return "Jamme, 'a costanza conta!";
  const italian: Record<string, string> = {
    chef_sarcastico: 'Un passo alla volta, con disciplina!',
    diva_ironica: 'Continua con costanza, darling!',
    roastmaster: 'Daje, un passo alla volta!',
    if_sara: 'Continua così, bestie!',
  };
  const phrases: Record<LanguageCode, string> = {
    it: italian[voiceId] || 'Un passo alla volta!', en: 'One step at a time!',
    es: '¡Paso a paso!', fr: 'Un pas à la fois !', de: 'Schritt für Schritt!',
    zh: '一步一步来！', ja: '一歩ずつ進もう！',
  };
  return phrases[language];
}
