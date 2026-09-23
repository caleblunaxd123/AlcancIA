import { greeting, personalGreeting, todayLabel } from '@/utils/greeting';

const at = (h: number, m = 0) => new Date(2026, 8, 23, h, m);

describe('greeting', () => {
  it('says good night after midnight, not good morning', () => {
    expect(greeting(at(0, 58))).toBe('Buenas noches');
    expect(greeting(at(4, 59))).toBe('Buenas noches');
  });

  it('covers morning, afternoon and evening', () => {
    expect(greeting(at(5))).toBe('Buenos días');
    expect(greeting(at(11, 59))).toBe('Buenos días');
    expect(greeting(at(12))).toBe('Buenas tardes');
    expect(greeting(at(18, 59))).toBe('Buenas tardes');
    expect(greeting(at(19))).toBe('Buenas noches');
    expect(greeting(at(23, 30))).toBe('Buenas noches');
  });

  it('uses only the first name', () => {
    expect(personalGreeting('Caleb Daniel Luna', at(9))).toBe('Buenos días, Caleb');
    expect(personalGreeting('  ', at(9))).toBe('Buenos días');
  });

  it('formats today in Spanish', () => {
    expect(todayLabel(at(9))).toBe('Miércoles, 23 de septiembre');
  });
});
