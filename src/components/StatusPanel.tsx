import { useState, useEffect } from 'react';

import { Button } from '@/components/ui/button';
import type { VendingMachineState } from '@/types/machine';

// Constants
const AUTO_RESET_COUNTDOWN_SECONDS = 10;

/**
 * Formats a number as Korean Won currency.
 * @param amount - Amount to format
 * @returns Formatted currency string (e.g., "₩1,100")
 */
function formatCurrency(amount: number) {
  return `₩${amount.toLocaleString('en-US')}`;
}

export interface StatusPanelProps {
  state: VendingMachineState;
  onBuyAgain?: () => void;
}

export function StatusPanel({ state, onBuyAgain }: StatusPanelProps) {
  const [countdown, setCountdown] = useState<number | null>(null);
  const transactionSummary =
    state.status === 'complete' && state.lastTransaction ? state.lastTransaction : undefined;
  const pendingRefundTotal = state.pendingRefundBreakdown?.total ?? state.pendingRefund ?? undefined;

  useEffect(() => {
    if (state.status === 'complete' && onBuyAgain) {
      setCountdown(AUTO_RESET_COUNTDOWN_SECONDS);
      const interval = setInterval(() => {
        setCountdown((prev) => {
          if (prev === null || prev <= 1) {
            clearInterval(interval);
            if (prev === 1) {
              onBuyAgain();
            }
            return null;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(interval);
    } else if (
      state.status === 'refund' &&
      onBuyAgain &&
      pendingRefundTotal !== undefined &&
      pendingRefundTotal > 0
    ) {
      setCountdown(AUTO_RESET_COUNTDOWN_SECONDS);
      const interval = setInterval(() => {
        setCountdown((prev) => {
          if (prev === null || prev <= 1) {
            clearInterval(interval);
            if (prev === 1 && onBuyAgain) {
              onBuyAgain();
            }
            return null;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(interval);
    } else {
      setCountdown(null);
    }
    return undefined;
  }, [state.status, onBuyAgain, pendingRefundTotal]);

  const cashInsertedTotal =
    transactionSummary?.paymentMethod === 'cash'
      ? transactionSummary.amountCharged + (transactionSummary.change?.total ?? 0)
      : state.status === 'refund'
        ? pendingRefundTotal
      : undefined;

  return (
    <div className="w-full space-y-4">
      <section className="rounded-lg bg-card/40 px-6 py-5" aria-live="polite">
        <p className="text-base font-semibold text-foreground">{state.message}</p>
      </section>

      {(transactionSummary || cashInsertedTotal !== undefined) && (
        <section className="rounded-lg border bg-muted/30 px-6 py-5">
          <p className="mb-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Receipt</p>
          <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
            {cashInsertedTotal !== undefined && (
              <div>
                <p className="text-xs text-muted-foreground">Inserted</p>
                <p className="mt-1 font-semibold text-foreground">{formatCurrency(cashInsertedTotal)}</p>
              </div>
            )}
            {transactionSummary && (
              <>
                <div>
                  <p className="text-xs text-muted-foreground">Charged</p>
                  <p className="mt-1 font-semibold text-foreground">
                    {formatCurrency(transactionSummary.amountCharged)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Payment</p>
                  <p className="mt-1 font-semibold text-foreground">
                    {transactionSummary.paymentMethod === 'cash' ? 'Cash' : 'Card'}
                  </p>
                </div>
                {transactionSummary.change && transactionSummary.change.total > 0 && (
                  <div>
                    <p className="text-xs text-muted-foreground">Change</p>
                    <p className="mt-1 font-semibold text-foreground">
                      {formatCurrency(transactionSummary.change.total)}
                    </p>
                  </div>
                )}
              </>
            )}
            {state.status === 'refund' && pendingRefundTotal !== undefined && pendingRefundTotal > 0 && (
              <div>
                <p className="text-xs text-muted-foreground">Refund</p>
                <p className="mt-1 font-semibold text-foreground">{formatCurrency(pendingRefundTotal)}</p>
              </div>
            )}
          </div>
        </section>
      )}

      {state.status === 'refund' &&
        pendingRefundTotal !== undefined &&
        pendingRefundTotal > 0 &&
        state.pendingRefundBreakdown && (
          <section className="rounded-lg border border-primary/20 bg-primary/5 px-6 py-5">
            <p className="mb-3 text-sm font-semibold text-foreground">Refund Breakdown</p>
            <p className="mb-4 text-xs text-muted-foreground">
              Returning {formatCurrency(pendingRefundTotal)}:
            </p>
            <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-xs">
              {Object.entries(state.pendingRefundBreakdown.denominations ?? {})
                .filter(([, count]) => (count ?? 0) > 0)
                .sort(([a], [b]) => Number(b) - Number(a))
                .map(([denomination, count]) => (
                  <div key={denomination} className="flex justify-between">
                    <span className="text-muted-foreground">
                      {formatCurrency(Number(denomination))}
                    </span>
                    <span className="font-semibold text-foreground">× {count}</span>
                  </div>
                ))}
            </div>
          </section>
        )}

      {state.status === 'complete' && onBuyAgain && (
        <div className="flex flex-col items-center gap-3 pt-2">
          <Button size="lg" className="w-full sm:w-auto" onClick={onBuyAgain}>
            Buy Another Drink
          </Button>
          {countdown !== null && countdown > 0 && (
            <p className="text-xs text-muted-foreground">
              Returning to home screen in {countdown} second{countdown !== 1 ? 's' : ''}...
            </p>
          )}
        </div>
      )}

      {state.status === 'refund' &&
        pendingRefundTotal !== undefined &&
        pendingRefundTotal > 0 &&
        onBuyAgain && (
          <div className="flex flex-col items-center gap-3 pt-2">
            <Button size="lg" className="w-full sm:w-auto" variant="secondary" onClick={onBuyAgain}>
              Return to Drinks
            </Button>
            {countdown !== null && countdown > 0 && (
              <p className="text-xs text-muted-foreground">
                Returning to home screen in {countdown} second{countdown !== 1 ? 's' : ''}...
              </p>
            )}
          </div>
        )}
    </div>
  );
}
