import { TouchableOpacity } from '@/components/ui/FeedbackPressable';
import React, { useState, useMemo } from 'react';
import { Modal, View, Text, TextInput, FlatList, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/context/ThemeContext';

export interface ModelVoiceItem {
  id: string;
  name: string;
  gender: 'female' | 'male' | 'character';
  category: 'model_default' | 'roast_character';
  emoji: string;
  desc: string;
  personality: string;
  timbre: string;
  cadence: string;
  styleTag: string;
  isProOnly?: boolean;
}

// 63 Voci disponibili (5 personaggi comici esclusivi + 58 voci neurali XTTS-v2) con personalità dettagliata
export const DEFAULT_MODEL_VOICES: ModelVoiceItem[] = [
  // 5 PERSONAGGI ICONICI & COMICI
  {
    id: 'zio_italiano',
    name: 'Zio Napoletano',
    gender: 'character',
    category: 'roast_character',
    emoji: '🤌',
    desc: 'Personaggio • Uè wagliò! Verace e passionale',
    personality: 'Passionale, viscerale, difensore sacro della buona tavola in dialetto napoletano',
    timbre: 'Caldo, espressivo, teatrale',
    cadence: 'Viscerale con ritmo partenopeo',
    styleTag: 'Zio Napoletano',
    isProOnly: false,
  },
  {
    id: 'chef_sarcastico',
    name: 'Chef Gordon',
    gender: 'character',
    category: 'roast_character',
    emoji: '👨‍🍳',
    desc: 'Personaggio • Spietato e severo',
    personality: 'Tiranno Michelin spietato, furioso ed esigente sulla disciplina calorica',
    timbre: 'Autoritario, tagliente e severo',
    cadence: 'Incalzante, tagliente e fulminea',
    styleTag: 'Chef Furioso',
    isProOnly: true,
  },
  {
    id: 'diva_ironica',
    name: 'Diva Snob',
    gender: 'character',
    category: 'roast_character',
    emoji: '💅',
    desc: 'Personaggio • Milanese snob e tagliente',
    personality: 'Milanese fashion influencer snob, disgustata dai carboidrati della vergogna',
    timbre: 'Sofisticato, distaccato, vocale chiusa',
    cadence: 'Lenta e snob con battute ciniche',
    styleTag: 'Diva Snob',
    isProOnly: true,
  },
  {
    id: 'roastmaster',
    name: 'Stand-up Comico',
    gender: 'character',
    category: 'roast_character',
    emoji: '⚡',
    desc: 'Personaggio • Comico romano da cabaret',
    personality: 'Comico romano da cabaret disincantato, cinico e tagliente',
    timbre: 'Romano sornione e graffiante',
    cadence: 'Ad orologeria con punchline immediata',
    styleTag: 'Stand-up Comedian',
    isProOnly: true,
  },
  {
    id: 'if_sara',
    name: 'Sara Gen-Z',
    gender: 'character',
    category: 'roast_character',
    emoji: '🎙️',
    desc: 'Personaggio • Fitness bestie e meme',
    personality: 'Fitness bestie meme lover senza filtri e meme logic',
    timbre: 'Giovanile, vivace ed energico',
    cadence: 'Veloce, meme-driven e diretta',
    styleTag: 'Gen-Z Bestie',
    isProOnly: true,
  },
  // 30 VOCI FEMMINILI
  {
    id: 'claribel_dervla',
    name: 'Claribel Dervla',
    gender: 'female',
    category: 'model_default',
    emoji: '🤖',
    desc: 'Femminile • Voce sintetica chiara',
    personality: 'Analitica, glaciale e calcolatrice',
    timbre: 'Metallico, sintetico ad alta frequenza',
    cadence: 'Scandita, precisa, ritmo incalzante',
    styleTag: 'Cyberpunk AI',
    isProOnly: true,
  },
  {
    id: 'daisy_studious',
    name: 'Daisy Studious',
    gender: 'female',
    category: 'model_default',
    emoji: '🤖',
    desc: 'Femminile • Timbro calmo e accademico',
    personality: 'Posata, accademica e severa sui grammi',
    timbre: 'Chiaro, pulito da assistente vocale',
    cadence: 'Pacata, pause calcolate e riflessiva',
    styleTag: 'Docente AI',
    isProOnly: true,
  },
  {
    id: 'gracie_wise',
    name: 'Gracie Wise',
    gender: 'female',
    category: 'model_default',
    emoji: '🤖',
    desc: 'Femminile • Robotico espressivo',
    personality: 'Sarcastica, pungente e brillante',
    timbre: 'Risonante, brillante con taglio ironico',
    cadence: 'Incalzante con punchline fulminea',
    styleTag: 'Robot Comico',
    isProOnly: true,
  },
  {
    id: 'tammie_ema',
    name: 'Tammie Ema',
    gender: 'female',
    category: 'model_default',
    emoji: '🤖',
    desc: 'Femminile • Tono iperattivo ed energico',
    personality: 'Iperattiva, frizzante ed entusiasta del fitness',
    timbre: 'Luminoso, squillante e ultra dinamico',
    cadence: 'Veloce, ritmica ed esplosiva',
    styleTag: 'Coach Fitness',
    isProOnly: true,
  },
  {
    id: 'alison_dietlinde',
    name: 'Alison Dietlinde',
    gender: 'female',
    category: 'model_default',
    emoji: '🤖',
    desc: 'Femminile • Neutro e formale',
    personality: 'Istituzionale, impeccabile e senza sconti',
    timbre: 'Neutro, compatto da annunciatrice radiotelevisiva',
    cadence: 'Lineare, metronomica e pulita',
    styleTag: 'Annunciatrice TG',
    isProOnly: true,
  },
  {
    id: 'ana_florence',
    name: 'Ana Florence',
    gender: 'female',
    category: 'model_default',
    emoji: '🤖',
    desc: 'Femminile • Timbro caldo e avvolgente',
    personality: 'Calda, empatica e suadente',
    timbre: 'Rotondo, morbido, vellutato',
    cadence: 'Fluida, modulata e rilassata',
    styleTag: 'Calm & Zen',
    isProOnly: true,
  },
  {
    id: 'annmarie_nele',
    name: 'Annmarie Nele',
    gender: 'female',
    category: 'model_default',
    emoji: '🤖',
    desc: 'Femminile • Sintetico bilanciato',
    personality: 'Razionale, efficiente e diretta all\'obiettivo',
    timbre: 'Sintetico moderno equilibrato',
    cadence: 'Costante e fluida senza sbavature',
    styleTag: 'AI Operativa',
    isProOnly: true,
  },
  {
    id: 'asya_anara',
    name: 'Asya Anara',
    gender: 'female',
    category: 'model_default',
    emoji: '🤖',
    desc: 'Femminile • Delicato ed etereo',
    personality: 'Misteriosa, eterea e contemplativa',
    timbre: 'Sussurrato, soffuso, sognante',
    cadence: 'Lenta, armonica con pause d\'atmosfera',
    styleTag: 'Sci-Fi Spazio',
    isProOnly: true,
  },
  {
    id: 'brenda_stern',
    name: 'Brenda Stern',
    gender: 'female',
    category: 'model_default',
    emoji: '🤖',
    desc: 'Femminile • Deciso e inflessibile',
    personality: 'Rigida, autoritaria e severa sul cibo spazzatura',
    timbre: 'Secco, perentorio e profondo',
    cadence: 'Tagliente, battuta corta e decisa',
    styleTag: 'Sergente AI',
    isProOnly: true,
  },
  {
    id: 'gitta_nikolina',
    name: 'Gitta Nikolina',
    gender: 'female',
    category: 'model_default',
    emoji: '🤖',
    desc: 'Femminile • Veloce e ritmico',
    personality: 'Scioccata, ansiosa e teatrale di fronte alle calorie',
    timbre: 'Acuto, modulato, dinamico',
    cadence: 'Raffica frenetica e scattante',
    styleTag: 'Reality Drama',
    isProOnly: true,
  },
  {
    id: 'henriette_usha',
    name: 'Henriette Usha',
    gender: 'female',
    category: 'model_default',
    emoji: '🤖',
    desc: 'Femminile • Timbro squillante e operistico',
    personality: 'Melodrammatica, espressiva e vulcanica',
    timbre: 'Squillante, operistico e vivace',
    cadence: 'Variazioni tonali ampie e cantate',
    styleTag: 'Teatro d\'Opera',
    isProOnly: true,
  },
  {
    id: 'sofia_hellen',
    name: 'Sofia Hellen',
    gender: 'female',
    category: 'model_default',
    emoji: '🤖',
    desc: 'Femminile • Armonioso e fluido',
    personality: 'Sofisticata, rilassata e rassicurante',
    timbre: 'Caldo, armonioso e naturale',
    cadence: 'Scorrevole, elegante e serena',
    styleTag: 'Lifestyle Guide',
    isProOnly: true,
  },
  {
    id: 'tammy_grit',
    name: 'Tammy Grit',
    gender: 'female',
    category: 'model_default',
    emoji: '🤖',
    desc: 'Femminile • Energico e senza filtri',
    personality: 'Pragmatica, dura e senza mezze misure',
    timbre: 'Graffiante, solido e deciso',
    cadence: 'Diretta, senza esitazioni o scuse',
    styleTag: 'Grit & Action',
    isProOnly: true,
  },
  {
    id: 'tanja_adelina',
    name: 'Tanja Adelina',
    gender: 'female',
    category: 'model_default',
    emoji: '🤖',
    desc: 'Femminile • Calmo e rassicurante',
    personality: 'Paziente, protettiva e incoraggiante',
    timbre: 'Morbido, avvolgente e rotondo',
    cadence: 'Ritmata come un respiro guidato',
    styleTag: 'Wellness Coach',
    isProOnly: true,
  },
  {
    id: 'vjollca_johnnie',
    name: 'Vjollca Johnnie',
    gender: 'female',
    category: 'model_default',
    emoji: '🤖',
    desc: 'Femminile • Modulazione profonda e noir',
    personality: 'Disincantata, noir, cinica e penetrante',
    timbre: 'Basso femminile, scuro e sensuale',
    cadence: 'Lenta, fumo di sigaretta e amara verità',
    styleTag: 'Detective Noir',
    isProOnly: true,
  },
  {
    id: 'nova_hogarth',
    name: 'Nova Hogarth',
    gender: 'female',
    category: 'model_default',
    emoji: '🤖',
    desc: 'Femminile • Stile Cyberpunk / AI',
    personality: 'Futuristica, sintetica e distopica',
    timbre: 'Riverbero metallico e spaziale ad alta definizione',
    cadence: 'Codificata a impulsi ritmici digitali',
    styleTag: 'Cyborg 2099',
    isProOnly: true,
  },
  {
    id: 'maja_ruoho',
    name: 'Maja Ruoho',
    gender: 'female',
    category: 'model_default',
    emoji: '🤖',
    desc: 'Femminile • Tono nordico essenziale',
    personality: 'Glaciale, schematica ed essenziale',
    timbre: 'Cristallino, freddo, nordico',
    cadence: 'Silenzio tra le parole, minimalista',
    styleTag: 'Nordic Minimal',
    isProOnly: true,
  },
  {
    id: 'uta_obando',
    name: 'Uta Obando',
    gender: 'female',
    category: 'model_default',
    emoji: '🤖',
    desc: 'Femminile • Ritmo cadenzato da ispezione',
    personality: 'Puntigliosa, critica e attenta al singolo grammo',
    timbre: 'Metallico secco e penetrante',
    cadence: 'Cadenzata al secondo, perentoria',
    styleTag: 'Ispettrice Food',
    isProOnly: true,
  },
  {
    id: 'lidiya_szekeres',
    name: 'Lidiya Szekeres',
    gender: 'female',
    category: 'model_default',
    emoji: '🤖',
    desc: 'Femminile • Timbro narrativo epico',
    personality: 'Epica, leggendaria e solenne',
    timbre: 'Pieno, maestoso e teatrale',
    cadence: 'Narrativa da audiolibro fantasy',
    styleTag: 'Narratrice Epica',
    isProOnly: true,
  },
  {
    id: 'chandra_macfarland',
    name: 'Chandra MacFarland',
    gender: 'female',
    category: 'model_default',
    emoji: '🤖',
    desc: 'Femminile • Tono autorevole corporate',
    personality: 'Executive, implacabile e sicura di sé',
    timbre: 'Fermo, autorevole e cristallino',
    cadence: 'Da presentazione board aziendale',
    styleTag: 'CEO Persona',
    isProOnly: true,
  },
  {
    id: 'szofi_granger',
    name: 'Szofi Granger',
    gender: 'female',
    category: 'model_default',
    emoji: '🤖',
    desc: 'Femminile • Sci-Fi futuristico e brillante',
    personality: 'Hacker geniale, ribelle e sarcastica',
    timbre: 'Elettronico, pulito e moderno',
    cadence: 'Ritmata, brillante e imprevedibile',
    styleTag: 'Cyber Hacker',
    isProOnly: true,
  },
  {
    id: 'camilla_holmstrom',
    name: 'Camilla Holmström',
    gender: 'female',
    category: 'model_default',
    emoji: '🤖',
    desc: 'Femminile • Cristallino e nitido da laboratorio',
    personality: 'Perfezionista, scientifica e pura',
    timbre: 'Vetro, purezza assoluta, nitidissimo',
    cadence: 'Scansione scientifica e chimica',
    styleTag: 'Lab Scientist',
    isProOnly: true,
  },
  {
    id: 'lilya_stainthorpe',
    name: 'Lilya Stainthorpe',
    gender: 'female',
    category: 'model_default',
    emoji: '🤖',
    desc: 'Femminile • Voce morbida e accogliente',
    personality: 'Accogliente, dolce ma con giudizio critico',
    timbre: 'Caldo, pastoso e confortevole',
    cadence: 'Discorsiva, morbida e confidenziale',
    styleTag: 'Mente Positiva',
    isProOnly: true,
  },
  {
    id: 'zofija_kendrick',
    name: 'Zofija Kendrick',
    gender: 'female',
    category: 'model_default',
    emoji: '🤖',
    desc: 'Femminile • Ritmato e provocatorio',
    personality: 'Ironica, trendy e provocatoria sui meme food',
    timbre: 'Fresco, giovanile e spigliato',
    cadence: 'TikTok pacing, pause d\'effetto',
    styleTag: 'Trendsetter',
    isProOnly: true,
  },
  {
    id: 'narelle_moon',
    name: 'Narelle Moon',
    gender: 'female',
    category: 'model_default',
    emoji: '🤖',
    desc: 'Femminile • Etereo e suadente',
    personality: 'Mistica, ipnotica e profetica',
    timbre: 'Vellutato, sognante, fluttuante',
    cadence: 'Lenta e ondulata come le onde',
    styleTag: 'Oracle AI',
    isProOnly: true,
  },
  {
    id: 'barbora_maclean',
    name: 'Barbora MacLean',
    gender: 'female',
    category: 'model_default',
    emoji: '🤖',
    desc: 'Femminile • Accademico ed enciclopedico',
    personality: 'Enciclopedica, dotta e pignola',
    timbre: 'Chiaro, controllato e distinto',
    cadence: 'Da saggio accademico, scandita',
    styleTag: 'Enciclopedia AI',
    isProOnly: true,
  },
  {
    id: 'alexandra_hisakawa',
    name: 'Alexandra Hisakawa',
    gender: 'female',
    category: 'model_default',
    emoji: '🤖',
    desc: 'Femminile • Sintetico moderno ultra fast',
    personality: 'Tech-savvy, futurista e sharp',
    timbre: 'Digitale contemporaneo, nitidissimo',
    cadence: 'Snella, veloce e senza orpelli',
    styleTag: 'Tokyo Tech',
    isProOnly: true,
  },
  {
    id: 'alma_maria',
    name: 'Alma María',
    gender: 'female',
    category: 'model_default',
    emoji: '🤖',
    desc: 'Femminile • Dolce e passionale',
    personality: 'Passionale, melodiosa ed espressiva',
    timbre: 'Caldo, armonioso e solare',
    cadence: 'Cadenzata con calore mediterraneo',
    styleTag: 'Anima Calda',
    isProOnly: true,
  },
  {
    id: 'rosemary_okafor',
    name: 'Rosemary Okafor',
    gender: 'female',
    category: 'model_default',
    emoji: '🤖',
    desc: 'Femminile • Intenso, rotondo e potente',
    personality: 'Vibrante, carismatica e travolgente',
    timbre: 'Corposo, avvolgente e profondo',
    cadence: 'Ritmica sincopata e trascinante',
    styleTag: 'Soul Power',
    isProOnly: true,
  },
  {
    id: 'ige_behringer',
    name: 'Ige Behringer',
    gender: 'female',
    category: 'model_default',
    emoji: '🤖',
    desc: 'Femminile • Sintetico sperimentale glitch',
    personality: 'Sperimentale, glitchy e surreale',
    timbre: 'Micro-oscillazioni elettroniche stereo',
    cadence: 'Asimmetrica, spiazzante e d\'avanguardia',
    styleTag: 'Synth Avantgarde',
    isProOnly: true,
  },

  // 28 VOCI MASCHILI
  {
    id: 'andrew_chipper',
    name: 'Andrew Chipper',
    gender: 'male',
    category: 'model_default',
    emoji: '🤖',
    desc: 'Maschile • Voce radiofonica d\'intrattenimento',
    personality: 'Spumeggiante, carismatico e accattivante',
    timbre: 'Radiofonico, caldo, brillante e rotondo',
    cadence: 'Incalzante da conduttore mattutino FM',
    styleTag: 'Radio Host FM',
    isProOnly: true,
  },
  {
    id: 'badr_odhiambo',
    name: 'Badr Odhiambo',
    gender: 'male',
    category: 'model_default',
    emoji: '🤖',
    desc: 'Maschile • Profondo e solenne',
    personality: 'Saggio, solenne e monumentale',
    timbre: 'Basso profondo con risonanza toracica',
    cadence: 'Lenta, meditata e imponente',
    styleTag: 'Saggio Filosofo',
    isProOnly: true,
  },
  {
    id: 'dionisio_schuyler',
    name: 'Dionisio Schuyler',
    gender: 'male',
    category: 'model_default',
    emoji: '🤖',
    desc: 'Maschile • Timbro baritonale aristocratico',
    personality: 'Aristocratico, snob, colto e critico sul junk food',
    timbre: 'Baritonale vellutato e teatrale',
    cadence: 'Ricercata, con pause aristocratiche',
    styleTag: 'Lord Aristocratico',
    isProOnly: true,
  },
  {
    id: 'royston_min',
    name: 'Royston Min',
    gender: 'male',
    category: 'model_default',
    emoji: '🤖',
    desc: 'Maschile • Giovanile, brillante e streamer',
    personality: 'Entusiasta, frizzante e ironico',
    timbre: 'Chiaro, squillante e giovane',
    cadence: 'Veloce, ritmata da gamer/streamer',
    styleTag: 'Tech Streamer',
    isProOnly: true,
  },
  {
    id: 'viktor_eka',
    name: 'Viktor Eka',
    gender: 'male',
    category: 'model_default',
    emoji: '🤖',
    desc: 'Maschile • Calmo, solido ed equilibrato',
    personality: 'Equilibrato, diplomatico e rassicurante',
    timbre: 'Medio, pulito e privo di asperità',
    cadence: 'Costante, chiara e pacificatrice',
    styleTag: 'Consigliere Zen',
    isProOnly: true,
  },
  {
    id: 'abrahan_mack',
    name: 'Abrahan Mack',
    gender: 'male',
    category: 'model_default',
    emoji: '🤖',
    desc: 'Maschile • Tono robotico solido e duro',
    personality: 'Robotico solido, industriale e inflessibile',
    timbre: 'Metallico pesante, sintetico duro',
    cadence: 'A scatti precisi secondo logica booleana',
    styleTag: 'Robot Industriale',
    isProOnly: true,
  },
  {
    id: 'adde_michal',
    name: 'Adde Michal',
    gender: 'male',
    category: 'model_default',
    emoji: '🤖',
    desc: 'Maschile • Telecronista sportivo dinamico',
    personality: 'Elettrico, concitato e dinamico',
    timbre: 'Asciutto, presente e squillante',
    cadence: 'Telecronaca all\'ultimo minuto del match',
    styleTag: 'Telecronista Sport',
    isProOnly: true,
  },
  {
    id: 'baldur_sanjin',
    name: 'Baldur Sanjin',
    gender: 'male',
    category: 'model_default',
    emoji: '🤖',
    desc: 'Maschile • Epico, potente e marziale',
    personality: 'Guerriero epico, tuonante e fiero',
    timbre: 'Graffiante, cavernoso e potente',
    cadence: 'Solenne, marziale e perentoria',
    styleTag: 'Guerriero Epico',
    isProOnly: true,
  },
  {
    id: 'craig_gutsy',
    name: 'Craig Gutsy',
    gender: 'male',
    category: 'model_default',
    emoji: '🤖',
    desc: 'Maschile • Grintoso ed energico senza scuse',
    personality: 'Grintoso, diretto e motivatore spietato',
    timbre: 'Ruvido, energico e presente',
    cadence: 'Pugno allo stomaco, senza scuse',
    styleTag: 'Bootcamp Coach',
    isProOnly: true,
  },
  {
    id: 'damien_black',
    name: 'Damien Black',
    gender: 'male',
    category: 'model_default',
    emoji: '🤖',
    desc: 'Maschile • Tono scuro, cinico e misterioso',
    personality: 'Cupo, enigmatico, sarcastico e glaciale',
    timbre: 'Basso profondo con echi cavernosi',
    cadence: 'Sussurrata e teatrale con pause lunghe',
    styleTag: 'Villain Cinema',
    isProOnly: true,
  },
  {
    id: 'gilberto_mathias',
    name: 'Gilberto Mathias',
    gender: 'male',
    category: 'model_default',
    emoji: '🤖',
    desc: 'Maschile • Caldo, colloquiale e verace',
    personality: 'Affabile, colloquiale e bonario',
    timbre: 'Caldo, confidenziale da amico al bar',
    cadence: 'Spontanea, informale e rilassata',
    styleTag: 'Amico di Sempre',
    isProOnly: true,
  },
  {
    id: 'ilkin_urbano',
    name: 'Ilkin Urbano',
    gender: 'male',
    category: 'model_default',
    emoji: '🤖',
    desc: 'Maschile • Vivace, frenetico e metropolitano',
    personality: 'Scattante, metropolitano e frenetico',
    timbre: 'Chiaro, compatto e vivace',
    cadence: 'Ritmo serrato da traffico all\'ora di punta',
    styleTag: 'Urban Rush',
    isProOnly: true,
  },
  {
    id: 'kazuhiko_atallah',
    name: 'Kazuhiko Atallah',
    gender: 'male',
    category: 'model_default',
    emoji: '🤖',
    desc: 'Maschile • Tecnologico, futurista Sci-Fi',
    personality: 'Cibernetico, futurista e ad alta precisione',
    timbre: 'Sintetico cristallino, modulazione digitale',
    cadence: 'Analisi computazionale millimetrica',
    styleTag: 'Mecha AI Core',
    isProOnly: true,
  },
  {
    id: 'ludvig_milivoj',
    name: 'Ludvig Milivoj',
    gender: 'male',
    category: 'model_default',
    emoji: '🤖',
    desc: 'Maschile • Corporeo, severo e monolitico',
    personality: 'Monolitico, serio e d\'altri tempi',
    timbre: 'Gutturale, cavernoso e corposo',
    cadence: 'Lenta e inesorabile come una roccia',
    styleTag: 'Basso Monolitico',
    isProOnly: true,
  },
  {
    id: 'suad_qasim',
    name: 'Suad Qasim',
    gender: 'male',
    category: 'model_default',
    emoji: '🤖',
    desc: 'Maschile • Elegante, posato e sartoriale',
    personality: 'Elegante, misurato e impeccabile',
    timbre: 'Seta pura, armonico e caldo',
    cadence: 'Scansione melodica e controllata',
    styleTag: 'Maestro di Stile',
    isProOnly: true,
  },
  {
    id: 'torcull_diarmuid',
    name: 'Torcull Diarmuid',
    gender: 'male',
    category: 'model_default',
    emoji: '🤖',
    desc: 'Maschile • Autorevole, militare e deciso',
    personality: 'Comandante militare, inflessibile e asciutto',
    timbre: 'Autoritario, secco e penetrante',
    cadence: 'Ordini marziali, zero chiacchiere',
    styleTag: 'Comandante Militare',
    isProOnly: true,
  },
  {
    id: 'viktor_menelaos',
    name: 'Viktor Menelaos',
    gender: 'male',
    category: 'model_default',
    emoji: '🤖',
    desc: 'Maschile • Neutro, scandito da doppiatore',
    personality: 'Neutro, documentaristico e scientifico',
    timbre: 'Perfettamente bilanciato da doppiatore cinematografico',
    cadence: 'Chiarissima e scandita sillaba per sillaba',
    styleTag: 'Doppiatore Cinema',
    isProOnly: true,
  },
  {
    id: 'zacharie_aimilios',
    name: 'Zacharie Aimilios',
    gender: 'male',
    category: 'model_default',
    emoji: '🤖',
    desc: 'Maschile • Timbro eccentrico e squillante',
    personality: 'Iperattivo, genio instabile e vulcanico',
    timbre: 'Squillante, eccentrico e imprevedibile',
    cadence: 'Accelerazioni improvvise e pause elettriche',
    styleTag: 'Scienziato Pazzo',
    isProOnly: true,
  },
  {
    id: 'filip_traverse',
    name: 'Filip Traverse',
    gender: 'male',
    category: 'model_default',
    emoji: '🤖',
    desc: 'Maschile • Sintetico moderno e corporate',
    personality: 'Moderno, minimal e tech-corporate',
    timbre: 'Pulito, metallico soffuso, elegante',
    cadence: 'Pitch aziendale ad alto impatto',
    styleTag: 'Silicon Valley AI',
    isProOnly: true,
  },
  {
    id: 'damjan_chapman',
    name: 'Damjan Chapman',
    gender: 'male',
    category: 'model_default',
    emoji: '🤖',
    desc: 'Maschile • Basso, cavernoso e cinico',
    personality: 'Cinico, disilluso e ruvido',
    timbre: 'Baritono sporco, fumo e blues',
    cadence: 'Riflessiva, stanca ma micidiale',
    styleTag: 'Detective Privato',
    isProOnly: true,
  },
  {
    id: 'wulf_carlevaro',
    name: 'Wulf Carlevaro',
    gender: 'male',
    category: 'model_default',
    emoji: '🤖',
    desc: 'Maschile • Ruvido, naturale ed espressivo',
    personality: 'Ruvido montanaro, essenziale e genuino',
    timbre: 'Rauco, caldo e naturale',
    cadence: 'Cadenza lenta delle valli alpine',
    styleTag: 'Uomo dei Boschi',
    isProOnly: true,
  },
  {
    id: 'aaron_dreschner',
    name: 'Aaron Dreschner',
    gender: 'male',
    category: 'model_default',
    emoji: '🤖',
    desc: 'Maschile • Chiarissimo da documentario naturalistico',
    personality: 'Divulgatore scientifico, affascinante e rigoroso',
    timbre: 'Cristallino da National Geographic',
    cadence: 'Accattivante, ipnotica da documentario',
    styleTag: 'Documentari BBC',
    isProOnly: true,
  },
  {
    id: 'kumar_dahl',
    name: 'Kumar Dahl',
    gender: 'male',
    category: 'model_default',
    emoji: '🤖',
    desc: 'Maschile • Modulato, caloroso e ritmico',
    personality: 'Ritmico, gioviale e armonico',
    timbre: 'Modulato, caloroso e aperto',
    cadence: 'Cantilenata, piacevole e avvolgente',
    styleTag: 'Buonumore Zen',
    isProOnly: true,
  },
  {
    id: 'eugenio_mataraci',
    name: 'Eugenio Mataracı',
    gender: 'male',
    category: 'model_default',
    emoji: '🤖',
    desc: 'Maschile • Mediterraneo, caloroso e teatrale',
    personality: 'Solare, caloroso e teatrale',
    timbre: 'Mediterraneo, pieno e rotondo',
    cadence: 'Gesticolata, passionale ed enfatica',
    styleTag: 'Calore Mediterraneo',
    isProOnly: true,
  },
  {
    id: 'ferran_simen',
    name: 'Ferran Simen',
    gender: 'male',
    category: 'model_default',
    emoji: '🤖',
    desc: 'Maschile • Timbro narrativo colto e chiaro',
    personality: 'Narratore colto, fine e distaccato',
    timbre: 'Chiaro, nitido e musicale',
    cadence: 'Fluida come un romanzo letterario',
    styleTag: 'Narratore Romanzi',
    isProOnly: true,
  },
  {
    id: 'xavier_hayasaka',
    name: 'Xavier Hayasaka',
    gender: 'male',
    category: 'model_default',
    emoji: '🤖',
    desc: 'Maschile • Robotico ad altissima fedeltà',
    personality: 'Robot ad alta fedeltà, impassibile e perfetto',
    timbre: 'Purissimo synth stereo privo di respiro',
    cadence: 'Clock rate perfetto, zero emozioni umane',
    styleTag: 'Android Pure',
    isProOnly: true,
  },
  {
    id: 'luis_moray',
    name: 'Luis Moray',
    gender: 'male',
    category: 'model_default',
    emoji: '🤖',
    desc: 'Maschile • Tono fermo, solido e protettivo',
    personality: 'Rassicurante, fedele e protettivo',
    timbre: 'Fermo, virile e caldo',
    cadence: 'Pacata, solida e fiduciosa',
    styleTag: 'Guardia del Corpo',
    isProOnly: true,
  },
  {
    id: 'marcos_rudaski',
    name: 'Marcos Rudaski',
    gender: 'male',
    category: 'model_default',
    emoji: '🤖',
    desc: 'Maschile • Profondo, travolgente da trailer',
    personality: 'Ipnotico, potente e travolgente',
    timbre: 'Sub-woofer naturale, profondità abissale',
    cadence: 'Lenta e vibrante che scuote lo schermo',
    styleTag: 'Trailer Cinema',
    isProOnly: true,
  },
];

interface VoiceSelectorModalProps {
  visible: boolean;
  onClose: () => void;
  onSelectVoice: (voice: ModelVoiceItem) => void;
  currentVoiceId: string;
  isPro?: boolean;
  unlockedVoices?: Record<string, boolean>;
}

export const VoiceSelectorModal: React.FC<VoiceSelectorModalProps> = ({
  visible,
  onClose,
  onSelectVoice,
  currentVoiceId,
  isPro = false,
  unlockedVoices = {},
}) => {
  const { colors, isDarkMode } = useTheme();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGenderFilter, setSelectedGenderFilter] = useState<'all' | 'character' | 'female' | 'male'>('all');

  const filteredVoices = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return DEFAULT_MODEL_VOICES.filter((item) => {
      const matchesSearch =
        !q ||
        item.name.toLowerCase().includes(q) ||
        item.desc.toLowerCase().includes(q) ||
        item.id.toLowerCase().includes(q) ||
        item.personality.toLowerCase().includes(q) ||
        item.timbre.toLowerCase().includes(q) ||
        item.cadence.toLowerCase().includes(q) ||
        item.styleTag.toLowerCase().includes(q);

      const matchesGender =
        selectedGenderFilter === 'all' || item.gender === selectedGenderFilter;

      return matchesSearch && matchesGender;
    });
  }, [searchQuery, selectedGenderFilter]);

  const handleSelect = (voice: ModelVoiceItem) => {
    try {
      if (Platform.OS !== 'web') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
    } catch {}
    onSelectVoice(voice);
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.modalBackdrop}>
        <View style={[styles.modalCard, { backgroundColor: isDarkMode ? '#101E17' : '#FFFFFF' }]}>
          {/* Header */}
          <View style={styles.header}>
            <View style={{ flex: 1 }}>
              <View style={styles.titleRow}>
                <Text style={{ fontSize: 22 }}>🤖</Text>
                <Text style={[styles.title, { color: colors.textPrimary }]}>
                  Voci AI del Modello
                </Text>
              </View>
              <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                {DEFAULT_MODEL_VOICES.length} voci neurali native con timbro e personalità uniche
              </Text>
            </View>
            <TouchableOpacity style={styles.closeBtn} sound="close" onPress={onClose} activeOpacity={0.7}>
              <Ionicons name="close" size={22} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Search Bar */}
          <View
            style={[
              styles.searchBar,
              {
                backgroundColor: isDarkMode ? '#1B2E24' : '#F1F6F3',
                borderColor: isDarkMode ? '#2D4B39' : '#E2EBE5',
              },
            ]}
          >
            <Ionicons name="search" size={18} color={colors.textSecondary} />
            <TextInput
              style={[styles.searchInput, { color: colors.textPrimary }]}
              placeholder="Cerca per nome, personalità, timbro o stile..."
              placeholderTextColor={colors.textSecondary}
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoCorrect={false}
              clearButtonMode="while-editing"
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity sound="close" onPress={() => setSearchQuery('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Ionicons name="close-circle" size={18} color={colors.textSecondary} />
              </TouchableOpacity>
            )}
          </View>

          {/* Filter Chips */}
          <View style={styles.filtersRow}>
            <TouchableOpacity
              style={[
                styles.chip,
                selectedGenderFilter === 'all'
                  ? { backgroundColor: colors.coral }
                  : { backgroundColor: isDarkMode ? '#1B2E24' : '#F0F5F2' },
              ]}
              sound="select" onPress={() => setSelectedGenderFilter('all')}
              activeOpacity={0.8}
            >
              <Text
                style={[
                  styles.chipText,
                  { color: selectedGenderFilter === 'all' ? '#FFFFFF' : colors.textSecondary },
                ]}
              >
                Tutte ({DEFAULT_MODEL_VOICES.length})
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.chip,
                selectedGenderFilter === 'character'
                  ? { backgroundColor: colors.coral }
                  : { backgroundColor: isDarkMode ? '#1B2E24' : '#F0F5F2' },
              ]}
              sound="select" onPress={() => setSelectedGenderFilter('character')}
              activeOpacity={0.8}
            >
              <Text
                style={[
                  styles.chipText,
                  { color: selectedGenderFilter === 'character' ? '#FFFFFF' : colors.textSecondary },
                ]}
              >
                🌟 Personaggi (5)
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.chip,
                selectedGenderFilter === 'female'
                  ? { backgroundColor: colors.coral }
                  : { backgroundColor: isDarkMode ? '#1B2E24' : '#F0F5F2' },
              ]}
              sound="select" onPress={() => setSelectedGenderFilter('female')}
              activeOpacity={0.8}
            >
              <Text
                style={[
                  styles.chipText,
                  { color: selectedGenderFilter === 'female' ? '#FFFFFF' : colors.textSecondary },
                ]}
              >
                ♀ Femminili (30)
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.chip,
                selectedGenderFilter === 'male'
                  ? { backgroundColor: colors.coral }
                  : { backgroundColor: isDarkMode ? '#1B2E24' : '#F0F5F2' },
              ]}
              sound="select" onPress={() => setSelectedGenderFilter('male')}
              activeOpacity={0.8}
            >
              <Text
                style={[
                  styles.chipText,
                  { color: selectedGenderFilter === 'male' ? '#FFFFFF' : colors.textSecondary },
                ]}
              >
                ♂ Maschili (28)
              </Text>
            </TouchableOpacity>
          </View>

          {/* Voices List */}
          <FlatList
            data={filteredVoices}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item }) => {
              const isSelected = currentVoiceId === item.id;
              const isLocked = !isPro && !unlockedVoices[item.id];

              return (
                <TouchableOpacity
                  style={[
                    styles.voiceCard,
                    {
                      backgroundColor: isDarkMode ? '#17271E' : '#F9FCFA',
                      borderColor: isSelected
                        ? colors.coral
                        : isDarkMode
                        ? '#243D2F'
                        : '#E6EFE9',
                    },
                    isSelected && styles.voiceCardSelected,
                    isLocked && styles.voiceCardLocked,
                  ]}
                  sound="voice" onPress={() => handleSelect(item)}
                  activeOpacity={0.75}
                >
                  <View style={styles.cardTopRow}>
                    <View
                      style={[
                        styles.avatarBox,
                        { backgroundColor: isDarkMode ? '#22382B' : '#EAF3ED' },
                      ]}
                    >
                      <Text style={{ fontSize: 22 }}>{item.emoji}</Text>
                    </View>

                    <View style={{ flex: 1 }}>
                      <View style={styles.cardHeaderRow}>
                        <Text
                          style={[
                            styles.voiceName,
                            { color: isSelected ? colors.coral : colors.textPrimary },
                          ]}
                        >
                          {item.name}
                        </Text>
                        <View
                          style={[
                            styles.genderBadge,
                            {
                              backgroundColor:
                                item.gender === 'character'
                                  ? '#FFA72625'
                                  : item.gender === 'female'
                                  ? '#E91E6320'
                                  : '#2196F320',
                            },
                          ]}
                        >
                          <Text
                            style={[
                              styles.genderBadgeText,
                              {
                                color:
                                  item.gender === 'character'
                                    ? '#FFA726'
                                    : item.gender === 'female'
                                    ? '#E91E63'
                                    : '#2196F3',
                              },
                            ]}
                          >
                            {item.gender === 'character'
                              ? 'Personaggio'
                              : item.gender === 'female'
                              ? 'Femmina'
                              : 'Maschio'}
                          </Text>
                        </View>

                        <View style={[styles.styleTagBadge, { backgroundColor: isDarkMode ? '#2A3F33' : '#E2EBE5' }]}>
                          <Text style={[styles.styleTagText, { color: colors.textSecondary }]}>
                            {item.styleTag}
                          </Text>
                        </View>
                      </View>

                      <Text
                        style={[styles.voiceDesc, { color: colors.textSecondary }]}
                        numberOfLines={1}
                      >
                        {item.desc}
                      </Text>
                    </View>

                    {isSelected ? (
                      <View style={[styles.activeCheck, { backgroundColor: colors.coral }]}>
                        <Ionicons name="checkmark" size={16} color="#FFFFFF" />
                      </View>
                    ) : isLocked ? (
                      <View style={styles.lockIconBox}>
                        <Ionicons name="lock-closed" size={14} color="#F59E0B" />
                        <Text style={styles.adHintText}>Ad</Text>
                      </View>
                    ) : (
                      <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
                    )}
                  </View>

                  {/* Specifiche Dettagliate: Carattere, Timbro, Cadenza */}
                  <View style={[styles.detailsContainer, { borderTopColor: isDarkMode ? '#22382D' : '#EAF0EC' }]}>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailIcon}>🎭</Text>
                      <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>
                        Carattere: <Text style={[styles.detailValue, { color: colors.textPrimary }]}>{item.personality}</Text>
                      </Text>
                    </View>

                    <View style={styles.detailRow}>
                      <Text style={styles.detailIcon}>🔊</Text>
                      <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>
                        Timbro: <Text style={[styles.detailValue, { color: colors.textPrimary }]}>{item.timbre}</Text>
                      </Text>
                    </View>

                    <View style={styles.detailRow}>
                      <Text style={styles.detailIcon}>⏱️</Text>
                      <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>
                        Cadenza: <Text style={[styles.detailValue, { color: colors.textPrimary }]}>{item.cadence}</Text>
                      </Text>
                    </View>
                  </View>
                </TouchableOpacity>
              );
            }}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Ionicons name="search-outline" size={42} color={colors.textSecondary} />
                <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                  Nessuna voce trovata per &quot;{searchQuery}&quot;
                </Text>
              </View>
            }
          />
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: '90%',
    minHeight: '70%',
    paddingTop: 18,
    paddingHorizontal: 16,
    paddingBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 12,
    marginTop: 3,
    lineHeight: 16,
  },
  closeBtn: {
    padding: 6,
    borderRadius: 20,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 9,
    gap: 8,
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    padding: 0,
  },
  filtersRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  chipText: {
    fontSize: 12,
    fontWeight: '600',
  },
  listContent: {
    paddingBottom: 24,
    gap: 10,
  },
  voiceCard: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 12,
    gap: 10,
  },
  voiceCardSelected: {
    borderWidth: 1.5,
  },
  voiceCardLocked: {
    opacity: 0.95,
  },
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatarBox: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 2,
  },
  voiceName: {
    fontSize: 15,
    fontWeight: '800',
  },
  genderBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  genderBadgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  styleTagBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  styleTagText: {
    fontSize: 10,
    fontWeight: '600',
  },
  voiceDesc: {
    fontSize: 12,
  },
  activeCheck: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lockIconBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    paddingHorizontal: 7,
    paddingVertical: 4,
    borderRadius: 10,
  },
  adHintText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#F59E0B',
  },
  detailsContainer: {
    borderTopWidth: 1,
    paddingTop: 8,
    gap: 4,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
  },
  detailIcon: {
    fontSize: 11,
    marginTop: 1,
  },
  detailLabel: {
    fontSize: 11,
    lineHeight: 15,
    flex: 1,
  },
  detailValue: {
    fontWeight: '600',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    gap: 10,
  },
  emptyText: {
    fontSize: 14,
    fontWeight: '500',
  },
});
