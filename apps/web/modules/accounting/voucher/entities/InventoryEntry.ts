export interface InventoryEntry {
  itemName: string;
  quantity: number;
  rate?: number;
  amount: number;
  billedQuantity?: number;
}
