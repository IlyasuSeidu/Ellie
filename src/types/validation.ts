/**
 * Runtime Type Validation with Zod
 *
 * This file contains Zod schemas for runtime validation of all application types.
 * It also exports type guards and validation helper functions.
 */

import { z } from 'zod';
import { EnergyLevel, ReportType } from './index';

/**
 * Date String Validation
 *
 * Validates YYYY-MM-DD format and ensures date is valid
 */
const dateStringSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'Date must be in YYYY-MM-DD format',
  })
  .refine(
    (date) => {
      // Validate that the date is actually valid (not 2024-13-01 or 2024-01-32)
      const [year, month, day] = date.split('-').map(Number);
      const dateObj = new Date(year, month - 1, day);
      return (
        dateObj.getFullYear() === year &&
        dateObj.getMonth() === month - 1 &&
        dateObj.getDate() === day
      );
    },
    {
      message: 'Invalid date',
    }
  );

/**
 * Time String Validation
 *
 * Validates HH:mm format (24-hour)
 */
const timeStringSchema = z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, {
  message: 'Time must be in HH:mm format (24-hour)',
});

/**
 * Email Validation
 */
const emailSchema = z.string().email({ message: 'Invalid email address' });

/**
 * ISO 3166-1 alpha-2 Country Code
 */
const countryCodeSchema = z.string().length(2).toUpperCase();

/**
 * Currency Code (ISO 4217)
 */
const currencyCodeSchema = z.string().length(3).toUpperCase();

/**
 * Shift Type Schema
 */
export const shiftTypeSchema = z.enum(['day', 'night', 'morning', 'afternoon', 'off']);

/**
 * Shift Day Schema
 */
export const shiftDaySchema = z.object({
  date: dateStringSchema,
  isWorkDay: z.boolean(),
  isNightShift: z.boolean(),
  shiftType: shiftTypeSchema,
  universal: z.unknown().optional(),
  notes: z.string().optional(),
});

/**
 * Shift Cycle Schema
 */
export const shiftCycleSchema = z.object({
  version: z.literal(3),
  name: z.string().min(1).max(120),
  timezone: z.string().min(1),
  anchorDate: dateStringSchema,
  phaseOffset: z.number().int().min(0),
  shiftDefinitions: z.array(z.unknown()).min(1),
  sequence: z.array(z.unknown()).min(1),
  source: z.enum(['manual', 'ai', 'template', 'migration']),
  updatedAt: z.string().optional(),
  aiDraftMeta: z.unknown().optional(),
});

/**
 * Holiday Type Schema
 */
export const holidayTypeSchema = z.enum(['national', 'religious', 'cultural', 'observance']);

/**
 * Holiday Schema
 */
export const holidaySchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1).max(200),
  date: dateStringSchema,
  country: countryCodeSchema,
  type: holidayTypeSchema,
  description: z.string().max(1000).optional(),
  isPaid: z.boolean().optional(),
});

/**
 * Notification Settings Schema
 */
export const smartReminderSettingsSchema = z.object({
  earlyReminderHours: z.number().int().min(0).max(72),
  prepTimeMinutes: z
    .number()
    .int()
    .min(0)
    .max(24 * 60),
  commuteTimeMinutes: z
    .number()
    .int()
    .min(0)
    .max(24 * 60),
  imminentReminderEnabled: z.boolean(),
  preBriefingEnabled: z.boolean(),
  quietHoursEnabled: z.boolean(),
  quietHoursStart: timeStringSchema,
  quietHoursEnd: timeStringSchema,
  fatigueAwareReminders: z.boolean(),
  backToBackWarnings: z.boolean(),
  shortTurnaroundWarnings: z.boolean(),
  postShiftCheckin: z.boolean(),
  travelReminders: z.boolean(),
});

export const notificationSettingsSchema = z.object({
  shift24HoursBefore: z.boolean(),
  shift4HoursBefore: z.boolean(),
  holidayAlerts: z.boolean(),
  patternChangeAlerts: z.boolean(),
  soundEnabled: z.boolean(),
  vibrationEnabled: z.boolean(),
  smartReminders: smartReminderSettingsSchema.optional(),
});

export const userPreferencesSchema = z.object({
  theme: z.enum(['light', 'dark', 'auto']),
  notifications: notificationSettingsSchema,
  language: z.string().min(2),
  timezone: z.string().min(1),
});

/**
 * User Profile Schema
 */
