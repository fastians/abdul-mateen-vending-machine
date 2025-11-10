import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';

import { getDrinkById } from '@/data/drinks';
import type {
  ChangeBreakdown,
  Denomination,
  Drink,
  MachineEvent,
  PaymentMethod,
  TransactionSummary,
  VendingMachineState
} from '@/types/machine';
import { createInventoryService, InventoryService } from '@/services/inventory';
import { createPaymentProcessor, PaymentProcessor } from '@/services/payment';

// Constants
const INITIAL_MESSAGE = 'Select a drink to begin.';
const MAX_TRANSACTION_HISTORY = 20;
const DISPENSE_DELAY_MS = 1200;
const AUTO_RESET_DELAY_MS = 10000;
const REFUND_DELAY_MS = 1200;
const REFUND_DISPLAY_DELAY_MS = 10000;

/**
 * Appends a transaction summary to the history, maintaining a maximum limit.
 * @param history - Current transaction history
 * @param summary - Transaction summary to append
 * @returns Updated history with the new transaction (max MAX_TRANSACTION_HISTORY entries)
 */
function appendHistory(
  history: VendingMachineState['transactionHistory'],
  summary?: TransactionSummary
) {
  if (!summary) return history;
  const next = [...history, summary];
  return next.slice(-MAX_TRANSACTION_HISTORY);
}

/**
 * Records an event in the machine's event log.
 * @param state - Current machine state
 * @param type - Type of event to record
 * @param payload - Optional event payload
 * @returns Updated events array
 */
function recordEvent(
  state: VendingMachineState,
  type: VendingMachineState['events'][number]['type'],
  payload?: Record<string, unknown>
) {
  return [...state.events, { type, timestamp: Date.now(), payload }];
}

function createInitialState(changeBank: VendingMachineState['changeBank']): VendingMachineState {
  return {
    status: 'idle',
    selectedDrink: undefined,
    paymentMethod: undefined,
    message: INITIAL_MESSAGE,
    balance: 0,
    insertedCash: {},
    changeBank,
    lastTransaction: undefined,
    transactionHistory: [],
    events: []
  };
}

