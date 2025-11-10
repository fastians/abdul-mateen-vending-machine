import { Fragment, useMemo, useState } from 'react';

import { Button } from '@/components/ui/button';
import type { TransactionSummary } from '@/types/machine';

function formatCurrency(amount: number) {
  return `₩${amount.toLocaleString('en-US')}`;
}

function formatTime(timestamp: number) {
  return new Date(timestamp).toLocaleString();
}

type PaymentFilter = 'all' | 'cash' | 'card';

export interface TransactionHistoryModalProps {
  open: boolean;
  onClose(): void;
  items: TransactionSummary[];
}

export function TransactionHistoryModal({ open, onClose, items }: TransactionHistoryModalProps) {
  const [paymentFilter, setPaymentFilter] = useState<PaymentFilter>('all');
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    return [...items]
      .filter((item) => {
        if (paymentFilter === 'all') return true;
        return item.paymentMethod === paymentFilter;
      })
      .filter((item) => {
        if (!search.trim()) return true;
        const query = search.trim().toLowerCase();
        const drinkLabel = (item.drinkName ?? item.drinkId ?? '').toLowerCase();
        return drinkLabel.includes(query);
      })
      .sort((a, b) => b.completedAt - a.completedAt);
  }, [items, paymentFilter, search]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur">
      <div className="m-4 w-full max-w-3xl rounded-2xl border bg-card shadow-2xl">
        <header className="flex items-start justify-between gap-3 border-b border-border/60 bg-muted px-6 py-4">
          <div>
            <h2 className="text-xl font-semibold">Transaction History</h2>
            <p className="text-sm text-muted-foreground">
              Showing the most recent {filtered.length} transaction{filtered.length === 1 ? '' : 's'}.
            </p>
          </div>
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </header>

        <div className="space-y-4 px-6 py-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2">
              <label className="text-xs font-semibold uppercase text-muted-foreground" htmlFor="history-payment-filter">
                Payment
              </label>
              <select
                id="history-payment-filter"
                className="rounded-md border bg-background px-2 py-1 text-sm"
                value={paymentFilter}
                onChange={(event) => setPaymentFilter(event.target.value as PaymentFilter)}
              >
                <option value="all">All</option>
                <option value="cash">Cash</option>
                <option value="card">Card</option>
              </select>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-xs font-semibold uppercase text-muted-foreground" htmlFor="history-search">
                Search
              </label>
              <input
                id="history-search"
                className="w-48 rounded-md border bg-background px-2 py-1 text-sm"
                placeholder="Drink name…"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </div>
          </div>

          <div className="max-h-[460px] overflow-y-auto pr-1">
            <table className="w-full table-fixed border-separate border-spacing-y-2">
              <thead className="text-left text-xs uppercase text-muted-foreground">
                <tr className="rounded-md bg-muted/60 text-xs">
                  <th className="rounded-l-md px-3 py-2 font-semibold">Time</th>
                  <th className="px-3 py-2 font-semibold">Drink</th>
                  <th className="px-3 py-2 font-semibold">Payment</th>
                  <th className="px-3 py-2 font-semibold">Charged</th>
                  <th className="rounded-r-md px-3 py-2 font-semibold text-right">Change</th>
                </tr>
              </thead>
              <tbody className="text-sm text-foreground">
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-3 py-6 text-center text-sm text-muted-foreground">
                      No transactions match your filters yet.
                    </td>
                  </tr>
                ) : (
                  filtered.map((item) => (
                    <tr key={item.completedAt} className="rounded-xl border bg-background/80 shadow-sm">
                      <td className="px-3 py-3 align-top text-sm text-muted-foreground">
                        {formatTime(item.completedAt)}
                      </td>
                      <td className="px-3 py-3 align-top">
                        <p className="font-semibold">{item.drinkName ?? item.drinkId ?? 'Unknown'}</p>
                      </td>
                      <td className="px-3 py-3 align-top">
                        <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold uppercase text-primary">
                          {item.paymentMethod ?? 'n/a'}
                        </span>
                      </td>
                      <td className="px-3 py-3 align-top font-semibold">
                        {formatCurrency(item.amountCharged)}
                      </td>
                      <td className="px-3 py-3 align-top text-right">
                        {item.change && item.change.total > 0 ? (
                          <div className="inline-flex flex-col items-end gap-1 text-xs">
                            <span className="text-muted-foreground">Total {formatCurrency(item.change.total)}</span>
                            <div className="rounded-md border bg-muted/40 px-3 py-2">
                              <dl className="grid grid-cols-[auto_auto] gap-x-3 gap-y-1">
                                {Object.entries(item.change.denominations ?? {})
                                  .filter(([, count]) => (count ?? 0) > 0)
                                  .sort(([a], [b]) => Number(b) - Number(a))
                                  .map(([denomination, count]) => (
                                    <Fragment key={`${item.completedAt}-${denomination}`}>
                                      <dt>₩{Number(denomination).toLocaleString('en-US')}</dt>
                                      <dd>× {count}</dd>
                                    </Fragment>
                                  ))}
                              </dl>
                            </div>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">No change</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

