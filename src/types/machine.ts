export type Denomination = 100 | 500 | 1000 | 5000 | 10000;

export interface Drink {
  id: 'cola' | 'water' | 'coffee';
  name: string;
  price: number;
}

export interface InventorySlot {
  drinkId: Drink['id'];
  stock: number;
}

export type MachineStatus =
  | 'idle'
  | 'selectionPending'
  | 'awaitingPayment'
  | 'processingPayment'
  | 'dispensing'
  | 'refund'
  | 'complete'
  | 'error'
  | 'maintenance';

export type PaymentMethod = 'cash' | 'card';

export interface ChangeBreakdown {
  total: number;
  shortage: number;
  denominations: Partial<Record<Denomination, number>>;
}

export interface PaymentResult {
  success: boolean;
  message: string;
  change?: ChangeBreakdown;
  errorCode?: string;
}

export interface TransactionSummary {
  drinkId?: Drink['id'];
  drinkName?: string;
  paymentMethod?: PaymentMethod;
  amountCharged: number;
  change?: ChangeBreakdown;
  completedAt: number;
}

export interface TransactionEvent {
  type:
    | 'selectItem'
    | 'choosePaymentMethod'
    | 'insertCash'
    | 'tapCard'
    | 'paymentApproved'
    | 'paymentDeclined'
    | 'cancel'
    | 'dispenseSuccess'
    | 'dispenseFailure'
    | 'refund'
    | 'maintenanceEnter'
    | 'maintenanceExit'
    | 'reset';
  timestamp: number;
  payload?: Record<string, unknown>;
}

export interface VendingMachineState {
  status: MachineStatus;
  selectedDrink?: Drink['id'];
  paymentMethod?: PaymentMethod;
  balance: number;
  insertedCash: Partial<Record<Denomination, number>>;
  changeBank: Record<Denomination, number>;
  message: string;
  errorCode?: string;
  pendingAuthorization?: boolean;
  pendingChange?: ChangeBreakdown;
  pendingRefund?: number;
  pendingRefundBreakdown?: ChangeBreakdown;
  lastTransaction?: TransactionSummary;
  transactionHistory: TransactionSummary[];
  events: TransactionEvent[];
}

export type MachineEvent =
  | { type: 'userApproach' }
  | { type: 'selectDrink'; drinkId: Drink['id'] }
  | { type: 'setPaymentMethod'; method: PaymentMethod }
  | {
      type: 'cancel';
      amount: number;
      refund?: ChangeBreakdown;
      changeBank: Record<Denomination, number>;
      message?: string;
    }
  | {
      type: 'cashInserted';
      balance: number;
      insertedCash: Partial<Record<Denomination, number>>;
      changeBank: Record<Denomination, number>;
    }
  | { type: 'tapCard' }
  | { type: 'paymentApproved'; change?: ChangeBreakdown; changeBank?: Record<Denomination, number> }
  | { type: 'paymentDeclined'; errorCode?: string; message?: string }
  | { type: 'dispenseSuccess' }
  | { type: 'dispenseFailure'; errorCode?: string }
  | { type: 'refundComplete' }
  | { type: 'changeDispensed'; change: ChangeBreakdown }
  | {
      type: 'refundInitiated';
      amount: number;
      breakdown?: ChangeBreakdown;
      changeBank?: Record<Denomination, number>;
      message?: string;
    }
  | { type: 'reset' }
  | { type: 'enterMaintenance' }
  | { type: 'exitMaintenance' }
  | { type: 'setMessage'; message: string };

