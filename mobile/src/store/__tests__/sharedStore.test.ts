import { money } from '@/engine/money';
import { splitExpense } from '@/engine/split';
import { summarizeGroup } from '@/features/shared/summary';
import { useSharedStore } from '@/store/sharedStore';

function createCouple() {
  const r = useSharedStore.getState().createGroup({ name: 'Casa', kind: 'couple', me: { name: 'Caleb' }, others: [{ name: 'Ana' }] });
  if (!r.ok) throw new Error(r.error);
  return useSharedStore.getState().groups.find((g) => g.id === r.value)!;
}

describe('sharedStore', () => {
  beforeEach(() => useSharedStore.getState().reset());

  it('creates a group with me + others and exactly one "me"', () => {
    const g = createCouple();
    expect(g.members.map((m) => m.name)).toEqual(['Caleb', 'Ana']);
    expect(g.members.filter((m) => m.isMe)).toHaveLength(1);
  });

  it('validates groups: name, people and duplicates', () => {
    const s = useSharedStore.getState();
    expect(s.createGroup({ name: '', kind: 'couple', me: { name: 'Caleb' }, others: [{ name: 'Ana' }] }).ok).toBe(false);
    expect(s.createGroup({ name: 'X', kind: 'couple', me: { name: 'Caleb' }, others: [{ name: '  ' }] }).ok).toBe(false);
    expect(s.createGroup({ name: 'X', kind: 'couple', me: { name: 'Ana' }, others: [{ name: 'ana' }] }).ok).toBe(false);
  });

  it('adds a valid expense and derives who owes whom', () => {
    const g = createCouple();
    const [me, ana] = g.members;
    const r = useSharedStore.getState().addExpense({
      groupId: g.id, description: 'Súper', amount: money(12000), paidBy: me!.id, mode: 'equal',
      shares: splitExpense(12000, g.members, 'equal'), date: '2026-09-23',
    });
    expect(r.ok).toBe(true);
    const s = useSharedStore.getState();
    const summary = summarizeGroup(g, s.expenses, s.settlements);
    expect(summary.myBalanceMinor).toBe(6000);
    expect(summary.transfers).toEqual([{ from: ana!.id, to: me!.id, amountMinor: 6000 }]);
  });

  it('rejects expenses whose shares do not add up or reference strangers', () => {
    const g = createCouple();
    const [me] = g.members;
    const base = { groupId: g.id, description: 'Cena', amount: money(10000), paidBy: me!.id, mode: 'custom' as const, date: '2026-09-23' };
    expect(useSharedStore.getState().addExpense({ ...base, shares: [{ memberId: me!.id, amountMinor: 5000 }] }).ok).toBe(false);
    expect(useSharedStore.getState().addExpense({ ...base, shares: [{ memberId: 'intruso', amountMinor: 10000 }] }).ok).toBe(false);
    expect(useSharedStore.getState().addExpense({ ...base, paidBy: 'intruso', shares: splitExpense(10000, g.members, 'equal') }).ok).toBe(false);
  });

  it('a settlement brings the group back to even; deleting a group removes its data', () => {
    const g = createCouple();
    const [me, ana] = g.members;
    useSharedStore.getState().addExpense({
      groupId: g.id, description: 'Luz', amount: money(8000), paidBy: me!.id, mode: 'equal',
      shares: splitExpense(8000, g.members, 'equal'), date: '2026-09-23',
    });
    expect(useSharedStore.getState().addSettlement({ groupId: g.id, from: ana!.id, to: me!.id, amount: money(4000), date: '2026-09-24' }).ok).toBe(true);
    const s = useSharedStore.getState();
    expect(summarizeGroup(g, s.expenses, s.settlements).myBalanceMinor).toBe(0);

    useSharedStore.getState().deleteGroup(g.id);
    const after = useSharedStore.getState();
    expect(after.groups).toHaveLength(0);
    expect(after.expenses).toHaveLength(0);
    expect(after.settlements).toHaveLength(0);
  });

  it('rejects settling with yourself', () => {
    const g = createCouple();
    const [me] = g.members;
    expect(useSharedStore.getState().addSettlement({ groupId: g.id, from: me!.id, to: me!.id, amount: money(100), date: '2026-09-24' }).ok).toBe(false);
  });
});
