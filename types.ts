export interface Product {
  name: string;
  type: string | null;
  mainIngredient: string | null;
  brand: string | null;
  saleLocation: string | null;
  onlineReference: string;
  dateAccessed: string;
  description?: string | null;
}