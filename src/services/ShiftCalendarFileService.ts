import type { UniversalShiftSchedule } from '@/types';
import {
  buildUniversalScheduleIcs,
  importUniversalScheduleIcs,
  type CalendarExportOptions,
  type CalendarImportResult,
} from '@/utils/universalShiftCalendarUtils';

type FileSystemModule = typeof import('expo-file-system/legacy');
type DocumentPickerModule = typeof import('expo-document-picker');
type SharingModule = typeof import('expo-sharing');

async function getFileSystem(): Promise<FileSystemModule> {
  try {
    return await import('expo-file-system/legacy');
  } catch {
    throw new Error('Calendar file access is not available in this development build.');
  }
}

async function getDocumentPicker(): Promise<DocumentPickerModule> {
  try {
    return await import('expo-document-picker');
  } catch {
    throw new Error(
      'Calendar import requires a development build that includes document picker support.'
    );
  }
}

async function getSharing(): Promise<SharingModule> {
  try {
    return await import('expo-sharing');
  } catch {
    throw new Error('Calendar sharing requires a development build that includes sharing support.');
  }
}

function safeFileName(value: string): string {
  return (
    value
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'shift-schedule'
  );
}

export async function exportUniversalScheduleToCalendarFile(
  schedule: UniversalShiftSchedule,
  options: CalendarExportOptions
): Promise<{ uri: string; eventCount: number }> {
  const FileSystem = await getFileSystem();
  const ics = buildUniversalScheduleIcs(schedule, options);
  const eventCount = (ics.match(/BEGIN:VEVENT/g) ?? []).length;
  const calendarExportDir = `${FileSystem.cacheDirectory ?? ''}calendar-exports/`;
  const dirInfo = await FileSystem.getInfoAsync(calendarExportDir);
  if (!dirInfo.exists) {
    await FileSystem.makeDirectoryAsync(calendarExportDir, { intermediates: true });
  }

  const uri = `${calendarExportDir}${safeFileName(schedule.name)}-${options.startDate}-to-${options.endDate}.ics`;
  await FileSystem.writeAsStringAsync(uri, ics, {
    encoding: FileSystem.EncodingType.UTF8,
  });

  return { uri, eventCount };
}

export async function shareUniversalScheduleCalendarFile(uri: string): Promise<void> {
  const Sharing = await getSharing();
  const available = await Sharing.isAvailableAsync();
  if (!available) {
    throw new Error('Calendar sharing is not available on this device.');
  }

  await Sharing.shareAsync(uri, {
    mimeType: 'text/calendar',
    UTI: 'com.apple.ical.ics',
    dialogTitle: 'Export shift calendar',
  });
}

export async function pickAndImportUniversalScheduleCalendar(
  schedule: UniversalShiftSchedule
): Promise<CalendarImportResult | null> {
  const DocumentPicker = await getDocumentPicker();
  const FileSystem = await getFileSystem();
  const result = await DocumentPicker.getDocumentAsync({
    type: ['text/calendar', 'application/ics', 'text/plain'],
    copyToCacheDirectory: true,
    multiple: false,
  });

  if (result.canceled) return null;

  const asset = result.assets[0];
  if (!asset?.uri) return null;

  const contents = await FileSystem.readAsStringAsync(asset.uri, {
    encoding: FileSystem.EncodingType.UTF8,
  });

  return importUniversalScheduleIcs(schedule, contents, {
    replaceExistingDates: true,
    sourceName: asset.name ?? 'calendar file',
  });
}
