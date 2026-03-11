/**
 * Offline Fallback Handler
 *
 * Phase 3: Local pattern matching for simple shift queries when offline.
 * Handles basic questions without requiring the Claude API backend.
 * Falls back gracefully when network is unavailable.
 */

import type { ShiftCycle } from '@/types';
import { calculateShiftDay, getNextOccurrence } from './shiftUtils';
import dayjs from 'dayjs';
import i18n from '@/i18n';
import { normalizeLanguage, type SupportedLanguage } from '@/i18n/languageDetector';

export interface OfflineFallbackResult {
  /** Whether the query was handled offline */
  handled: boolean;
  /** Response text if handled */
  text?: string;
  /** Tool name that was simulated */
  toolName?: string;
}

type QueryLexicon = {
  today: string[];
  tonight: string[];
  tomorrow: string[];
  month: string[];
  shift: string[];
  work: string[];
  schedule: string[];
  questionPrefixes: string[];
  next: string[];
  dayOff: string[];
  night: string[];
};

const QUERY_LEXICON: Record<SupportedLanguage, QueryLexicon> = {
  en: {
    today: ['today'],
    tonight: ['tonight'],
    tomorrow: ['tomorrow'],
    month: ['month'],
    shift: ['shift'],
    work: ['work', 'working', 'on'],
    schedule: ['schedule', 'roster'],
    questionPrefixes: ['am i', 'do i'],
    next: ['next'],
    dayOff: ['day off', 'off day', 'rest day', 'free day', 'off'],
    night: ['night shift', 'night'],
  },
  es: {
    today: ['hoy'],
    tonight: ['esta noche'],
    tomorrow: ['mañana', 'manana'],
    month: ['mes'],
    shift: ['turno'],
    work: ['trabajo', 'trabajando', 'trabajar'],
    schedule: ['horario', 'calendario', 'rol'],
    questionPrefixes: ['estoy', 'tengo'],
    next: ['próximo', 'proximo', 'siguiente'],
    dayOff: ['día libre', 'dia libre', 'descanso', 'libre'],
    night: ['turno de noche', 'noche'],
  },
  'pt-BR': {
    today: ['hoje'],
    tonight: ['esta noite'],
    tomorrow: ['amanhã', 'amanha'],
    month: ['mês', 'mes'],
    shift: ['turno'],
    work: ['trabalho', 'trabalhando', 'trabalhar'],
    schedule: ['escala', 'agenda', 'calendário', 'calendario'],
    questionPrefixes: ['estou', 'eu trabalho'],
    next: ['próximo', 'proximo', 'seguinte'],
    dayOff: ['folga', 'dia de folga', 'descanso'],
    night: ['turno da noite', 'noite'],
  },
  fr: {
    today: ["aujourd'hui", 'aujourdhui'],
    tonight: ['ce soir'],
    tomorrow: ['demain'],
    month: ['mois'],
    shift: ['quart', 'poste'],
    work: ['travail', 'travailler', 'travaille'],
    schedule: ['horaire', 'planning'],
    questionPrefixes: ['est-ce que', 'je travaille'],
    next: ['prochain', 'suivant'],
    dayOff: ['repos', 'jour off', 'jour de repos'],
    night: ['nuit', 'quart de nuit'],
  },
  ar: {
    today: ['اليوم'],
    tonight: ['الليلة'],
    tomorrow: ['غد', 'غدا', 'بكرة'],
    month: ['شهر'],
    shift: ['وردية', 'نوبة'],
    work: ['عمل', 'أعمل', 'دوام'],
    schedule: ['جدول'],
    questionPrefixes: ['هل', 'أنا'],
    next: ['القادم', 'التالي'],
    dayOff: ['إجازة', 'راحة', 'يوم راحة'],
    night: ['ليل', 'ليلي'],
  },
  'zh-CN': {
    today: ['今天'],
    tonight: ['今晚'],
    tomorrow: ['明天'],
    month: ['月'],
    shift: ['班', '班次'],
    work: ['上班', '工作'],
    schedule: ['排班', '日程', '班表'],
    questionPrefixes: ['我', '是否'],
    next: ['下一个', '下一次', '下次'],
    dayOff: ['休息', '休假', '休息日'],
    night: ['夜班', '晚上'],
  },
  ru: {
    today: ['сегодня'],
    tonight: ['сегодня вечером', 'сегодня ночью'],
    tomorrow: ['завтра'],
    month: ['месяц'],
    shift: ['смена'],
    work: ['работа', 'работаю', 'работать'],
    schedule: ['график', 'расписание'],
    questionPrefixes: ['я', 'мне'],
    next: ['следующий', 'следующая'],
    dayOff: ['выходной', 'день отдыха', 'отдых'],
    night: ['ночная смена', 'ночь'],
  },
  hi: {
    today: ['आज'],
    tonight: ['आज रात'],
    tomorrow: ['कल'],
    month: ['महीना'],
    shift: ['शिफ्ट'],
    work: ['काम', 'ड्यूटी'],
    schedule: ['शेड्यूल', 'कैलेंडर'],
    questionPrefixes: ['क्या', 'मैं'],
    next: ['अगला', 'अगली'],
    dayOff: ['छुट्टी', 'आराम'],
    night: ['नाइट', 'रात'],
  },
  af: {
    today: ['vandag'],
    tonight: ['vanaand'],
    tomorrow: ['môre', 'more'],
    month: ['maand'],
    shift: ['skof'],
    work: ['werk'],
    schedule: ['rooster', 'skedule'],
    questionPrefixes: ['is ek', 'werk ek'],
    next: ['volgende'],
    dayOff: ['af dag', 'rusdag', 'af'],
    night: ['nag', 'nagskof'],
  },
  zu: {
    today: ['namuhla'],
    tonight: ['kusihlwa', 'ebusuku'],
    tomorrow: ['kusasa'],
    month: ['inyanga'],
    shift: ['ishifu', 'shift'],
    work: ['umsebenzi', 'ngiyasebenza', 'usebenza'],
    schedule: ['uhlelo', 'irosta'],
    questionPrefixes: ['ngabe', 'ngi'],
    next: ['elandelayo', 'okulandelayo'],
    dayOff: ['ikhefu', 'usuku lokuphumula', 'ukuphumula'],
    night: ['ebusuku', 'night'],
  },
  id: {
    today: ['hari ini'],
    tonight: ['malam ini'],
    tomorrow: ['besok'],
    month: ['bulan'],
    shift: ['shift'],
    work: ['kerja', 'bekerja'],
    schedule: ['jadwal', 'roster'],
    questionPrefixes: ['apakah', 'saya'],
    next: ['berikutnya', 'selanjutnya'],
    dayOff: ['libur', 'hari libur', 'istirahat'],
    night: ['shift malam', 'malam'],
  },
};

