import AsyncStorage from '@react-native-async-storage/async-storage';
import { LanguageCode, SUPPORTED_LANGUAGES } from '@/constants/translations';

const NEAPOLITAN_IDS = new Set(['zio_italiano', 'zio_napoletano', 'napoletano', 'im_nicola']);
const LANGUAGE_NAMES: Record<LanguageCode, string> = {
  it: 'italiano', en: 'inglese', es: 'spagnolo', fr: 'francese',
  de: 'tedesco', zh: 'cinese mandarino', ja: 'giapponese',
};

export function isNeapolitanVoice(voiceId: string): boolean {
  return NEAPOLITAN_IDS.has(voiceId.toLowerCase());
}

export async function getVoiceLanguage(): Promise<LanguageCode> {
  try {
    const saved = await AsyncStorage.getItem('@mealpulse_language_v2');
    if (SUPPORTED_LANGUAGES.some((item) => item.code === saved)) return saved as LanguageCode;
  } catch {}
  return 'it';
}

export function spokenTextRules(voiceId: string, language: LanguageCode): string {
  const dialect = language === 'it' && isNeapolitanVoice(voiceId);
  return `LINGUA E DIZIONE:
${dialect
    ? "Scrivi in napoletano colloquiale comprensibile, non in italiano con una sola esclamazione dialettale. Usa una sintassi coerente: jamme, nun, staje, 'o, 'a, 'e quando pertinenti. Non imitare suoni con ortografie inventate e non ripetere sempre 'Maronna' o 'guagliò'."
    : `Scrivi in ${LANGUAGE_NAMES[language]}, rispettando la lingua scelta dall'utente.`}
Usa frasi brevi, punti e virgole naturali. Evita puntini di sospensione, indicazioni di scena, emoji e markdown.
Mantieni esatti nomi, numeri e dati nutrizionali. Non inventare dati, diagnosi o consigli compensatori.
Restituisci soltanto il testo da pronunciare, senza virgolette esterne.`;
}

export function cleanSpokenText(text: string): string {
  // Apostrophes at the start of Neapolitan words ('o, 'a) are meaningful.
  return text.replace(/^["«]+|["»]+$/g, '').replace(/…|\.{2,}/g, '.')
    .replace(/([!?])\.+/g, '$1').replace(/\s+/g, ' ').trim();
}

export function speechCacheKey(text: string, voiceId: string, language: string): string {
  return JSON.stringify(['voice-v3', voiceId, language, cleanSpokenText(text)]);
}

type CoachEvent = 'morning' | 'water' | 'recap' | 'streak' | 'food';
export function coachFallback(
  event: CoachEvent, language: LanguageCode, voiceId: string,
  data: { calories?: number; protein?: number; target?: number; glasses?: number; days?: number; food?: string },
): string {
  const { calories = 0, protein = 0, target = 0, glasses = 0, days = 0, food = '' } = data;
  if (language === 'it' && isNeapolitanVoice(voiceId)) {
    switch (event) {
      case 'morning': return `Buongiorno, guagliò! Oje tiene ${calories} calorie e ${protein} grammi 'e proteine. Jamme, magne buono!`;
      case 'water': return glasses > 0
        ? `Jamme, guagliò! Te mancano ancora ${glasses} bicchiere d'acqua. Nun te scurdà 'e vevere.`
        : `Bravo, guagliò! Pure ll'acqua è a posto. Accussì se fa!`;
      case 'recap': return `Oje hai segnato ${calories} calorie, cu 'n obiettivo 'e ${target}. Jamme, 'a costanza conta!`;
      case 'streak': return `${days} juorne 'e fila, guagliò! Staje facenno 'nu lavoro buono. Nun te fermà!`;
      case 'food': return `${food}: ${calories} calorie. Jamme, guagliò, mo 'o tenimme segnato!`;
    }
  }
  const phrases: Record<LanguageCode, Record<CoachEvent, string>> = {
    it: { morning: `Buongiorno! Oggi ${calories} calorie e ${protein} grammi di proteine. Un passo alla volta!`, water: glasses > 0 ? `Ottimo! Mancano ${glasses} bicchieri d'acqua all'obiettivo.` : 'Obiettivo acqua raggiunto. Ottimo lavoro!', recap: `Oggi hai registrato ${calories} calorie su un obiettivo di ${target}. Continua con costanza!`, streak: `${days} giorni consecutivi. La tua costanza si vede!`, food: `${food}: ${calories} calorie registrate. Un pasto alla volta!` },
    en: { morning: `Good morning! Today: ${calories} calories and ${protein} grams of protein. One step at a time!`, water: glasses > 0 ? `Nice! ${glasses} glasses of water left to reach your goal.` : 'Water goal reached. Great work!', recap: `Today you logged ${calories} calories, with a goal of ${target}. Keep going!`, streak: `${days} days in a row. Your consistency shows!`, food: `${food}: ${calories} calories logged. One meal at a time!` },
    es: { morning: `¡Buenos días! Hoy: ${calories} calorías y ${protein} gramos de proteína. ¡Paso a paso!`, water: glasses > 0 ? `¡Bien! Faltan ${glasses} vasos de agua para tu objetivo.` : '¡Objetivo de agua alcanzado! ¡Buen trabajo!', recap: `Hoy registraste ${calories} calorías, con un objetivo de ${target}. ¡Sigue así!`, streak: `${days} días seguidos. ¡Se nota tu constancia!`, food: `${food}: ${calories} calorías registradas. ¡Una comida a la vez!` },
    fr: { morning: `Bonjour ! Aujourd'hui : ${calories} calories et ${protein} grammes de protéines. Un pas à la fois !`, water: glasses > 0 ? `Bravo ! Encore ${glasses} verres d'eau pour ton objectif.` : "Objectif d'eau atteint. Bravo !", recap: `Aujourd'hui, ${calories} calories enregistrées pour un objectif de ${target}. Continue !`, streak: `${days} jours de suite. Ta régularité se voit !`, food: `${food} : ${calories} calories enregistrées. Un repas à la fois !` },
    de: { morning: `Guten Morgen! Heute: ${calories} Kalorien und ${protein} Gramm Protein. Schritt für Schritt!`, water: glasses > 0 ? `Gut gemacht! Noch ${glasses} Gläser Wasser bis zum Ziel.` : 'Wasserziel erreicht. Gut gemacht!', recap: `Heute ${calories} Kalorien erfasst, bei einem Ziel von ${target}. Bleib dran!`, streak: `${days} Tage in Folge. Deine Ausdauer zeigt sich!`, food: `${food}: ${calories} Kalorien erfasst. Eine Mahlzeit nach der anderen!` },
    zh: { morning: `早上好！今天的目标是${calories}卡路里和${protein}克蛋白质。一步一步来！`, water: glasses > 0 ? `做得好！距离目标还差${glasses}杯水。` : '饮水目标达成，做得好！', recap: `今天记录了${calories}卡路里，目标是${target}卡路里。继续保持！`, streak: `已经连续${days}天了，你的坚持很棒！`, food: `${food}：已记录${calories}卡路里。每餐都算数！` },
    ja: { morning: `おはよう！今日の目標は${calories}キロカロリーとタンパク質${protein}グラム。一歩ずつ進もう！`, water: glasses > 0 ? `いいね！目標まで水はあと${glasses}杯。` : '水分補給の目標達成。よくできました！', recap: `今日は${calories}キロカロリーを記録。目標は${target}キロカロリー。続けよう！`, streak: `${days}日連続。継続の成果が出ているね！`, food: `${food}：${calories}キロカロリーを記録。一食ずつ進もう！` },
  };
  return phrases[language][event];
}
