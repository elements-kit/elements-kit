import { reactive, computed } from "elements-kit/signals";
import { For } from "elements-kit/for";

// ── Store ─────────────────────────────────────────────────────────────────────
class CartItem {
  constructor(
    public name: string,
    public price: number,
    public qty = 1,
  ) {}
}

class CartStore {
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

const cart = new CartStore();

const PRODUCTS = [
  { name: "Widget", price: 9.99 },
  { name: "Gadget", price: 24.99 },
  { name: "Doohickey", price: 4.99 },
];

// ── Component ─────────────────────────────────────────────────────────────────
export class App {
  render() {
    return (
      <section style="padding: 1.5rem; font-family: sans-serif; max-width: 480px">
        <h2>Cart Store</h2>

        <div style="margin-bottom: 1rem">
          <strong>Products:</strong>
          {PRODUCTS.map((p) => (
            <button
              style="margin: 4px"
              on:click={() => cart.add(p.name, p.price)}
            >
              + {p.name} (${p.price})
            </button>
          ))}
        </div>

        <ul style="padding: 0; list-style: none">
          <For each={cart.items} by={(i) => i.name}>
            {(item) => (
              <li style="display: flex; justify-content: space-between; padding: 4px 0">
                <span>
                  {item.name} × {() => item.qty}
                </span>
                <span>
                  ${() => (item.price * item.qty).toFixed(2)}{" "}
                  <button on:click={() => cart.remove(item.name)}>✕</button>
                </span>
              </li>
            )}
          </For>
        </ul>

        <label style="display: block; margin: 8px 0">
          Discount %:{" "}
          <input
            type="number"
            value={computed(() => String(cart.discount))}
            on:input={(e: Event) =>
              (cart.discount = Number((e.target as HTMLInputElement).value))
            }
            style="width: 60px"
          />
        </label>

        <p style="border-top: 1px solid #eee; padding-top: 8px">
          Subtotal: ${() => cart.subtotal().toFixed(2)}
          <br />
          <strong>Total: ${() => cart.total().toFixed(2)}</strong>
        </p>
      </section>
    );
  }
}
