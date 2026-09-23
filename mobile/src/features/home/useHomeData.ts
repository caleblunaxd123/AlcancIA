import { useMemo } from 'react';

import { computeHomeData, type NextPayment } from './homeData';
import { useFinancialStore } from '@/store/financialStore';

export type { NextPayment };

export function useHomeData() {
  const snapshot = useFinancialStore((s) => s.snapshot);

  return useMemo(() => ({ snapshot, ...computeHomeData(snapshot) }), [snapshot]);
}
