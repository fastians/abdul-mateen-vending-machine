import { CreditCard, Loader2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { DRINKS } from '@/data/drinks';
import type { Denomination, PaymentMethod, VendingMachineState } from '@/types/machine';

// Constants
const DENOMINATIONS = [100, 500, 1000, 5000, 10000] as const satisfies readonly Denomination[];

/**
 * Formats a number as Korean Won currency.
 * @param amount - Amount to format
 * @returns Formatted currency string (e.g., "₩1,100")
 */
function formatCurrency(amount: number) {
  return `₩${amount.toLocaleString('en-US')}`;
}

/**
 * Gets the price of a drink by its ID.
 * @param drinkId - Drink identifier
 * @returns Drink price or undefined if not found
 */
function getDrinkPrice(drinkId?: string) {
  if (!drinkId) return undefined;
  return DRINKS.find((drink) => drink.id === drinkId)?.price;
}

/**
 * Gets the display label for a drink by its ID.
 * @param drinkId - Drink identifier
 * @returns Drink name or the ID if not found
 */
function getDrinkLabel(drinkId?: string) {
  if (!drinkId) return undefined;
  return DRINKS.find((drink) => drink.id === drinkId)?.name ?? drinkId;
}

export interface PaymentPanelProps {
  status: VendingMachineState['status'];
  selectedDrink?: VendingMachineState['selectedDrink'];
  paymentMethod?: PaymentMethod;
  balance: number;
  onChooseMethod(method: PaymentMethod): void;
  onInsertCash(denomination: Denomination): void;
  onCancel(): void;
  onTapCard?(): void;
  showMethodSwitcher?: boolean;
}

export function PaymentPanel({
  status,
  selectedDrink,
  paymentMethod,
  balance,
  onChooseMethod,
  onInsertCash,
  onCancel,
  onTapCard,
  showMethodSwitcher = true
}: PaymentPanelProps) {
  const disableGlobal = status === 'maintenance' || !selectedDrink;
  const canChooseMethod = status === 'awaitingPayment' && !disableGlobal;
  const cashEnabled = canChooseMethod && paymentMethod === 'cash';
  const price = getDrinkPrice(selectedDrink);
  const isCardFlow = paymentMethod === 'card';
  const canCancel = ['awaitingPayment', 'processingPayment'].includes(status) && !disableGlobal;
  const isProcessingCard = status === 'processingPayment';
  const hasTapHandler = typeof onTapCard === 'function';
  const canTapCard =
    paymentMethod === 'card' && status === 'awaitingPayment' && !isProcessingCard && hasTapHandler;

  const amountRemaining =
    price && status === 'awaitingPayment'
      ? isCardFlow
        ? 0
        : Math.max(price - balance, 0)
      : undefined;
  const progressPercent = price
    ? isCardFlow
      ? status === 'dispensing' || status === 'complete' || status === 'refund'
        ? 100
        : status === 'processingPayment'
          ? 0
          : 0
      : Math.min((balance / price) * 100, 100)
    : 0;

  return (
    <div className="w-full space-y-6">
      {showMethodSwitcher && (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-dashed border-muted-foreground/40 bg-muted/30 px-4 py-3">
          <Button
            type="button"
            variant={paymentMethod === 'cash' ? 'default' : 'secondary'}
            disabled={!canChooseMethod}
            onClick={() => onChooseMethod('cash')}
          >
            Cash
          </Button>
          <Button
            type="button"
            variant={paymentMethod === 'card' ? 'default' : 'secondary'}
            disabled={!canChooseMethod}
            onClick={() => onChooseMethod('card')}
          >
            Card
          </Button>
          <Button type="button" variant="outline" onClick={onCancel} disabled={!canCancel}>
            Cancel
          </Button>
        </div>
      )}

      <div className="min-h-[200px] rounded-lg border bg-muted/20 px-6 py-6 transition-all duration-300">
        {paymentMethod === 'cash' ? (
            <div className="flex h-full flex-col">
            <h3 className="mb-4 text-sm font-semibold text-foreground">Insert Cash</h3>
            <div className="grid flex-1 grid-cols-2 gap-3 sm:grid-cols-3">
                {DENOMINATIONS.map((denomination) => (
                  <Button
                    key={denomination}
                    type="button"
                    onClick={() => onInsertCash(denomination)}
                    disabled={!cashEnabled}
                    className="h-12"
                  >
                    {formatCurrency(denomination)}
                  </Button>
                ))}
              </div>
            </div>
        ) : paymentMethod === 'card' ? (
          <div className="flex h-full flex-col justify-between gap-6">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm">
                  {isProcessingCard ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <CreditCard className="h-4 w-4" />
                  )}
                  <span className="font-medium text-foreground">
                  {isProcessingCard ? 'Authorizing payment…' : 'Ready to authorize'}
                  </span>
              </div>
            </div>
            <Button
              type="button"
              size="lg"
              onClick={() => onTapCard?.()}
              disabled={!canTapCard}
              className="h-12"
            >
              {isProcessingCard ? 'Authorizing…' : 'Tap card to authorize'}
            </Button>
            </div>
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
            Select payment method to continue.
            </div>
          )}
        </div>

      {selectedDrink && price && (
        <div className="rounded-lg border bg-muted/40 px-6 py-5">
          <div className="space-y-3 rounded-lg bg-card/50 px-4 py-4">
            <div className="flex items-baseline justify-between gap-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  {getDrinkLabel(selectedDrink)}
                </p>
                <p className="mt-1 text-sm font-semibold text-foreground">{formatCurrency(price)}</p>
              </div>
            </div>
            <div className="space-y-2">
              <div className="relative h-2 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className="absolute inset-y-0 left-0 rounded-full bg-primary transition-all duration-300"
                  style={{ width: `${progressPercent}%` }}
                  aria-hidden
                />
              </div>
              <div className="flex justify-between text-[11px] text-muted-foreground">
                <span>
                  {isCardFlow && status === 'processingPayment'
                    ? 'Authorizing…'
                    : isCardFlow && status === 'dispensing'
                      ? 'Payment approved'
                      : `Inserted ${formatCurrency(balance)}`}
                </span>
                <span>Target {formatCurrency(price)}</span>
              </div>
              {isCardFlow && status === 'processingPayment' && (
                <p className="text-[11px] text-muted-foreground">
                  Please wait while we process your payment…
                </p>
              )}
              {isCardFlow && status === 'dispensing' && (
                <p className="text-[11px] text-muted-foreground">
                  Payment successful! Preparing your drink…
                </p>
              )}
              {amountRemaining !== undefined && amountRemaining > 0 && !isCardFlow && (
                <p className="text-[11px] text-muted-foreground">
                  Add {formatCurrency(amountRemaining)} more
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {!showMethodSwitcher && (
        <div className="flex justify-center">
          <Button type="button" variant="ghost" onClick={onCancel} disabled={!canCancel}>
            Cancel
          </Button>
        </div>
      )}
    </div>
  );
}