export const userProfileSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1).max(100),
  occupation: z.string().min(1).max(100),
  company: z.string().min(1).max(200),
  country: countryCodeSchema,
  email: emailSchema,
  photoURL: z.string().url().optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  shiftCycle: shiftCycleSchema.optional(),
  notificationSettings: notificationSettingsSchema.optional(),
  preferences: userPreferencesSchema.optional(),
});

/**
 * Energy Level Schema
 */
export const energyLevelSchema = z.nativeEnum(EnergyLevel);

/**
 * Shift Log Entry Schema
 */
export const shiftLogEntrySchema = z.object({
  id: z.string().min(1),
  userId: z.string().min(1),
  date: dateStringSchema,
  shiftType: shiftTypeSchema,
  startTime: timeStringSchema,
  endTime: timeStringSchema,
  hoursWorked: z.number().min(0).max(24),
  energyLevel: energyLevelSchema.optional(),
  notes: z.string().max(1000).optional(),
  loggedAt: z.string().datetime(),
});

/**
 * Report Type Schema
 */
export const reportTypeSchema = z.nativeEnum(ReportType);

/**
 * Shift Statistics Schema
 */
export const shiftStatisticsSchema = z.object({
  totalShifts: z.number().int().min(0),
  dayShifts: z.number().int().min(0),
  nightShifts: z.number().int().min(0),
  daysOff: z.number().int().min(0),
  totalHours: z.number().min(0),
  averageHoursPerShift: z.number().min(0),
  startDate: dateStringSchema,
  endDate: dateStringSchema,
});

/**
 * Earnings Config Schema
 */
export const earningsConfigSchema = z.object({
  hourlyRate: z.number().positive(),
  nightShiftMultiplier: z.number().min(1),
  overtimeThreshold: z.number().positive(),
  overtimeMultiplier: z.number().min(1),
  holidayMultiplier: z.number().min(1),
  currency: currencyCodeSchema,
});

/**
 * Shift Report Schema
 */
export const shiftReportSchema = z.object({
  id: z.string().min(1),
  userId: z.string().min(1),
  type: reportTypeSchema,
  startDate: dateStringSchema,
  endDate: dateStringSchema,
  statistics: shiftStatisticsSchema,
  earnings: z
    .object({
      regularPay: z.number().min(0),
      nightShiftPay: z.number().min(0),
      overtimePay: z.number().min(0),
      holidayPay: z.number().min(0),
      totalPay: z.number().min(0),
      currency: currencyCodeSchema,
    })
    .optional(),
  generatedAt: z.string().datetime(),
});

/**
 * App Theme Schema
 */
export const appThemeSchema = z.enum(['light', 'dark', 'system']);

/**
 * App Settings Schema
 */
export const appSettingsSchema = z.object({
  theme: appThemeSchema,
  language: z.string().length(2),
  dateFormat: z.enum(['MM/DD/YYYY', 'DD/MM/YYYY', 'YYYY-MM-DD']),
  timeFormat: z.enum(['12h', '24h']),
  firstDayOfWeek: z.union([z.literal(0), z.literal(1)]),
  analyticsEnabled: z.boolean(),
  crashReportingEnabled: z.boolean(),
});

/**
 * API Error Schema
 */
export const apiErrorSchema = z.object({
  code: z.string(),
  message: z.string(),
  details: z.record(z.unknown()).optional(),
  timestamp: z.string().datetime(),
});

/**
 * Pagination Params Schema
 */
export const paginationParamsSchema = z.object({
  page: z.number().int().positive(),
  limit: z.number().int().positive().max(100),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
});

// ── Universal Shift Schemas ───────────────────────────────────────────────────

export const timeStringSchemaExported = z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, {
  message: 'Time must be in HH:mm format (24-hour)',
});

export const universalShiftKindSchema = z.enum([
  'work',
  'off',
  'travel',
  'on_call',
  'training',
  'leave',
  'custom',
]);

export const universalShiftTimePolicySchema = z.enum(['timed', 'all_day', 'none']);

export const universalShiftActivePolicySchema = z.enum([
  'timed_window',
  'all_day_active',
  'not_active',
]);

export const universalShiftDefinitionSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1).max(80),
  kind: universalShiftKindSchema,
  timePolicy: universalShiftTimePolicySchema,
  activePolicy: universalShiftActivePolicySchema,
  startTime: z
    .string()
    .regex(/^([01]\d|2[0-3]):([0-5]\d)$/)
    .optional(),
  endTime: z
    .string()
    .regex(/^([01]\d|2[0-3]):([0-5]\d)$/)
    .optional(),
  durationMinutes: z.number().int().min(1).max(1440).optional(),
  crossesMidnight: z.boolean().optional(),
  countsAsWork: z.boolean(),
  countsAsNight: z.boolean(),
  countsForStats: z.boolean(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
  icon: z.string().min(1),
  locationName: z.string().max(200).optional(),
  reminderProfileId: z.string().optional(),
  reminderProfile: smartReminderSettingsSchema.partial().optional(),
});

