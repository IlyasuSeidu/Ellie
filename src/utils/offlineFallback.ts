/**
 * Offline Fallback Handler
 *
 * Phase 3: Local pattern matching for simple shift queries when offline.
 * Handles basic questions without requiring the Claude API backend.
 * Falls back gracefully when network is unavailable.
 */

import type { ShiftCycle, ShiftDay } from '@/types';
import { calculateShiftDay, getNextOccurrence, getShiftStatistics } from './shiftUtils';
import dayjs from 'dayjs';
import i18n from '@/i18n';
import { normalizeLanguage, type SupportedLanguage } from '@/i18n/languageDetector';
import { addDays, startOfDay } from './dateUtils';

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
  week: string[];
  month: string[];
  shift: string[];
  work: string[];
  schedule: string[];
  questionPrefixes: string[];
  next: string[];
  count: string[];
  flyOut: string[];
  pattern: string[];
  startBack: string[];
  dayOff: string[];
  night: string[];
};

const QUERY_LEXICON: Record<SupportedLanguage, QueryLexicon> = {
  en: {
    today: ['today'],
    tonight: ['tonight'],
    tomorrow: ['tomorrow'],
    week: ['week', 'this week'],
    month: ['month'],
    shift: ['shift'],
    work: ['work', 'working', 'on'],
    schedule: ['schedule', 'roster'],
    questionPrefixes: ['am i', 'do i'],
    next: ['next'],
    count: ['how many', 'count', 'many'],
    flyOut: ['fly out', 'flyout', 'head home', 'go home'],
    pattern: ['pattern', 'cycle', 'rotation', 'roster'],
    startBack: ['start back', 'back to work', 'go back', 'back on'],
    dayOff: ['day off', 'off day', 'rest day', 'free day', 'off'],
    night: ['night shift', 'night'],
  },
  es: {
    today: ['hoy'],
    tonight: ['esta noche'],
    tomorrow: ['mañana', 'manana'],
    week: ['semana', 'esta semana'],
    month: ['mes'],
    shift: ['turno'],
    work: ['trabajo', 'trabajando', 'trabajar'],
    schedule: ['horario', 'calendario', 'rol'],
    questionPrefixes: ['estoy', 'tengo'],
    next: ['próximo', 'proximo', 'siguiente'],
    count: ['cuántos', 'cuantos', 'cuántas', 'cuantas'],
    flyOut: ['vuelo de salida', 'salida', 'volver a casa'],
    pattern: ['patrón', 'patron', 'ciclo', 'rotación', 'rotacion'],
    startBack: ['vuelvo', 'volver', 'regreso al trabajo', 'empiezo de nuevo'],
    dayOff: ['día libre', 'dia libre', 'descanso', 'libre'],
    night: ['turno de noche', 'noche'],
  },
  'pt-BR': {
    today: ['hoje'],
    tonight: ['esta noite'],
    tomorrow: ['amanhã', 'amanha'],
    week: ['semana', 'esta semana'],
    month: ['mês', 'mes'],
    shift: ['turno'],
    work: ['trabalho', 'trabalhando', 'trabalhar'],
    schedule: ['escala', 'agenda', 'calendário', 'calendario'],
    questionPrefixes: ['estou', 'eu trabalho'],
    next: ['próximo', 'proximo', 'seguinte'],
    count: ['quantos', 'quantas'],
    flyOut: ['fly-out', 'voo de volta', 'voltar para casa'],
    pattern: ['padrão', 'padrao', 'ciclo', 'rotação', 'rotacao'],
    startBack: ['volto', 'voltar', 'retorno ao trabalho', 'começo de novo'],
    dayOff: ['folga', 'dia de folga', 'descanso'],
    night: ['turno da noite', 'noite'],
  },
  fr: {
    today: ["aujourd'hui", 'aujourdhui'],
    tonight: ['ce soir'],
    tomorrow: ['demain'],
    week: ['semaine', 'cette semaine'],
    month: ['mois'],
    shift: ['quart', 'poste'],
    work: ['travail', 'travailler', 'travaille'],
    schedule: ['horaire', 'planning'],
    questionPrefixes: ['est-ce que', 'je travaille'],
    next: ['prochain', 'suivant'],
    count: ['combien'],
    flyOut: ['vol retour', 'départ aérien', 'rentrer à la maison'],
    pattern: ['rythme', 'cycle', 'rotation', 'planning'],
    startBack: ['je reprends', 'reprendre', 'retour au travail'],
    dayOff: ['repos', 'jour off', 'jour de repos'],
    night: ['nuit', 'quart de nuit'],
  },
  ar: {
    today: ['اليوم'],
    tonight: ['الليلة'],
    tomorrow: ['غد', 'غدا', 'بكرة'],
    week: ['الأسبوع', 'هذا الأسبوع'],
    month: ['شهر'],
    shift: ['وردية', 'نوبة'],
    work: ['عمل', 'أعمل', 'دوام'],
    schedule: ['جدول'],
    questionPrefixes: ['هل', 'أنا'],
    next: ['القادم', 'التالي'],
    count: ['كم'],
    flyOut: ['يوم العودة', 'العودة', 'المغادرة'],
    pattern: ['النمط', 'الدورة', 'الجدول'],
    startBack: ['أبدأ من جديد', 'أرجع للعمل', 'العودة للعمل'],
    dayOff: ['إجازة', 'راحة', 'يوم راحة'],
    night: ['ليل', 'ليلي'],
  },
  'zh-CN': {
    today: ['今天'],
    tonight: ['今晚'],
    tomorrow: ['明天'],
    week: ['这周', '本周', '星期'],
    month: ['月'],
    shift: ['班', '班次'],
    work: ['上班', '工作'],
    schedule: ['排班', '日程', '班表'],
    questionPrefixes: ['我', '是否'],
    next: ['下一个', '下一次', '下次'],
    count: ['多少'],
    flyOut: ['飞出', '返程', '回家'],
    pattern: ['模式', '轮班模式', '周期'],
    startBack: ['什么时候回去上班', '开始上班', '返岗'],
    dayOff: ['休息', '休假', '休息日'],
    night: ['夜班', '晚上'],
  },
  ru: {
    today: ['сегодня'],
    tonight: ['сегодня вечером', 'сегодня ночью'],
    tomorrow: ['завтра'],
    week: ['неделя', 'на этой неделе'],
    month: ['месяц'],
    shift: ['смена'],
    work: ['работа', 'работаю', 'работать'],
    schedule: ['график', 'расписание'],
    questionPrefixes: ['я', 'мне'],
    next: ['следующий', 'следующая'],
    count: ['сколько'],
    flyOut: ['вылет', 'обратный вылет', 'домой'],
    pattern: ['паттерн', 'цикл', 'ротация', 'график'],
    startBack: ['когда я выхожу снова', 'возвращаюсь на смену', 'снова на работу'],
    dayOff: ['выходной', 'день отдыха', 'отдых'],
    night: ['ночная смена', 'ночь'],
  },
  hi: {
    today: ['आज'],
    tonight: ['आज रात'],
    tomorrow: ['कल'],
    week: ['इस हफ्ते', 'इस सप्ताह', 'हफ्ता'],
    month: ['महीना'],
    shift: ['शिफ्ट'],
    work: ['काम', 'ड्यूटी'],
    schedule: ['शेड्यूल', 'कैलेंडर'],
    questionPrefixes: ['क्या', 'मैं'],
    next: ['अगला', 'अगली'],
    count: ['कितने', 'कितनी'],
    flyOut: ['फ्लाई-आउट', 'वापस उड़ान', 'घर वापस'],
    pattern: ['पैटर्न', 'चक्र', 'रोटेशन'],
    startBack: ['कब वापस शुरू', 'काम पर वापस', 'फिर से शुरू'],
    dayOff: ['छुट्टी', 'आराम'],
    night: ['नाइट', 'रात'],
  },
  af: {
    today: ['vandag'],
    tonight: ['vanaand'],
    tomorrow: ['môre', 'more'],
    week: ['week', 'hierdie week'],
    month: ['maand'],
    shift: ['skof'],
    work: ['werk'],
    schedule: ['rooster', 'skedule'],
    questionPrefixes: ['is ek', 'werk ek'],
    next: ['volgende'],
    count: ['hoeveel'],
    flyOut: ['uitvlieg', 'fly-out', 'huis toe'],
    pattern: ['patroon', 'siklus', 'rotasie'],
    startBack: ['wanneer begin ek weer', 'terug werk toe', 'weer begin'],
    dayOff: ['af dag', 'rusdag', 'af'],
    night: ['nag', 'nagskof'],
  },
  zu: {
    today: ['namuhla'],
    tonight: ['kusihlwa', 'ebusuku'],
    tomorrow: ['kusasa'],
    week: ['isonto', 'kuleli sonto'],
    month: ['inyanga'],
    shift: ['ishifu', 'shift'],
    work: ['umsebenzi', 'ngiyasebenza', 'usebenza'],
    schedule: ['uhlelo', 'irosta'],
    questionPrefixes: ['ngabe', 'ngi'],
    next: ['elandelayo', 'okulandelayo'],
    count: ['mangaki'],
    flyOut: ['fly-out', 'ukubuyela ekhaya'],
    pattern: ['iphethini', 'umjikelezo', 'irosta'],
    startBack: ['ngiqala nini futhi', 'ngibuyela emsebenzini'],
    dayOff: ['ikhefu', 'usuku lokuphumula', 'ukuphumula'],
    night: ['ebusuku', 'night'],
  },
  id: {
    today: ['hari ini'],
    tonight: ['malam ini'],
    tomorrow: ['besok'],
    week: ['minggu ini', 'minggu'],
    month: ['bulan'],
    shift: ['shift'],
    work: ['kerja', 'bekerja'],
    schedule: ['jadwal', 'roster'],
    questionPrefixes: ['apakah', 'saya'],
    next: ['berikutnya', 'selanjutnya'],
    count: ['berapa banyak', 'berapa'],
    flyOut: ['terbang keluar', 'fly-out', 'pulang ke rumah'],
    pattern: ['pola', 'siklus', 'rotasi'],
    startBack: ['mulai lagi', 'kembali kerja', 'masuk lagi'],
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

  if (matchesShiftThisWeek(normalized, lexicon)) {
    const start = startOfDay(new Date());
    const end = addDays(start, 6);
    const stats = getShiftStatistics(start, end, shiftCycle);
    const text =
      shiftCycle.shiftSystem === '3-shift' || (shiftCycle.morningOn ?? 0) > 0
        ? translateOffline(
            'voiceAssistant.offlineFallback.shiftsThisWeekThreeShift',
            language,
            {
              morningCount: stats.morningShifts,
              afternoonCount: stats.afternoonShifts,
              nightCount: stats.nightShifts,
              offCount: stats.daysOff,
            },
            'This week: {{morningCount}} morning shifts, {{afternoonCount}} afternoon shifts, {{nightCount}} night shifts, and {{offCount}} days off.'
          )
        : translateOffline(
            'voiceAssistant.offlineFallback.shiftsThisWeek',
            language,
            {
              dayCount: stats.dayShifts,
              nightCount: stats.nightShifts,
              offCount: stats.daysOff,
            },
            'This week: {{dayCount}} day shifts, {{nightCount}} night shifts, and {{offCount}} days off.'
          );
    return { handled: true, text, toolName: 'get_shift_range_summary' };
  }

  if (matchesDaysOffThisMonth(normalized, lexicon)) {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    const stats = getShiftStatistics(monthStart, monthEnd, shiftCycle);
    return {
      handled: true,
      text: translateOffline(
        'voiceAssistant.offlineFallback.daysOffThisMonth',
        language,
        { count: stats.daysOff },
        'You have {{count}} days off this month.'
      ),
      toolName: 'get_monthly_shift_stats',
    };
  }

  if (matchesNightShiftsThisMonth(normalized, lexicon)) {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    const stats = getShiftStatistics(monthStart, monthEnd, shiftCycle);
    return {
      handled: true,
      text: translateOffline(
        'voiceAssistant.offlineFallback.nightShiftsThisMonth',
        language,
        { count: stats.nightShifts },
        'You have {{count}} night shifts this month.'
      ),
      toolName: 'get_monthly_shift_stats',
    };
  }

  if (matchesPatternSummary(normalized, lexicon)) {
    return {
      handled: true,
      text: describePattern(shiftCycle, language),
      toolName: 'describe_shift_pattern',
    };
  }

  if (matchesNextFlyOut(normalized, lexicon) && shiftCycle.rosterType === 'fifo') {
    const flyOutDay = findNextTransitionDay(new Date(), shiftCycle, 'flyOut');
    if (flyOutDay) {
      return {
        handled: true,
        text: translateOffline(
          'voiceAssistant.offlineFallback.nextFlyOut',
          language,
          { date: formatDateForLanguage(flyOutDay.date, language) },
          'Your next fly-out day is {{date}}.'
        ),
        toolName: 'get_next_fifo_transition',
      };
    }
  }

  if (matchesStartBack(normalized, lexicon) && shiftCycle.rosterType === 'fifo') {
    const startBackDay = findNextTransitionDay(new Date(), shiftCycle, 'startBack');
    if (startBackDay) {
      return {
        handled: true,
        text: translateOffline(
          'voiceAssistant.offlineFallback.startBack',
          language,
          { date: formatDateForLanguage(startBackDay.date, language) },
          'You start back on {{date}}.'
        ),
        toolName: 'get_next_fifo_transition',
      };
    }
  }

  // Not handled — needs backend
  return { handled: false };
}

function formatDateForLanguage(dateString: string, language: SupportedLanguage): string {
  return new Date(dateString).toLocaleDateString(getDateLocaleTag(language), {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });
}

function findNextTransitionDay(
  fromDate: Date,
  shiftCycle: ShiftCycle,
  transition: 'flyOut' | 'startBack',
  maxDaysAhead = 365
): ShiftDay | null {
  let current = startOfDay(fromDate);
  for (let index = 0; index < maxDaysAhead; index += 1) {
    const day = calculateShiftDay(current, shiftCycle);
    const previous = calculateShiftDay(addDays(current, -1), shiftCycle);
    const next = calculateShiftDay(addDays(current, 1), shiftCycle);

    if (transition === 'flyOut' && day.isWorkDay && !next.isWorkDay) {
      return day;
    }

    if (transition === 'startBack' && day.isWorkDay && !previous.isWorkDay) {
      return day;
    }

    current = addDays(current, 1);
  }

  return null;
}

function describePattern(shiftCycle: ShiftCycle, language: SupportedLanguage): string {
  if (shiftCycle.rosterType === 'fifo' && shiftCycle.fifoConfig) {
    return translateOffline(
      'voiceAssistant.offlineFallback.patternSummaryFifo',
      language,
      {
        workDays: shiftCycle.fifoConfig.workBlockDays,
        restDays: shiftCycle.fifoConfig.restBlockDays,
      },
      'Your pattern is {{workDays}} days on site, then {{restDays}} days off.'
    );
  }

  if (shiftCycle.shiftSystem === '3-shift' || (shiftCycle.morningOn ?? 0) > 0) {
    return translateOffline(
      'voiceAssistant.offlineFallback.patternSummaryThreeShift',
      language,
      {
        morningCount: shiftCycle.morningOn ?? shiftCycle.daysOn,
        afternoonCount: shiftCycle.afternoonOn ?? shiftCycle.daysOn,
        nightCount: shiftCycle.nightOn ?? shiftCycle.nightsOn,
        offCount: shiftCycle.daysOff,
      },
      'Your pattern is {{morningCount}} morning shifts, {{afternoonCount}} afternoon shifts, {{nightCount}} night shifts, then {{offCount}} days off.'
    );
  }

  return translateOffline(
    'voiceAssistant.offlineFallback.patternSummaryRotating',
    language,
    {
      dayCount: shiftCycle.daysOn,
      nightCount: shiftCycle.nightsOn,
      offCount: shiftCycle.daysOff,
    },
    'Your pattern is {{dayCount}} day shifts, {{nightCount}} night shifts, then {{offCount}} days off.'
  );
}

// ── Pattern matchers ──────────────────────────────────────────────

function matchesToday(q: string, lexicon: QueryLexicon): boolean {
  return (
    (containsAny(q, lexicon.today) || containsAny(q, lexicon.tonight)) &&
    (containsAny(q, lexicon.shift) ||
      containsAny(q, lexicon.work) ||
      containsAny(q, lexicon.schedule)) &&
    !containsAny(q, lexicon.month) &&
    !containsAny(q, lexicon.week) &&
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

function matchesShiftThisWeek(q: string, lexicon: QueryLexicon): boolean {
  return (
    containsAny(q, lexicon.week) &&
    (containsAny(q, lexicon.shift) || containsAny(q, lexicon.schedule)) &&
    !containsAny(q, lexicon.today) &&
    !containsAny(q, lexicon.tonight) &&
    !containsAny(q, lexicon.tomorrow)
  );
}

function matchesDaysOffThisMonth(q: string, lexicon: QueryLexicon): boolean {
  return (
    containsAny(q, lexicon.month) && containsAny(q, lexicon.dayOff) && containsAny(q, lexicon.count)
  );
}

function matchesNightShiftsThisMonth(q: string, lexicon: QueryLexicon): boolean {
  return (
    containsAny(q, lexicon.month) && containsAny(q, lexicon.night) && containsAny(q, lexicon.count)
  );
}

function matchesPatternSummary(q: string, lexicon: QueryLexicon): boolean {
  return (
    containsAny(q, lexicon.pattern) &&
    !containsAny(q, lexicon.today) &&
    !containsAny(q, lexicon.tomorrow) &&
    !containsAny(q, lexicon.month) &&
    !containsAny(q, lexicon.week)
  );
}

function matchesNextFlyOut(q: string, lexicon: QueryLexicon): boolean {
  return containsAny(q, lexicon.next) && containsAny(q, lexicon.flyOut);
}

function matchesStartBack(q: string, lexicon: QueryLexicon): boolean {
  return containsAny(q, lexicon.startBack);
}
