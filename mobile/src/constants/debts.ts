import type { Debt } from '@/types/domain';

export const DEBT_KIND_LABELS: Record<Debt['kind'], string> = {
  card: 'Tarjeta',
  loan: 'Préstamo',
  installments: 'Compra en cuotas',
  credit: 'Crédito',
  personal: 'Deuda personal',
};

export const DEBT_KIND_ICONS: Record<Debt['kind'], string> = {
  card: 'credit-card',
  loan: 'landmark',
  installments: 'receipt',
  credit: 'wallet',
  personal: 'hand-coins',
};
