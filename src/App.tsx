import { useEffect, useMemo, useState } from 'react';
import { HelpCircle } from 'lucide-react';

import { AdminDiagnosticsPanel } from '@/components/AdminDiagnosticsPanel';
import { ProductGrid } from '@/components/ProductGrid';
import { OrderFlowModal } from '@/components/OrderFlowModal';
import { TransactionHistoryModal } from '@/components/TransactionHistoryModal';
import { HelpModal } from '@/components/HelpModal';
import { Button } from '@/components/ui/button';
import { useVendingMachine } from '@/state/vending-machine';

export default function App() {
  const { state, actions, inventorySlots, transactionHistory } = useVendingMachine();
  const [historyOpen, setHistoryOpen] = useState(false);
  const [orderOpen, setOrderOpen] = useState(false);
  const [adminPanelOpen, setAdminPanelOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);

  const shouldShowOrder = useMemo(
    () =>
      !!state.selectedDrink ||
      ['awaitingPayment', 'processingPayment', 'dispensing', 'refund', 'complete'].includes(
        state.status
      ),
    [state.selectedDrink, state.status]
  );

  useEffect(() => {
    if (shouldShowOrder) {
      setOrderOpen(true);
    } else if (!shouldShowOrder && state.status === 'idle') {
      setOrderOpen(false);
    }
  }, [shouldShowOrder, state.status]);

  return (
    <div className="flex min-h-screen flex-col text-foreground">
      <header className="border-b border-border/40 bg-white/70 shadow-sm backdrop-blur">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-2 px-4 py-3 sm:px-6 sm:py-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-col gap-1">
            <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">Vending Machine</h1>
            <p className="text-xs text-muted-foreground sm:text-sm">Tap a drink to begin your order.</p>
          </div>
        </div>
      </header>
      <main className="flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 sm:py-8 lg:py-12">
          <section>
        <ProductGrid
          selectedDrink={state.selectedDrink}
          inventory={inventorySlots}
          onSelect={actions.selectDrink}
        />
          </section>
        </div>
      </main>
      <footer className="border-t border-border/40 bg-white/70 py-2 backdrop-blur sm:py-3">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-4 sm:px-6">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setHelpOpen(true)}
            className="flex items-center gap-2 text-[10px] text-muted-foreground hover:text-foreground sm:text-xs"
          >
            <HelpCircle className="h-3 w-3 sm:h-4 sm:w-4" />
            <span>Help</span>
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setAdminPanelOpen(!adminPanelOpen)}
            className="text-[10px] text-muted-foreground hover:text-foreground sm:text-xs"
          >
            {adminPanelOpen ? 'Hide Admin' : 'Admin'}
          </Button>
        </div>
      </footer>
      {adminPanelOpen && (
        <section className="border-t border-border/40 bg-muted/30">
          <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 sm:pb-10 sm:pt-6">
        <AdminDiagnosticsPanel
            inventory={inventorySlots}
            onSetStock={actions.setStock}
          onViewHistory={() => setHistoryOpen(true)}
        />
          </div>
      </section>
      )}
      <TransactionHistoryModal
        open={historyOpen}
        onClose={() => setHistoryOpen(false)}
        items={transactionHistory}
      />
      <OrderFlowModal
        open={orderOpen}
        state={state}
        actions={actions}
        onRequestClose={() => actions.reset()}
      />
      <HelpModal open={helpOpen} onClose={() => setHelpOpen(false)} />
    </div>
  );
}