const getDateLocaleTag = (language: SupportedLanguage): string => {
  if (language === 'es') return 'es-ES';
  if (language === 'pt-BR') return 'pt-BR';
  if (language === 'fr') return 'fr-FR';
  if (language === 'ar') return 'ar';
  if (language === 'zh-CN') return 'zh-CN';
  if (language === 'ru') return 'ru-RU';
  if (language === 'hi') return 'hi-IN';
  if (language === 'af') return 'af-ZA';
  if (language === 'zu') return 'zu-ZA';
  if (language === 'id') return 'id-ID';
  return 'en-US';
};

const escapeRegex = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const isLatinLikeTerm = (value: string): boolean => /^[a-z0-9' -]+$/i.test(value);

const containsTerm = (query: string, term: string): boolean => {
  const normalizedTerm = term.toLowerCase().trim();
  if (!normalizedTerm) return false;

  if (!isLatinLikeTerm(normalizedTerm)) {
    return query.includes(normalizedTerm);
  }

  const regex = new RegExp(
    `(^|[^\\\\p{L}\\\\p{N}])${escapeRegex(normalizedTerm)}([^\\\\p{L}\\\\p{N}]|$)`,
    'u'
  );
  return regex.test(query);
};

const containsAny = (query: string, terms: string[]): boolean =>
  terms.some((term) => containsTerm(query, term));

const translateOffline = (
  key: string,
  language: SupportedLanguage,
  options: Record<string, unknown>,
  fallback: string
): string =>
  String(
    i18n.t(key, {
      lng: language,
      ns: 'dashboard',
      defaultValue: fallback,
      ...options,
    })
  );

/**
 * Attempt to answer a query locally without the backend.
 *
 * Supports:
 * - "What shift today/tomorrow?"
 * - "Am I working today/tomorrow?"
 * - "When is my next day off?"
 * - "When is my next night shift?"
 *
 * @param query - User's transcribed speech
 * @param shiftCycle - User's shift cycle
 * @param userName - User's name for personalized response
 * @returns Result indicating if query was handled and the response
 */
export function tryOfflineFallback(
  query: string,
  shiftCycle: ShiftCycle,
  userName: string
): OfflineFallbackResult {
  const normalized = query.toLowerCase().trim();
  const language = normalizeLanguage(i18n.resolvedLanguage ?? i18n.language ?? 'en');
  const lexicon = QUERY_LEXICON[language] ?? QUERY_LEXICON.en;

  // Am I working today? (check BEFORE generic today, since it's more specific)
  if (matchesAmIWorking(normalized, lexicon)) {
    const today = new Date();
    const shift = calculateShiftDay(today, shiftCycle);
    const text = shift.isWorkDay
      ? translateOffline(
          'voiceAssistant.offlineFallback.workingTodayYes',
          language,
          { shiftType: shift.shiftType },
          "Yes, you're on a {{shiftType}} shift today."
        )
      : translateOffline(
          'voiceAssistant.offlineFallback.workingTodayNo',
          language,
          {},
          'No, today is your day off.'
        );
    return { handled: true, text, toolName: 'get_current_status' };
  }

  // Today's shift
  if (matchesToday(normalized, lexicon)) {
    const today = new Date();
    const shift = calculateShiftDay(today, shiftCycle);
    const text = shift.isWorkDay
      ? translateOffline(
          'voiceAssistant.offlineFallback.shiftTodayWork',
          language,
          { shiftType: shift.shiftType, userName },
          'You have a {{shiftType}} shift today, {{userName}}.'
        )
      : translateOffline(
          'voiceAssistant.offlineFallback.shiftTodayOff',
          language,
          { userName },
          'You have the day off today, {{userName}}! Rest and recharge.'
        );
    return { handled: true, text, toolName: 'get_current_status' };
  }

  // Tomorrow's shift
  if (matchesTomorrow(normalized, lexicon)) {
    const tomorrow = dayjs().add(1, 'day').toDate();
    const shift = calculateShiftDay(tomorrow, shiftCycle);
    const dateStr = tomorrow.toLocaleDateString(getDateLocaleTag(language), {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
    });
    const text = shift.isWorkDay
      ? translateOffline(
          'voiceAssistant.offlineFallback.shiftTomorrowWork',
          language,
          { date: dateStr, shiftType: shift.shiftType },
          'Tomorrow ({{date}}) you have a {{shiftType}} shift.'
        )
      : translateOffline(
          'voiceAssistant.offlineFallback.shiftTomorrowOff',
          language,
          { date: dateStr },
          'Tomorrow ({{date}}) is your day off!'
        );
    return { handled: true, text, toolName: 'get_shift_for_date' };
  }

  // Next day off
  if (matchesNextDayOff(normalized, lexicon)) {
    const result = getNextOccurrence(new Date(), 'off', shiftCycle, 60);
    if (result) {
      const occurrenceDate = new Date(result.date);
      const dateStr = occurrenceDate.toLocaleDateString(getDateLocaleTag(language), {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
      });
      return {
        handled: true,
        text: translateOffline(
          'voiceAssistant.offlineFallback.nextDayOff',
          language,
          { date: dateStr },
          'Your next day off is {{date}}.'
        ),
        toolName: 'get_next_occurrence',
      };
    }
  }

  // Next night shift
  if (matchesNextNightShift(normalized, lexicon)) {
    const result = getNextOccurrence(new Date(), 'night', shiftCycle, 60);
    if (result) {
      const occurrenceDate = new Date(result.date);
      const dateStr = occurrenceDate.toLocaleDateString(getDateLocaleTag(language), {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
      });
      return {
        handled: true,
        text: translateOffline(
          'voiceAssistant.offlineFallback.nextNightShift',
          language,
          { date: dateStr },
          'Your next night shift is {{date}}.'
        ),
        toolName: 'get_next_occurrence',
      };
    }
  }

  // Not handled — needs backend
  return { handled: false };
}

// ── Pattern matchers ──────────────────────────────────────────────

function matchesToday(q: string, lexicon: QueryLexicon): boolean {
  return (
    (containsAny(q, lexicon.today) || containsAny(q, lexicon.tonight)) &&
    (containsAny(q, lexicon.shift) ||
      containsAny(q, lexicon.work) ||
      containsAny(q, lexicon.schedule)) &&
    !containsAny(q, lexicon.month) &&
    !containsAny(q, lexicon.tomorrow) &&
    !containsAny(q, lexicon.next)
  );
}

function matchesTomorrow(q: string, lexicon: QueryLexicon): boolean {
  return (
    containsAny(q, lexicon.tomorrow) &&
    (containsAny(q, lexicon.shift) ||
      containsAny(q, lexicon.work) ||
      containsAny(q, lexicon.schedule))
  );
}

function matchesAmIWorking(q: string, lexicon: QueryLexicon): boolean {
  return (
    containsAny(q, lexicon.questionPrefixes) &&
    containsAny(q, lexicon.work) &&
    (containsAny(q, lexicon.today) || containsAny(q, lexicon.tonight))
  );
}

function matchesNextDayOff(q: string, lexicon: QueryLexicon): boolean {
  return containsAny(q, lexicon.next) && containsAny(q, lexicon.dayOff);
}

function matchesNextNightShift(q: string, lexicon: QueryLexicon): boolean {
  return containsAny(q, lexicon.next) && containsAny(q, lexicon.night);
}
