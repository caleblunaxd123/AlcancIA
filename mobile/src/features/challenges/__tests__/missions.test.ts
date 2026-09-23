import { demoSnapshot } from '@/data/demo';
import { buildMissions } from '@/features/challenges/missions';

describe('buildMissions', () => {
  it('derives bounded progress from real financial data', () => {
    const missions = buildMissions(demoSnapshot);

    expect(missions).toHaveLength(3);
    for (const mission of missions) {
      expect(mission.progress).toBeGreaterThanOrEqual(0);
      expect(mission.progress).toBeLessThanOrEqual(mission.target);
      expect(mission.progressLabel.length).toBeGreaterThan(0);
    }
  });

  it('counts goals that have already started', () => {
    const mission = buildMissions(demoSnapshot).find((item) => item.id.startsWith('goals-5'));

    expect(mission?.progress).toBe(3);
  });

  it('does not reward inactivity as a no-delivery success', () => {
    const empty = { ...demoSnapshot, transactions: [] };
    const mission = buildMissions(empty, new Date(2026, 8, 22)).find((item) => item.id.startsWith('intentional-7'));
    expect(mission?.progress).toBe(0);
  });
});
