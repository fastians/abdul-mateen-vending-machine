import { INITIAL_INVENTORY } from '@/data/drinks';
import type { Drink, InventorySlot } from '@/types/machine';

export class InventoryService {
  private slots: Map<Drink['id'], number>;

  constructor(initialSlots: InventorySlot[] = INITIAL_INVENTORY) {
    this.slots = new Map(initialSlots.map((slot) => [slot.drinkId, slot.stock]));
  }

  list(): InventorySlot[] {
    return Array.from(this.slots.entries()).map(([drinkId, stock]) => ({ drinkId, stock }));
  }

  getStock(drinkId: Drink['id']): number {
    return this.slots.get(drinkId) ?? 0;
  }

  isInStock(drinkId: Drink['id']): boolean {
    return this.getStock(drinkId) > 0;
  }

  decrement(drinkId: Drink['id']): boolean {
    const current = this.getStock(drinkId);
    if (current <= 0) {
      return false;
    }
    this.slots.set(drinkId, current - 1);
    return true;
  }

  restock(drinkId: Drink['id'], amount: number): void {
    if (amount < 0) {
      throw new Error('Restock amount must be non-negative');
    }
    const current = this.getStock(drinkId);
    this.slots.set(drinkId, current + amount);
  }

  setStock(drinkId: Drink['id'], amount: number): void {
    if (amount < 0) {
      throw new Error('Stock amount must be non-negative');
    }
    this.slots.set(drinkId, amount);
  }

  setInventory(slots: InventorySlot[]): void {
    this.slots = new Map(slots.map((slot) => [slot.drinkId, slot.stock]));
  }
}

export function createInventoryService(initialSlots?: InventorySlot[]): InventoryService {
  return new InventoryService(initialSlots ?? INITIAL_INVENTORY);
}



