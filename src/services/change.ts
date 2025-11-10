import type { ChangeBreakdown, Denomination } from '@/types/machine';

export type ChangeBank = Record<Denomination, number>;

const DENOMINATIONS: Denomination[] = [10000, 5000, 1000, 500, 100];

export function calculateChange(amount: number, bank: ChangeBank): ChangeBreakdown {
  if (amount <= 0) {
    return {
      total: 0,
      shortage: 0,
      denominations: {}
    };
  }

  let remaining = amount;
  const breakdown: Partial<Record<Denomination, number>> = {};

  for (const denom of DENOMINATIONS) {
    if (remaining < denom) continue;
    const available = bank[denom] ?? 0;
    if (available === 0) continue;
    const needed = Math.floor(remaining / denom);
    const used = Math.min(needed, available);
    if (used > 0) {
      breakdown[denom] = used;
      remaining -= used * denom;
    }
  }

  return {
    total: amount - remaining,
    shortage: remaining,
    denominations: breakdown
  };
}

export function applyChange(bank: ChangeBank, change: ChangeBreakdown): ChangeBank {
  const next = { ...bank };
  for (const [denominationString, count] of Object.entries(change.denominations)) {
    const denomination = Number(denominationString) as Denomination;
    next[denomination] = Math.max(0, (next[denomination] ?? 0) - (count ?? 0));
  }
  return next;
}

export function depositCash(bank: ChangeBank, denomination: Denomination): ChangeBank {
  return {
    ...bank,
    [denomination]: (bank[denomination] ?? 0) + 1
  };
}

export function createDefaultChangeBank(): ChangeBank {
  return {
    100: 20,
    500: 20,
    1000: 10,
    5000: 4,
    10000: 2
  };
}



