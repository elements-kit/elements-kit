import { reactive, computed } from "elements-kit/signals";

// ── Store ─────────────────────────────────────────────────────────────────────
export class CartItem {
  constructor(
    public name: string,
    public price: number,
    public qty = 1,
  ) {}
}

export class CartStore {
  @reactive() items: CartItem[] = [];
  @reactive() discount = 0;

  subtotal = computed(() =>
    this.items.reduce((s, i) => s + i.price * i.qty, 0),
  );
  total = computed(() => this.subtotal() * (1 - this.discount / 100));

  add(name: string, price: number) {
    const existing = this.items.find((i) => i.name === name);
    if (existing) {
      existing.qty++;
      this.items = [...this.items]; // trigger reactivity
    } else {
      this.items = [...this.items, new CartItem(name, price)];
    }
  }

  remove(name: string) {
    this.items = this.items.filter((i) => i.name !== name);
  }
}

export const cart = new CartStore();

export const PRODUCTS = [
  { name: "Widget", price: 9.99 },
  { name: "Gadget", price: 24.99 },
  { name: "Doohickey", price: 4.99 },
];
