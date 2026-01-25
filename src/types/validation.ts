/**
 * Runtime Type Validation with Zod
 *
 * This file contains Zod schemas for runtime validation of all application types.
 * It also exports type guards and validation helper functions.
 */

import { z } from 'zod';
import { ShiftPattern, EnergyLevel, ReportType } from './index';

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
 * Shift Pattern Schema
 */
export const shiftPatternSchema = z.nativeEnum(ShiftPattern);

/**
 * Shift Type Schema
 */
export const shiftTypeSchema = z.enum(['day', 'night', 'off']);

/**
 * Shift Day Schema
 */
export const shiftDaySchema = z.object({
  date: dateStringSchema,
  isWorkDay: z.boolean(),
  isNightShift: z.boolean(),
  shiftType: shiftTypeSchema,
  notes: z.string().optional(),
});

/**
 * Shift Cycle Schema
 */
export const shiftCycleSchema = z.object({
  patternType: shiftPatternSchema,
  daysOn: z.number().int().min(0).max(365),
  nightsOn: z.number().int().min(0).max(365),
  daysOff: z.number().int().min(0).max(365),
  startDate: dateStringSchema,
  phaseOffset: z.number().int().min(0),
  customPattern: z.array(shiftDaySchema).optional(),
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
export const notificationSettingsSchema = z.object({
  shift24HoursBefore: z.boolean(),
  shift4HoursBefore: z.boolean(),
  holidayAlerts: z.boolean(),
  patternChangeAlerts: z.boolean(),
  soundEnabled: z.boolean(),
  vibrationEnabled: z.boolean(),
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