function vendingMachineReducer(state: VendingMachineState, event: MachineEvent): VendingMachineState {
  const selectedDrink = state.selectedDrink ? getDrinkById(state.selectedDrink) : undefined;

  switch (event.type) {
    case 'reset':
      return {
        ...createInitialState(state.changeBank),
        transactionHistory: state.transactionHistory,
        events: recordEvent(state, 'reset')
      };
    case 'selectDrink': {
      const drink = getDrinkById(event.drinkId);
      const priceLabel = drink ? `₩${drink.price.toLocaleString('en-US')}` : 'the price';
      return {
        ...state,
        status: 'awaitingPayment',
        selectedDrink: event.drinkId,
        paymentMethod: undefined,
        balance: 0,
        insertedCash: {},
        pendingChange: undefined,
        pendingRefund: undefined,
        errorCode: undefined,
        message: `Select cash or card to pay ${priceLabel}.`,
        events: recordEvent(state, 'selectItem', { drinkId: event.drinkId })
      };
    }
    case 'setPaymentMethod':
      return {
        ...state,
        paymentMethod: event.method,
        balance: event.method === 'card' ? 0 : state.balance,
        insertedCash: event.method === 'card' ? {} : state.insertedCash,
        pendingChange: event.method === 'card' ? undefined : state.pendingChange,
        pendingRefund: event.method === 'card' ? undefined : state.pendingRefund,
        message:
          event.method === 'cash'
            ? selectedDrink
              ? `Insert ₩${selectedDrink.price.toLocaleString('en-US')} in total to purchase ${selectedDrink.name}.`
              : 'Insert cash to continue.'
            : 'Tap authorize when you’re ready, then hold your card near the reader.',
        events: recordEvent(state, 'choosePaymentMethod', { method: event.method })
      };
    case 'cashInserted':
      return {
        ...state,
        paymentMethod: 'cash',
        balance: event.balance,
        insertedCash: event.insertedCash,
        changeBank: event.changeBank,
        message: selectedDrink
          ? event.balance >= (selectedDrink?.price ?? 0)
            ? 'Sufficient balance detected. Processing payment…'
            : `Balance ₩${event.balance.toLocaleString('en-US')} — need ₩${(
                Math.max(0, (selectedDrink?.price ?? 0) - event.balance)
              ).toLocaleString('en-US')} more.`
          : state.message,
        events: recordEvent(state, 'insertCash', { balance: event.balance })
      };
    case 'tapCard':
      return {
        ...state,
        status: 'processingPayment',
        pendingAuthorization: true,
        message: 'Authorizing card…',
        events: recordEvent(state, 'tapCard')
      };
    case 'paymentApproved':
      const transactionSummary =
        selectedDrink && state.paymentMethod
          ? {
              drinkId: selectedDrink.id,
              drinkName: selectedDrink.name,
              paymentMethod: state.paymentMethod,
              amountCharged: selectedDrink.price,
              change: event.change,
              completedAt: Date.now()
            }
          : state.lastTransaction;
      return {
        ...state,
        status: 'dispensing',
        pendingAuthorization: false,
        pendingChange: event.change,
        changeBank: event.changeBank ?? state.changeBank,
        balance: state.paymentMethod === 'cash' ? selectedDrink?.price ?? 0 : 0,
        insertedCash: {},
        lastTransaction: transactionSummary,
        message: selectedDrink ? `Dispensing ${selectedDrink.name}…` : 'Dispensing selection…',
        events: recordEvent(state, 'paymentApproved')
      };
    case 'paymentDeclined':
      return {
        ...state,
        status: 'awaitingPayment',
        paymentMethod: undefined,
        pendingAuthorization: false,
        errorCode: event.errorCode,
        message: event.message ?? 'Card declined. Try again or choose cash.',
        events: recordEvent(state, 'paymentDeclined', {
          errorCode: event.errorCode,
          message: event.message
        })
      };
    case 'dispenseSuccess':
      const transaction = state.lastTransaction;
      const drinkLabel = transaction?.drinkName ?? selectedDrink?.name ?? 'drink';
      const paymentLabel =
        transaction?.paymentMethod === 'card'
          ? 'card'
          : transaction?.paymentMethod === 'cash'
            ? 'cash'
            : 'payment';
      const shouldRecordNow = !(state.pendingChange && state.pendingChange.total > 0);
      const updatedHistory = shouldRecordNow
        ? appendHistory(state.transactionHistory, transaction)
        : state.transactionHistory;
      return {
        ...state,
        status: state.pendingChange && state.pendingChange.total > 0 ? 'refund' : 'complete',
        balance: state.pendingChange && state.pendingChange.total > 0 ? state.balance : 0,
        insertedCash: state.pendingChange && state.pendingChange.total > 0 ? state.insertedCash : {},
        pendingRefundBreakdown:
          state.pendingChange && state.pendingChange.total > 0 ? state.pendingRefundBreakdown : undefined,
        transactionHistory: updatedHistory,
        message:
          state.pendingChange && state.pendingChange.total > 0
            ? `Dispense complete. Returning ₩${state.pendingChange.total.toLocaleString('en-US')} in change.`
            : transaction
              ? `Dispense complete. ₩${transaction.amountCharged.toLocaleString('en-US')} ${paymentLabel} confirmed. Enjoy your ${drinkLabel}!`
              : `Dispense complete. Enjoy your ${drinkLabel}!`,
        events: recordEvent(state, 'dispenseSuccess')
      };
    case 'changeDispensed':
      const summary = state.lastTransaction
        ? { ...state.lastTransaction, change: event.change }
        : undefined;
      const changeMessage =
        summary && summary.change && summary.change.total > 0
          ? `Change returned. ₩${summary.change.total.toLocaleString('en-US')} dispensed.`
          : 'Change returned.';
      const finalDrink = summary?.drinkName ?? selectedDrink?.name ?? 'drink';
      return {
        ...state,
        pendingChange: undefined,
        status: 'complete',
        balance: 0,
        insertedCash: {},
        pendingRefund: undefined,
        pendingRefundBreakdown: undefined,
        lastTransaction: summary,
        transactionHistory: appendHistory(state.transactionHistory, summary),
        message: `${changeMessage} Enjoy your ${finalDrink}!`,
        events: recordEvent(state, 'refund')
      };
    case 'refundInitiated':
      return {
        ...state,
        status: 'refund',
        pendingRefund: event.amount,
        pendingRefundBreakdown: event.breakdown ?? state.pendingRefundBreakdown,
        changeBank: event.changeBank ?? state.changeBank,
        balance: 0,
        insertedCash: {},
        message:
          event.message ?? `Returning ₩${event.amount.toLocaleString('en-US')} to you. Please wait…`,
        events: recordEvent(state, 'refund', { amount: event.amount })
      };
    case 'refundComplete':
      return {
        ...createInitialState(state.changeBank),
        transactionHistory: state.transactionHistory,
        message: INITIAL_MESSAGE,
        events: recordEvent(state, 'refund')
      };
    case 'dispenseFailure':
      return {
        ...state,
        status: 'maintenance',
        errorCode: event.errorCode ?? 'DISPENSE_ERROR',
        message: 'Dispense error. Please contact support.',
        events: recordEvent(state, 'dispenseFailure', {
          errorCode: event.errorCode
        })
      };
    case 'cancel':
      return {
        ...state,
        status: 'refund',
        pendingRefund: event.amount,
        pendingRefundBreakdown: event.refund ?? state.pendingRefundBreakdown,
        changeBank: event.changeBank,
        balance: 0,
        insertedCash: {},
        message:
          event.message ??
          (event.amount > 0
            ? `Cancelling… returning ₩${event.amount.toLocaleString('en-US')}`
            : 'Order cancelled. No payment taken.'),
        events: recordEvent(state, 'cancel')
      };
    case 'enterMaintenance':
      return {
        ...state,
        status: 'maintenance',
        message: 'Maintenance mode. Customer access disabled.',
        events: recordEvent(state, 'maintenanceEnter')
      };
    case 'exitMaintenance':
      return {
        ...createInitialState(state.changeBank),
        transactionHistory: state.transactionHistory,
        events: recordEvent(state, 'maintenanceExit')
      };
    case 'setMessage':
      return {
        ...state,
        message: event.message
      };
    default:
      return state;
  }
}

