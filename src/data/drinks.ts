import type { Drink, InventorySlot } from '@/types/machine';

export const DRINKS: Drink[] = [
  { id: 'cola', name: 'Cola', price: 1100 },
  { id: 'water', name: 'Water', price: 600 },
  { id: 'coffee', name: 'Coffee', price: 700 }
];

export const INITIAL_INVENTORY: InventorySlot[] = [
  { drinkId: 'cola', stock: 10 },
  { drinkId: 'water', stock: 15 },
  { drinkId: 'coffee', stock: 12 }
];

export function getDrinkById(id: Drink['id']): Drink | undefined {
  return DRINKS.find((drink) => drink.id === id);
}



