import {
  add,
  clampToZero,
  formatMoney,
  fromMajor,
  moneyParts,
  scale,
  subtract,
  sum,
  toMajor,
} from '@/engine/money';

describe('money helpers', () => {
  it('converts between major and minor units without float drift', () => {
    expect(fromMajor(742.5).minor).toBe(74250);
    expect(fromMajor(0.1).minor).toBe(10);
    expect(toMajor({ minor: 74250, currency: 'PEN' })).toBe(742.5);
  });

  it('adds and subtracts in integer space', () => {
    const a = fromMajor(100.1);
    const b = fromMajor(0.2);
    expect(add(a, b).minor).toBe(10030);
    expect(subtract(a, b).minor).toBe(9990);
  });

  it('avoids the classic 0.1 + 0.2 float error', () => {
    expect(add(fromMajor(0.1), fromMajor(0.2)).minor).toBe(30);
    expect(toMajor(add(fromMajor(0.1), fromMajor(0.2)))).toBe(0.3);
  });

  it('sums a list', () => {
    expect(sum([fromMajor(10), fromMajor(20), fromMajor(5)]).minor).toBe(3500);
  });

  it('scales and rounds', () => {
    expect(scale(fromMajor(100), 0.5).minor).toBe(5000);
    expect(scale(fromMajor(10), 1 / 3).minor).toBe(333);
  });

  it('clamps negatives to zero', () => {
    expect(clampToZero(fromMajor(-5)).minor).toBe(0);
    expect(clampToZero(fromMajor(5)).minor).toBe(500);
  });

  it('throws on currency mismatch', () => {
    expect(() => add(fromMajor(1, 'PEN'), fromMajor(1, 'USD'))).toThrow();
  });

  it('formats with symbol and hides round decimals when asked', () => {
    expect(formatMoney(fromMajor(742.5))).toBe('S/ 742.50');
    expect(formatMoney(fromMajor(20000), { hideDecimalsWhenRound: true })).toBe('S/ 20,000');
    expect(formatMoney(fromMajor(-42.9))).toBe('-S/ 42.90');
  });

  it('splits into parts for styled display', () => {
    const p = moneyParts(fromMajor(1234.5));
    expect(p.symbol).toBe('S/');
    expect(p.integer).toBe('1,234');
    expect(p.decimals).toBe('50');
    expect(p.sign).toBe('');
  });
});
