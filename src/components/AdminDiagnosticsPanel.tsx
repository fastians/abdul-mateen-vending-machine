import { useState, useEffect } from 'react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DRINKS } from '@/data/drinks';
import type { Drink, InventorySlot } from '@/types/machine';

export interface AdminDiagnosticsPanelProps {
  inventory: InventorySlot[];
  onSetStock(drinkId: Drink['id'], amount: number): void;
  onViewHistory(): void;
}

export function AdminDiagnosticsPanel({
  inventory,
  onSetStock,
  onViewHistory
}: AdminDiagnosticsPanelProps) {
  const [stockAmounts, setStockAmounts] = useState<Partial<Record<Drink['id'], number>>>({});

  // Initialize stock amounts with current inventory values
  useEffect(() => {
    const initialAmounts: Partial<Record<Drink['id'], number>> = {};
    DRINKS.forEach((drink) => {
      const slot = inventory.find((item) => item.drinkId === drink.id);
      initialAmounts[drink.id] = slot?.stock ?? 0;
    });
    setStockAmounts(initialAmounts);
  }, [inventory]);

  const handleSetStock = (drinkId: Drink['id']) => {
    const amount = stockAmounts[drinkId];
    if (amount !== undefined && amount >= 0) {
      onSetStock(drinkId, amount);
    }
  };

  return (
    <Card>
      <CardHeader className="px-4 py-4 sm:px-6 sm:py-5">
        <CardTitle className="text-lg sm:text-xl">Admin Panel</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 px-4 pb-4 sm:space-y-6 sm:px-6 sm:pb-6">
        <div className="space-y-3 sm:space-y-4">
          <h3 className="text-xs font-semibold text-foreground sm:text-sm">Stock Management</h3>
          <div className="space-y-2 sm:space-y-3">
            {DRINKS.map((drink) => {
              const slot = inventory.find((item) => item.drinkId === drink.id);
              const currentStock = slot?.stock ?? 0;
              return (
                <div
                  key={drink.id}
                  className="flex flex-col gap-3 rounded-lg border bg-muted/30 px-3 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:px-4"
                >
                  <div className="flex-1">
                    <p className="text-xs font-semibold text-foreground sm:text-sm">{drink.name}</p>
                    <p className="text-[10px] text-muted-foreground sm:text-xs">Current stock: {currentStock}</p>
          </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={stockAmounts[drink.id] ?? currentStock}
                      onChange={(e) =>
                        setStockAmounts((prev) => ({
                          ...prev,
                          [drink.id]: Math.max(0, parseInt(e.target.value, 10) || 0)
                        }))
                      }
                      className="w-16 rounded-md border bg-background px-2 py-1.5 text-xs sm:w-20 sm:text-sm"
                    />
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => handleSetStock(drink.id)}
                      className="text-xs sm:text-sm"
                    >
                      Set Stock
                    </Button>
          </div>
          </div>
              );
            })}
          </div>
          </div>

          <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" onClick={onViewHistory} className="w-full text-xs sm:w-auto sm:text-sm">
                View Transaction History
              </Button>
          </div>
      </CardContent>
    </Card>
  );
}
