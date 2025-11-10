import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DRINKS } from '@/data/drinks';
import type { InventorySlot, VendingMachineState } from '@/types/machine';

export interface ProductGridProps {
  selectedDrink?: VendingMachineState['selectedDrink'];
  inventory: InventorySlot[];
  onSelect(drinkId: string): void;
}

export function ProductGrid({ selectedDrink, inventory, onSelect }: ProductGridProps) {
  return (
    <Card className="h-full">
      <CardHeader className="px-4 py-4 sm:px-6 sm:py-5">
        <CardTitle className="text-lg sm:text-xl">Available Drinks</CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-1 gap-3 px-4 pb-4 sm:grid-cols-2 sm:gap-4 sm:px-6 sm:pb-6 lg:grid-cols-3 xl:gap-6">
        {DRINKS.map((drink) => {
          const slot = inventory.find((item) => item.drinkId === drink.id);
          const outOfStock = !slot || slot.stock <= 0;
          const isSelected = selectedDrink === drink.id;
          return (
            <Button
              key={drink.id}
              variant={isSelected ? 'default' : 'outline'}
              className="relative h-auto min-h-[100px] justify-start whitespace-normal rounded-xl border px-4 py-4 text-left shadow-sm transition hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-60 sm:min-h-[120px] sm:px-5 sm:py-5"
              onClick={() => onSelect(drink.id)}
              disabled={outOfStock}
            >
              {outOfStock ? (
                <span className="absolute right-2 top-2 rounded-full bg-destructive/10 px-2 py-1 text-[9px] font-semibold uppercase tracking-wide text-destructive sm:right-3 sm:top-3 sm:text-[10px]">
                  Sold Out
                </span>
              ) : null}
              <div className="flex w-full flex-col gap-2 sm:gap-3">
                <div>
                  <span className="text-sm font-semibold leading-tight sm:text-base">{drink.name}</span>
                  <span className="mt-1 block text-xs text-muted-foreground sm:text-sm">
                    ₩{drink.price.toLocaleString('en-US')}
                  </span>
                </div>
                <div className="flex items-center justify-between text-[10px] text-muted-foreground sm:text-xs">
                  <span>Stock: {slot?.stock ?? 0}</span>
                  {isSelected ? <span className="font-semibold text-primary">Selected</span> : null}
                </div>
              </div>
            </Button>
          );
        })}
      </CardContent>
    </Card>
  );
}



