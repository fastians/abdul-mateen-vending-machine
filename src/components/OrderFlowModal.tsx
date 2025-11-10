import { useEffect, useMemo, useRef, useState } from 'react';

import { Button } from '@/components/ui/button';
import { PaymentPanel } from '@/components/PaymentPanel';
import { StatusPanel } from '@/components/StatusPanel';
import { getDrinkById } from '@/data/drinks';
import type { VendingMachineActions } from '@/state/vending-machine';
import type { VendingMachineState } from '@/types/machine';

// Constants
const PAYMENT_TO_STATUS_DELAY_MS = 800;
const ACTIVE_STATUSES: VendingMachineState['status'][] = ['processingPayment', 'dispensing', 'refund'];
type OrderStep = 'confirm' | 'payment' | 'status';

export interface OrderFlowModalProps {
  open: boolean;
  state: VendingMachineState;
  actions: VendingMachineActions;
  onRequestClose(): void;
}

/**
 * Determines the current step in the order flow based on machine state.
 * @param state - Current vending machine state
 * @returns Current order step
 */
function determineStep(state: VendingMachineState): OrderStep {
  if (
    ['dispensing', 'refund', 'complete'].includes(state.status) ||
    state.lastTransaction
  ) {
    return 'status';
  }
  if (state.paymentMethod || state.status === 'processingPayment') {
    return 'payment';
  }
  return 'confirm';
}

/**
 * Checks if the modal can be manually closed based on current state.
 * @param state - Current vending machine state
 * @param step - Current order step
 * @returns True if the modal can be closed
 */
function canManuallyClose(state: VendingMachineState, step: OrderStep) {
  if (step === 'confirm') {
    return true;
  }
  if (step === 'payment' && state.status === 'awaitingPayment' && state.balance === 0) {
    return true;
  }
  return !ACTIVE_STATUSES.includes(state.status);
}

const STEP_LABEL: Record<OrderStep, string> = {
  confirm: 'Select Payment Method',
  payment: 'Payment',
  status: 'Order Status'
};

/**
 * Modal component that guides users through the order flow:
 * 1. Confirm drink selection and payment method
 * 2. Process payment (cash or card)
 * 3. Show order status and completion
 * 
 * @param props - Component props
 */
export function OrderFlowModal({ open, state, actions, onRequestClose }: OrderFlowModalProps) {
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const step = useMemo(() => determineStep(state), [state]);
  const [currentStep, setCurrentStep] = useState<OrderStep>(step);
  const allowClose = canManuallyClose(state, step);

  // Delay transition to status screen after payment is approved to show progress bar fill
  useEffect(() => {
    if (step === 'status' && state.status === 'dispensing' && currentStep === 'payment') {
      const timer = setTimeout(() => {
        setCurrentStep('status');
      }, PAYMENT_TO_STATUS_DELAY_MS);
      return () => clearTimeout(timer);
    } else {
      setCurrentStep(step);
    }
  }, [step, state.status, currentStep]);

  useEffect(() => {
    if (!open) return undefined;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const dialog = dialogRef.current;
    if (dialog) {
      const focusable = dialog.querySelector<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      focusable?.focus();
    }
    return () => {
      previouslyFocused?.focus();
    };
  }, [open]);

  if (!open) return null;

  const drink = state.selectedDrink ? getDrinkById(state.selectedDrink) : undefined;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-3 backdrop-blur transition-opacity duration-300 sm:p-4">
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        className="relative flex w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-border/40 bg-white shadow-2xl transition-all duration-300 sm:rounded-3xl"
        style={{ maxHeight: '90vh' }}
      >
        <header className="flex items-center justify-between gap-4 border-b border-border/60 bg-muted px-4 py-4 sm:px-6 sm:py-5">
          <h2 className="text-base font-semibold text-foreground sm:text-lg">{STEP_LABEL[currentStep]}</h2>
          {allowClose && (
            <button
              type="button"
              onClick={onRequestClose}
              className="flex h-8 w-8 items-center justify-center rounded-full border border-transparent text-muted-foreground transition hover:border-border hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 sm:h-9 sm:w-9"
            >
              <span className="text-lg leading-none sm:text-xl">&times;</span>
              <span className="sr-only">Close</span>
            </button>
          )}
        </header>
        <div className="min-h-[320px] overflow-y-auto px-4 py-6 transition-all duration-300 sm:min-h-[400px] sm:px-6 sm:py-8">
          {currentStep === 'confirm' ? (
            <ConfirmStep
              drinkLabel={drink?.name ?? state.selectedDrink ?? 'drink'}
              price={drink?.price}
              onChooseMethod={actions.choosePaymentMethod}
              onCancel={onRequestClose}
            />
          ) : null}
          {currentStep === 'payment' ? (
            <PaymentPanel
              status={state.status}
              selectedDrink={state.selectedDrink}
              paymentMethod={state.paymentMethod}
              balance={state.balance}
              onChooseMethod={actions.choosePaymentMethod}
              onInsertCash={actions.insertCash}
              onCancel={actions.cancelTransaction}
              onTapCard={() => void actions.authorizeCard()}
              showMethodSwitcher={false}
            />
          ) : null}
          {currentStep === 'status' ? (
            <StatusPanel state={state} onBuyAgain={onRequestClose} />
          ) : null}
        </div>
      </div>
    </div>
  );
}

interface ConfirmStepProps {
  drinkLabel: string;
  price?: number;
  onChooseMethod(method: 'cash' | 'card'): void;
  onCancel(): void;
}

function ConfirmStep({ drinkLabel, price, onChooseMethod, onCancel }: ConfirmStepProps) {
  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-4 sm:gap-6">
      <div className="rounded-xl border border-border/60 bg-muted/30 px-4 py-6 text-center sm:rounded-2xl sm:px-6 sm:py-8">
        <p className="text-xl font-semibold text-foreground sm:text-2xl">{drinkLabel}</p>
        {price !== undefined && (
          <p className="mt-2 text-base font-medium text-muted-foreground sm:mt-3 sm:text-lg">
            {`₩${price.toLocaleString('en-US')}`}
          </p>
        )}
      </div>
      <div className="flex flex-col gap-2.5 sm:flex-row sm:justify-center sm:gap-3">
        <Button
          size="lg"
          className="h-11 flex-1 text-sm sm:h-12 sm:text-base"
          onClick={() => onChooseMethod('cash')}
        >
          Pay with Cash
        </Button>
        <Button
          size="lg"
          className="h-11 flex-1 text-sm sm:h-12 sm:text-base"
          variant="secondary"
          onClick={() => onChooseMethod('card')}
        >
          Pay with Card
        </Button>
      </div>
      <Button
        variant="ghost"
        onClick={onCancel}
        className="self-center text-xs text-muted-foreground sm:text-sm"
      >
        Choose a different drink
      </Button>
    </div>
  );
}
