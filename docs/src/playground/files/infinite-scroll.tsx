import { computed, signal } from "elements-kit/signals";
import { async } from "elements-kit/utilities/async";
import { createIntersectionObserver } from "elements-kit/utilities/intersection-observer";
import { For } from "elements-kit/for";

type Item = { id: number; label: string };

const items = signal<Item[]>([]);
const cursor = signal<number>(0);
const done = signal(false);

const loadMore = async(async () => {
  const c = cursor();
  const page = await fetchPage(c);
  items([...items(), ...page.items]);
  if (page.next == null) done(true);
  else cursor(page.next);
});

export class App {
  render() {
    loadMore.run();
    let sentinel!: Element;

    const wireObserver = (root: Element) => {
      createIntersectionObserver(
        sentinel,
        ([entry]) => {
          if (entry.isIntersecting && !done() && loadMore.state !== "pending") {
            loadMore.run();
          }
        },
        { root: root as HTMLElement, rootMargin: "100px" },
      );
    };

    return (
      <div style="padding: 1.5rem; font-family: system-ui, sans-serif; max-width: 640px;">
        <h2 style="margin-top: 0;">Infinite scroll</h2>
        <p style="color: #6b7280; margin: 0 0 0.5rem;">
          loaded: <strong>{() => items().length}</strong> / {TOTAL} — state:{" "}
          <strong>{() => loadMore.state}</strong>
        </p>
        <div
          ref={wireObserver}
          style="height: 280px; overflow: auto; border: 1px solid #e5e7eb; border-radius: 8px; padding: 0.5rem;"
        >
          <ul style="list-style: none; padding: 0; margin: 0;">
            <For each={items} by={(i) => i.id}>
              {(item) => (
                <li style="padding: 6px 8px; border-bottom: 1px solid #f3f4f6;">
                  #{item.id} — {item.label}
                </li>
              )}
            </For>
          </ul>
          <div
            ref={(el) => (sentinel = el)}
            style="height: 1px;"
            aria-hidden="true"
          />
          <p
            hidden={computed(() => !done())}
            style="color: #6b7280; text-align: center; padding: 8px 0; margin: 0;"
          >
            — end —
          </p>
        </div>
      </div>
    );
  }
}

const PAGE_SIZE = 20;
const TOTAL = 200;

const fetchPage = (
  cursor: number,
): Promise<{ items: Item[]; next: number | null }> =>
  new Promise((resolve) =>
    setTimeout(() => {
      const items = Array.from({ length: PAGE_SIZE }, (_, i) => {
        const id = cursor + i;
        return { id, label: `item ${id}` };
      }).filter((i) => i.id < TOTAL);
      const next = cursor + PAGE_SIZE >= TOTAL ? null : cursor + PAGE_SIZE;
      resolve({ items, next });
    }, 250),
  );
