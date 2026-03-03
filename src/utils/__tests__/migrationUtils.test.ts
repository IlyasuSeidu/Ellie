import { ShiftPattern, RosterType, type ShiftCycle } from '@/types';
import { migrateOnboardingDataToV2, migrateShiftCycleToV2 } from '../migrationUtils';

describe('migrationUtils', () => {
  describe('migrateOnboardingDataToV2', () => {
    it('defaults legacy onboarding data to rotating', () => {
      const result = migrateOnboardingDataToV2({
        name: 'Alex',
        patternType: ShiftPattern.STANDARD_4_4_4,
      });

      expect(result.rosterType).toBe(RosterType.ROTATING);
    });

    it('infers fifo onboarding data from pattern', () => {
      const result = migrateOnboardingDataToV2({
        name: 'Alex',
        patternType: ShiftPattern.FIFO_8_6,
      });

      expect(result.rosterType).toBe(RosterType.FIFO);
    });
  });

  describe('migrateShiftCycleToV2', () => {
    it('adds rotating roster type to legacy cycle', () => {
      const legacy = {
        patternType: ShiftPattern.STANDARD_5_5_5,
        daysOn: 5,
        nightsOn: 5,
        daysOff: 5,
        startDate: '2026-01-01',
        phaseOffset: 0,
      } as Partial<ShiftCycle>;

      const migrated = migrateShiftCycleToV2(legacy);
      expect(migrated.rosterType).toBe(RosterType.ROTATING);
    });

    it('infers fifo roster type when fifoConfig exists', () => {
      const legacy = {
        patternType: ShiftPattern.FIFO_CUSTOM,
        daysOn: 14,
        nightsOn: 0,
        daysOff: 14,
        startDate: '2026-01-01',
        phaseOffset: 0,
        fifoConfig: {
          workBlockDays: 14,
          restBlockDays: 14,
          workBlockPattern: 'straight-days',
        },
      } as Partial<ShiftCycle>;

      const migrated = migrateShiftCycleToV2(legacy);
      expect(migrated.rosterType).toBe(RosterType.FIFO);
      expect(migrated.fifoConfig?.workBlockDays).toBe(14);
    });
  });
});