export const universalShiftSequenceItemSchema = z.object({
  id: z.string().min(1),
  shiftDefinitionId: z.string().min(1),
  labelOverride: z.string().max(80).optional(),
});

export const universalHolidayExceptionActionSchema = z.enum(['mark_off', 'use_shift_definition']);

export const universalHolidayExceptionSchema = z.object({
  id: z.string().min(1),
  date: dateStringSchema,
  holidayName: z.string().min(1).max(200),
  country: countryCodeSchema,
  action: universalHolidayExceptionActionSchema,
  shiftDefinitionId: z.string().min(1).optional(),
  paidOverride: z.boolean().optional(),
  appliesToWorkShiftsOnly: z.boolean().optional(),
});

export const universalOneOffExceptionActionSchema = z.enum(['mark_off', 'use_shift_definition']);

export const universalOneOffExceptionSchema = z.object({
  id: z.string().min(1),
  date: dateStringSchema,
  action: universalOneOffExceptionActionSchema,
  shiftDefinitionId: z.string().min(1).optional(),
  label: z.string().max(120).optional(),
  reason: z.string().max(500).optional(),
  paidOverride: z.boolean().optional(),
});

const universalShiftScheduleBaseSchema = z.object({
  version: z.literal(3),
  name: z.string().min(1).max(120),
  timezone: z.string().min(1),
  anchorDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  phaseOffset: z.number().int().min(0),
  shiftDefinitions: z.array(universalShiftDefinitionSchema).min(1),
  sequence: z.array(universalShiftSequenceItemSchema).min(1),
  holidayExceptions: z.array(universalHolidayExceptionSchema).optional(),
  oneOffExceptions: z.array(universalOneOffExceptionSchema).optional(),
  source: z.enum(['manual', 'ai', 'template', 'migration']),
  updatedAt: z.string().optional(),
  aiDraftMeta: z
    .object({
      originalPrompt: z.string(),
      confidence: z.number().min(0).max(1),
      assumptions: z.array(z.string()),
      unresolvedQuestions: z.array(z.string()),
      parserSource: z.enum(['remote_ai', 'local_fallback']).optional(),
      fallbackReason: z
        .enum(['not_configured', 'not_found', 'server_error', 'network_error', 'timeout'])
        .optional(),
    })
    .optional(),
});

function validateHolidayReplacementReferences(
  schedule: z.infer<typeof universalShiftScheduleBaseSchema>,
  ctx: z.RefinementCtx
): void {
  const definitionIds = new Set(schedule.shiftDefinitions.map((definition) => definition.id));
  schedule.holidayExceptions?.forEach((exception, index) => {
    if (exception.action !== 'use_shift_definition') return;
    if (!exception.shiftDefinitionId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Holiday replacement needs a shiftDefinitionId',
        path: ['holidayExceptions', index, 'shiftDefinitionId'],
      });
      return;
    }
    if (!definitionIds.has(exception.shiftDefinitionId)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Holiday replacement references an unknown shift definition',
        path: ['holidayExceptions', index, 'shiftDefinitionId'],
      });
    }
  });
  schedule.oneOffExceptions?.forEach((exception, index) => {
    if (exception.action !== 'use_shift_definition') return;
    if (!exception.shiftDefinitionId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'One-off replacement needs a shiftDefinitionId',
        path: ['oneOffExceptions', index, 'shiftDefinitionId'],
      });
      return;
    }
    if (!definitionIds.has(exception.shiftDefinitionId)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'One-off replacement references an unknown shift definition',
        path: ['oneOffExceptions', index, 'shiftDefinitionId'],
      });
    }
  });
}

export const universalShiftScheduleSchema = universalShiftScheduleBaseSchema.superRefine(
  validateHolidayReplacementReferences
);

/** Looser draft schema — used before the user saves */
export const universalShiftScheduleDraftSchema = universalShiftScheduleBaseSchema
  .extend({
    name: z.string().max(120),
    sequence: z.array(universalShiftSequenceItemSchema),
    shiftDefinitions: z.array(universalShiftDefinitionSchema),
  })
  .superRefine(validateHolidayReplacementReferences);

