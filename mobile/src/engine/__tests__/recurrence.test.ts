import { occurrencesBetween } from '@/engine/recurrence';
import { toISODate } from '@/utils/date';

describe('recurrence engine', () => {
  it('generates every weekly occurrence in an interval', () => {
    const dates = occurrencesBetween(
      { frequency: 'weekly', anchorDate: '2026-01-01' },
      new Date(2026, 0, 1),
      new Date(2026, 0, 31),
    ).map(toISODate);
    expect(dates).toEqual(['2026-01-01', '2026-01-08', '2026-01-15', '2026-01-22', '2026-01-29']);
  });

  it('clamps a monthly day to the end of shorter months without drifting', () => {
    const dates = occurrencesBetween(
      { frequency: 'monthly', anchorDate: '2026-01-31' },
      new Date(2026, 0, 1),
      new Date(2026, 2, 31),
    ).map(toISODate);
    expect(dates).toEqual(['2026-01-31', '2026-02-28', '2026-03-31']);
  });

  it('keeps yearly renewals in their anchor month', () => {
    const dates = occurrencesBetween(
      { frequency: 'yearly', anchorDate: '2026-09-22' },
      new Date(2026, 0, 1),
      new Date(2028, 11, 31),
    ).map(toISODate);
    expect(dates).toEqual(['2026-09-22', '2027-09-22', '2028-09-22']);
  });
});