export interface UseVendingMachineOptions {
  inventoryService?: InventoryService;
  paymentProcessor?: PaymentProcessor;
}

export interface VendingMachineActions {
  selectDrink(drinkId: string): void;
  choosePaymentMethod(method: PaymentMethod): void;
  insertCash(denomination: Denomination): void;
  authorizeCard(options?: { simulateResult?: 'approve' | 'decline'; errorCode?: string }): Promise<void>;
  cancelTransaction(): void;
  reset(): void;
  setCardSimulationResult(result: 'approve' | 'decline'): void;
  setStock(drinkId: Drink['id'], amount: number): void;
}

/**
 * Custom hook that manages the vending machine state and provides actions.
 * Handles inventory, payment processing, and state transitions.
 * 
 * @param options - Optional configuration for inventory service and payment processor
 * @returns Object containing machine state, actions, inventory slots, and transaction history
 */
export function useVendingMachine(options: UseVendingMachineOptions = {}) {
  // Create a persistent inventory service instance using useRef to survive remounts
  // This ensures inventory state persists even if component remounts (e.g., React StrictMode)
  const inventoryRef = useRef<InventoryService | null>(null);
  if (!inventoryRef.current) {
    inventoryRef.current = options.inventoryService ?? createInventoryService();
  }
  // Always use the provided service if available, otherwise use the persistent ref
  const inventory = options.inventoryService ?? inventoryRef.current;

  const paymentProcessor = useMemo(
    () => options.paymentProcessor ?? createPaymentProcessor(),
    [options.paymentProcessor]
  );

  const [inventoryVersion, setInventoryVersion] = useState(0);
  const [cardSimulationResult, setCardSimulationResultState] = useState<'approve' | 'decline'>(
    () => paymentProcessor.getCardSimulationMode?.() ?? 'approve'
  );

  useEffect(() => {
    paymentProcessor.setCardSimulationMode?.(cardSimulationResult);
  }, [paymentProcessor, cardSimulationResult]);

  const [state, dispatch] = useReducer(
    vendingMachineReducer,
    createInitialState(paymentProcessor.getChangeBank())
  );

  const inventorySlots = useMemo(() => {
    void inventoryVersion;
    return inventory.list();
  }, [inventory, inventoryVersion]);

  const selectDrink = useCallback(
    (drinkId: string) => {
      if (['processingPayment', 'dispensing', 'refund', 'maintenance'].includes(state.status)) {
        return;
      }

      if (!inventory.isInStock(drinkId as never)) {
        dispatch({ type: 'setMessage', message: 'Selected drink is out of stock.' });
        return;
      }

      dispatch({ type: 'selectDrink', drinkId: drinkId as never });
    },
    [inventory, state.status]
  );

  const choosePaymentMethod = useCallback(
    (method: PaymentMethod) => {
      if (!state.selectedDrink) {
        dispatch({ type: 'setMessage', message: 'Please select a drink first.' });
        return;
      }
      if (method === 'card' && state.balance > 0) {
        dispatch({
          type: 'setMessage',
          message: 'Cancel to retrieve inserted cash before switching to card.'
        });
        return;
      }
      if (method === state.paymentMethod) {
        return;
      }
      if (state.status !== 'awaitingPayment') {
        return;
      }
      dispatch({ type: 'setPaymentMethod', method });
    },
    [state.balance, state.paymentMethod, state.selectedDrink, state.status]
  );

  const insertCash = useCallback(
    (denomination: Denomination) => {
      if (!state.selectedDrink || state.paymentMethod !== 'cash') {
        dispatch({ type: 'setMessage', message: 'Select a drink before inserting cash.' });
        return;
      }
      if (state.status !== 'awaitingPayment') {
        return;
      }

      const result = paymentProcessor.acceptCash(denomination, state.balance, state.insertedCash);
      const changeBank = paymentProcessor.getChangeBank();
      dispatch({ type: 'cashInserted', balance: result.balance, insertedCash: result.insertedCash, changeBank });

      const drink = getDrinkById(state.selectedDrink);
      if (!drink) return;

      if (result.balance >= drink.price) {
        const { change, bank } = paymentProcessor.makeChange(drink.price, result.balance);
        if (change.shortage > 0) {
          const refund = paymentProcessor.refundInsertedCash(result.insertedCash);
          dispatch({
            type: 'refundInitiated',
            amount: refund.total,
            breakdown: refund,
            changeBank: paymentProcessor.getChangeBank(),
            message: 'Unable to provide change. Refunding payment.'
          });
          return;
        }

        dispatch({ type: 'paymentApproved', change, changeBank: bank });
        if (inventory.decrement(drink.id)) {
          setInventoryVersion((version) => version + 1);
        }
      } else {
        const remaining = drink.price - result.balance;
        dispatch({
          type: 'setMessage',
          message: `Balance ₩${result.balance.toLocaleString('en-US')} — insert ₩${remaining.toLocaleString('en-US')} more.`
        });
      }
    },
    [
      inventory,
      paymentProcessor,
      state.balance,
      state.insertedCash,
      state.paymentMethod,
      state.selectedDrink,
      state.status
    ]
  );

  const authorizeCard = useCallback(
    async (options?: { simulateResult?: 'approve' | 'decline'; errorCode?: string }) => {
      if (!state.selectedDrink || state.paymentMethod !== 'card') {
        dispatch({ type: 'setMessage', message: 'Select a drink before tapping card.' });
        return;
      }
      if (state.status !== 'awaitingPayment') {
        return;
      }
      dispatch({ type: 'tapCard' });
      const drink = getDrinkById(state.selectedDrink);
      if (!drink) return;

      const desiredResult = options?.simulateResult ?? cardSimulationResult;
      try {
        const result = await paymentProcessor.card.authorize(drink.price, {
          ...options,
          simulateResult: desiredResult
        });
        if (result.success) {
          dispatch({ type: 'paymentApproved', changeBank: paymentProcessor.getChangeBank() });
          if (inventory.decrement(drink.id)) {
            setInventoryVersion((version) => version + 1);
          }
        } else {
          dispatch({
            type: 'paymentDeclined',
            errorCode: result.errorCode,
            message: result.message
          });
        }
      } catch (error) {
        dispatch({
          type: 'paymentDeclined',
          errorCode: options?.errorCode ?? 'CARD_ERROR',
          message: error instanceof Error ? error.message : 'Unknown card error'
        });
      }
    },
    [cardSimulationResult, inventory, paymentProcessor, state.paymentMethod, state.selectedDrink, state.status]
  );

  const cancelTransaction = useCallback(() => {
    if (!['awaitingPayment', 'processingPayment'].includes(state.status)) {
      return;
    }

    let amount = state.balance;
    let refund: ChangeBreakdown | undefined;

    if (state.paymentMethod === 'cash' && amount > 0) {
      refund = paymentProcessor.refundInsertedCash(state.insertedCash);
      amount = refund.total;
    }

    if (state.paymentMethod === 'card') {
      amount = 0;
    }

    dispatch({
      type: 'cancel',
      amount,
      refund,
      changeBank: paymentProcessor.getChangeBank(),
      message:
        amount > 0
          ? `Cancelling… returning ₩${amount.toLocaleString('en-US')}`
          : 'Cancelling transaction…'
    });
  }, [
    paymentProcessor,
    state.balance,
    state.insertedCash,
    state.paymentMethod,
    state.status
  ]);

  const reset = useCallback(() => {
    dispatch({ type: 'reset' });
  }, []);

  const setStock = useCallback(
    (drinkId: Drink['id'], amount: number) => {
      if (amount < 0) return;
      inventory.setStock(drinkId, amount);
      setInventoryVersion((version) => version + 1);
    },
    [inventory]
  );

  useEffect(() => {
    if (state.status === 'dispensing') {
      const timer = setTimeout(() => dispatch({ type: 'dispenseSuccess' }), DISPENSE_DELAY_MS);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [dispatch, state.status]);

  useEffect(() => {
    if (state.status !== 'refund') {
      return undefined;
    }

    if (state.pendingChange) {
      const total = state.pendingChange.total ?? 0;
      if (total > 0) {
        const timer = setTimeout(
          () => dispatch({ type: 'changeDispensed', change: state.pendingChange! }),
          REFUND_DELAY_MS
        );
        return () => clearTimeout(timer);
      }

      dispatch({ type: 'changeDispensed', change: state.pendingChange });
      return undefined;
    }

    // For cancellations with refund, show refund breakdown then reset
    const refundTotal = state.pendingRefund ?? state.pendingRefundBreakdown?.total ?? 0;
    const delay = refundTotal > 0 ? REFUND_DISPLAY_DELAY_MS : REFUND_DELAY_MS;
    const timer = setTimeout(() => dispatch({ type: 'refundComplete' }), delay);
    return () => clearTimeout(timer);
  }, [dispatch, state.pendingChange, state.pendingRefund, state.pendingRefundBreakdown, state.status]);

  useEffect(() => {
    if (state.status === 'complete') {
      const timer = setTimeout(() => dispatch({ type: 'reset' }), AUTO_RESET_DELAY_MS);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [dispatch, state.status]);

  const actions: VendingMachineActions = useMemo(
    () => ({
      selectDrink,
      choosePaymentMethod,
      insertCash,
      authorizeCard,
      cancelTransaction,
      reset,
      setCardSimulationResult: (result: 'approve' | 'decline') => {
        setCardSimulationResultState(result);
        paymentProcessor.setCardSimulationMode?.(result);
      },
      setStock
    }),
    [selectDrink, choosePaymentMethod, insertCash, authorizeCard, cancelTransaction, reset, paymentProcessor, setStock]
  );

  return {
    state,
    actions,
    inventorySlots,
    paymentProcessor,
    transactionHistory: state.transactionHistory,
    cardSimulationResult
  } as const;
}