export type UniversalShiftDefinitionData = z.infer<typeof universalShiftDefinitionSchema>;
export type UniversalShiftScheduleData = z.infer<typeof universalShiftScheduleSchema>;

// ── Type Guards ───────────────────────────────────────────────────────────────

/**
 * Type Guards
 */

export function isShiftDay(value: unknown): value is z.infer<typeof shiftDaySchema> {
  return shiftDaySchema.safeParse(value).success;
}

export function isHoliday(value: unknown): value is z.infer<typeof holidaySchema> {
  return holidaySchema.safeParse(value).success;
}

export function isUserProfile(value: unknown): value is z.infer<typeof userProfileSchema> {
  return userProfileSchema.safeParse(value).success;
}

export function isShiftCycle(value: unknown): value is z.infer<typeof shiftCycleSchema> {
  return shiftCycleSchema.safeParse(value).success;
}

export function isShiftLogEntry(value: unknown): value is z.infer<typeof shiftLogEntrySchema> {
  return shiftLogEntrySchema.safeParse(value).success;
}

export function isShiftReport(value: unknown): value is z.infer<typeof shiftReportSchema> {
  return shiftReportSchema.safeParse(value).success;
}

export function isAppSettings(value: unknown): value is z.infer<typeof appSettingsSchema> {
  return appSettingsSchema.safeParse(value).success;
}

/**
 * Validation Helper Functions
 */

/**
 * Validate and parse shift day data
 */
export function validateShiftDay(data: unknown) {
  return shiftDaySchema.parse(data);
}

/**
 * Validate and parse holiday data
 */
export function validateHoliday(data: unknown) {
  return holidaySchema.parse(data);
}

/**
 * Validate and parse user profile data
 */
export function validateUserProfile(data: unknown) {
  return userProfileSchema.parse(data);
}

/**
 * Validate and parse shift cycle data
 */
export function validateShiftCycle(data: unknown) {
  return shiftCycleSchema.parse(data);
}

/**
 * Validate and parse shift log entry data
 */
export function validateShiftLogEntry(data: unknown) {
  return shiftLogEntrySchema.parse(data);
}

/**
 * Validate and parse shift report data
 */
export function validateShiftReport(data: unknown) {
  return shiftReportSchema.parse(data);
}

/**
 * Validate and parse app settings data
 */
export function validateAppSettings(data: unknown) {
  return appSettingsSchema.parse(data);
}

/**
 * Validate date string format
 */
export function validateDateString(date: string): boolean {
  return dateStringSchema.safeParse(date).success;
}

/**
 * Validate time string format
 */
export function validateTimeString(time: string): boolean {
  return timeStringSchema.safeParse(time).success;
}

/**
 * Validate email format
 */
export function validateEmail(email: string): boolean {
  return emailSchema.safeParse(email).success;
}

/**
 * Safe Parse Functions (return Result type instead of throwing)
 */

export function safeParseShiftDay(data: unknown) {
  return shiftDaySchema.safeParse(data);
}

export function safeParseHoliday(data: unknown) {
  return holidaySchema.safeParse(data);
}

export function safeParseUserProfile(data: unknown) {
  return userProfileSchema.safeParse(data);
}

export function safeParseShiftCycle(data: unknown) {
  return shiftCycleSchema.safeParse(data);
}

export function safeParseShiftLogEntry(data: unknown) {
  return shiftLogEntrySchema.safeParse(data);
}

export function safeParseShiftReport(data: unknown) {
  return shiftReportSchema.safeParse(data);
}

export function safeParseAppSettings(data: unknown) {
  return appSettingsSchema.safeParse(data);
}

/**
 * Export inferred types from Zod schemas
 */
export type ShiftDayType = z.infer<typeof shiftDaySchema>;
export type HolidayDataType = z.infer<typeof holidaySchema>;
export type UserProfileType = z.infer<typeof userProfileSchema>;
export type ShiftCycleType = z.infer<typeof shiftCycleSchema>;
export type ShiftLogEntryType = z.infer<typeof shiftLogEntrySchema>;
export type ShiftReportType = z.infer<typeof shiftReportSchema>;
export type AppSettingsType = z.infer<typeof appSettingsSchema>;
export type NotificationSettingsType = z.infer<typeof notificationSettingsSchema>;
export type EarningsConfigType = z.infer<typeof earningsConfigSchema>;
export type ShiftStatisticsType = z.infer<typeof shiftStatisticsSchema>;
export type APIErrorType = z.infer<typeof apiErrorSchema>;
export type PaginationParamsType = z.infer<typeof paginationParamsSchema>;
