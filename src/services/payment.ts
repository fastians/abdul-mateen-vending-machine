import { applyChange, calculateChange, createDefaultChangeBank, depositCash } from '@/services/change';
import type { ChangeBank } from '@/services/change';
import type { ChangeBreakdown, Denomination, PaymentResult } from '@/types/machine';

export interface CashAcceptanceResult {
  balance: number;
  insertedCash: Partial<Record<Denomination, number>>;
  changeBank: ChangeBank;
}

export class CashHandler {
  accept(
    denomination: Denomination,
    currentBalance: number,
    currentInserted: Partial<Record<Denomination, number>>,
    bank: ChangeBank
  ): CashAcceptanceResult {
    const updatedInserted = {
      ...currentInserted,
      [denomination]: (currentInserted[denomination] ?? 0) + 1
    };

    return {
      balance: currentBalance + denomination,
      insertedCash: updatedInserted,
      changeBank: depositCash(bank, denomination)
    };
  }

  makeChange(price: number, balance: number, bank: ChangeBank): { change: ChangeBreakdown; bank: ChangeBank } {
    const changeDue = Math.max(0, balance - price);
    const breakdown = calculateChange(changeDue, bank);
    const updatedBank = applyChange(bank, breakdown);
    return { change: breakdown, bank: updatedBank };
  }
}

export interface CardAuthorizationOptions {
  delayMs?: number;
  simulateResult?: 'approve' | 'decline';
  errorCode?: string;
}

export class CardHandler {
  private simulationMode: 'approve' | 'decline' = 'approve';

  constructor(private defaultDelay = 1200) {}

  setSimulationMode(mode: 'approve' | 'decline') {
    this.simulationMode = mode;
  }

  getSimulationMode() {
    return this.simulationMode;
  }

  async authorize(amount: number, options: CardAuthorizationOptions = {}): Promise<PaymentResult> {
    const delay = options.delayMs ?? this.defaultDelay;
    await new Promise((resolve) => setTimeout(resolve, delay));

    const result = options.simulateResult ?? this.simulationMode ?? 'approve';
    if (result === 'approve') {
      return {
        success: true,
        message: `Payment approved for ₩${amount.toLocaleString('en-US')}`
      };
    }

    return {
      success: false,
      message: 'Card declined. Please try again or choose another payment method.',
      errorCode: options.errorCode ?? 'DECLINED'
    };
  }
}

export interface PaymentProcessorConfig {
  initialBank?: ChangeBank;
  cardDelayMs?: number;
}

export class PaymentProcessor {
  readonly cash: CashHandler;
  readonly card: CardHandler;
  private bank: ChangeBank;

  constructor(config: PaymentProcessorConfig = {}) {
    this.cash = new CashHandler();
    this.card = new CardHandler(config.cardDelayMs);
    this.bank = config.initialBank ?? createDefaultChangeBank();
  }

  getChangeBank(): ChangeBank {
    return { ...this.bank };
  }

  setChangeBank(bank: ChangeBank): void {
    this.bank = { ...bank };
  }

  setCardSimulationMode(mode: 'approve' | 'decline') {
    this.card.setSimulationMode(mode);
  }

  getCardSimulationMode(): 'approve' | 'decline' {
    return this.card.getSimulationMode();
  }

  acceptCash(
    denomination: Denomination,
    balance: number,
    insertedCash: Partial<Record<Denomination, number>>
  ): { balance: number; insertedCash: Partial<Record<Denomination, number>> } {
    const result = this.cash.accept(denomination, balance, insertedCash, this.bank);
    this.bank = result.changeBank;
    return {
      balance: result.balance,
      insertedCash: result.insertedCash
    };
  }

  makeChange(price: number, balance: number): { change: ChangeBreakdown; bank: ChangeBank } {
    const previousBank = this.getChangeBank();
    const { change, bank } = this.cash.makeChange(price, balance, this.bank);
    if (change.shortage > 0) {
      this.bank = previousBank;
      return { change, bank: previousBank };
    }
    this.bank = bank;
    return { change, bank: this.bank };
  }

  refundInsertedCash(insertedCash: Partial<Record<Denomination, number>>): ChangeBreakdown {
    let total = 0;
    const denominations: Partial<Record<Denomination, number>> = {};
    const nextBank: ChangeBank = { ...this.bank };

    for (const [denomString, count] of Object.entries(insertedCash)) {
      const denomination = Number(denomString) as Denomination;
      if (!count || count <= 0) continue;
      total += denomination * count;
      denominations[denomination] = count;
      nextBank[denomination] = Math.max(0, (nextBank[denomination] ?? 0) - count);
    }

    this.bank = nextBank;
    return {
      total,
      shortage: 0,
      denominations
    };
  }
}

export function createPaymentProcessor(config?: PaymentProcessorConfig): PaymentProcessor {
  return new PaymentProcessor(config);
}

