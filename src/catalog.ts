export interface Product {
  id: string;
  name: string;
  price: number; // USD
}

/** Replace with your own products, or load them from a database. */
export const catalog: Product[] = [
  { id: "1", name: "Canjeero + Suqaar", price: 3.0 },
  { id: "2", name: "Bariis iyo Hilib Ari", price: 6.5 },
  { id: "3", name: "Baasto Somali", price: 4.0 },
  { id: "4", name: "Sambuusi (4 xabbo)", price: 2.0 },
  { id: "5", name: "Shaah Somali", price: 0.75 },
  { id: "6", name: "Cabitaan Cambe", price: 2.5 },
];

export function findProduct(id: string): Product | undefined {
  return catalog.find((p) => p.id === id);
}
