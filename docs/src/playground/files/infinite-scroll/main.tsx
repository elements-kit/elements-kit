import { computed } from "elements-kit/signals";
import { createIntersectionObserver } from "elements-kit/utilities/intersection-observer";
import { For } from "elements-kit/for";
import { TOTAL } from "./api";
import { items, done, loadMore } from "./feed";

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
        <p style="color: #888; margin: 0 0 0.5rem;">
          loaded: <strong>{() => items().length}</strong> / {TOTAL} — state:{" "}
          <strong>{() => loadMore.state}</strong>
        </p>
        <div
          ref={wireObserver}
          style="height: 280px; overflow: auto; border: 1px solid #8884; border-radius: 8px; padding: 0.5rem;"
        >
          <ul style="list-style: none; padding: 0; margin: 0;">
            <For each={items} by={(i) => i.id}>
              {(item) => (
                <li style="padding: 6px 8px; border-bottom: 1px solid #8882;">
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
            style="color: #888; text-align: center; padding: 8px 0; margin: 0;"
          >
            — end —
          </p>
        </div>
      </div>
    );
  }
}
