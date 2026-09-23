import {
  allocateByWeights,
  groupBalances,
  proportionalPercents,
  sharesMatchTotal,
  splitExpense,
  suggestTransfers,
} from '@/engine/split';
import { fromMajor } from '@/engine/money';
import type { GroupMember, SharedExpense, Settlement } from '@/types/shared';

const me: GroupMember = { id: 'me', name: 'Caleb', isMe: true, incomeMinor: 350000 };
const ana: GroupMember = { id: 'ana', name: 'Ana', isMe: false, incomeMinor: 500000 };
const luis: GroupMember = { id: 'luis', name: 'Luis', isMe: false };

const sum = (shares: { amountMinor: number }[]) => shares.reduce((a, s) => a + s.amountMinor, 0);

describe('allocateByWeights', () => {
  it('splits evenly when it divides cleanly', () => {
    expect(allocateByWeights(9000, ['a', 'b', 'c'], [1, 1, 1]).map((s) => s.amountMinor)).toEqual([3000, 3000, 3000]);
  });

  it('never loses or invents a céntimo: S/ 100.00 among 3', () => {
    const shares = allocateByWeights(10000, ['a', 'b', 'c'], [1, 1, 1]);
    expect(sum(shares)).toBe(10000);
    expect(shares.map((s) => s.amountMinor).sort()).toEqual([3333, 3333, 3334]);
  });

  it('sums exactly for awkward amounts and weights', () => {
    for (const total of [1, 7, 101, 99999, 123457]) {
      expect(sum(allocateByWeights(total, ['a', 'b', 'c', 'd'], [3, 1, 7, 2]))).toBe(total);
    }
  });

  it('falls back to even split when all weights are zero or invalid', () => {
    expect(allocateByWeights(1000, ['a', 'b'], [0, Number.NaN]).map((s) => s.amountMinor)).toEqual([500, 500]);
  });

  it('handles zero total and no members', () => {
    expect(sum(allocateByWeights(0, ['a', 'b'], [1, 1]))).toBe(0);
    expect(allocateByWeights(500, [], [])).toEqual([]);
  });
});

describe('splitExpense', () => {
  it('equal split', () => {
    expect(splitExpense(12000, [me, ana, luis], 'equal').map((s) => s.amountMinor)).toEqual([4000, 4000, 4000]);
  });

  it('proportional to income: 3500 vs 5000 → ~41% / 59%', () => {
    const shares = splitExpense(10000, [me, ana], 'proportional');
    expect(sum(shares)).toBe(10000);
    expect(shares[0]!.amountMinor).toBe(4118);
    expect(shares[1]!.amountMinor).toBe(5882);
    expect(proportionalPercents([me, ana])).toEqual({ me: 41, ana: 59 });
  });

  it('members without income carry nothing in proportional mode', () => {
    const shares = splitExpense(9000, [me, ana, luis], 'proportional');
    expect(shares.find((s) => s.memberId === 'luis')!.amountMinor).toBe(0);
    expect(sum(shares)).toBe(9000);
  });
});

describe('sharesMatchTotal', () => {
  it('accepts exact custom shares and rejects mismatches / negatives', () => {
    expect(sharesMatchTotal([{ memberId: 'a', amountMinor: 700 }, { memberId: 'b', amountMinor: 300 }], 1000)).toBe(true);
    expect(sharesMatchTotal([{ memberId: 'a', amountMinor: 700 }, { memberId: 'b', amountMinor: 200 }], 1000)).toBe(false);
    expect(sharesMatchTotal([{ memberId: 'a', amountMinor: 1200 }, { memberId: 'b', amountMinor: -200 }], 1000)).toBe(false);
  });
});

describe('balances and transfers', () => {
  const expense = (id: string, paidBy: string, major: number, members: GroupMember[]): SharedExpense => ({
    id,
    groupId: 'g',
    description: id,
    amount: fromMajor(major),
    paidBy,
    mode: 'equal',
    shares: splitExpense(fromMajor(major).minor, members, 'equal'),
    date: '2026-09-01',
  });

  it('whoever paid is owed the others’ shares', () => {
    const b = groupBalances(['me', 'ana', 'luis'], [expense('cena', 'me', 90, [me, ana, luis])], []);
    expect(b).toEqual({ me: 6000, ana: -3000, luis: -3000 });
    expect(suggestTransfers(b)).toEqual([
      { from: 'ana', to: 'me', amountMinor: 3000 },
      { from: 'luis', to: 'me', amountMinor: 3000 },
    ]);
  });

  it('nets multiple expenses and balances always sum to zero', () => {
    const b = groupBalances(
      ['me', 'ana', 'luis'],
      [expense('cena', 'me', 90, [me, ana, luis]), expense('taxi', 'ana', 30, [me, ana, luis])],
      [],
    );
    expect(Object.values(b).reduce((a, v) => a + v, 0)).toBe(0);
    // cena 90 (me paid, 30 each) + taxi 30 (ana paid, 10 each):
    // me 90−30−10 = 50 · ana 30−30−10 = −10 · luis −30−10 = −40
    expect(b).toEqual({ me: 5000, ana: -1000, luis: -4000 });
  });

  it('a settlement clears the debt', () => {
    const settle: Settlement = { id: 's', groupId: 'g', from: 'ana', to: 'me', amount: fromMajor(30), date: '2026-09-02' };
    const b = groupBalances(['me', 'ana'], [expense('cena', 'me', 60, [me, ana])], [settle]);
    expect(b).toEqual({ me: 0, ana: 0 });
    expect(suggestTransfers(b)).toEqual([]);
  });

  it('needs at most n−1 transfers', () => {
    const b = { a: 5000, b: 2000, c: -4000, d: -3000 };
    const t = suggestTransfers(b);
    expect(t.length).toBeLessThanOrEqual(3);
    expect(t.reduce((a, x) => a + x.amountMinor, 0)).toBe(7000);
  });
});
