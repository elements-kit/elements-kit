import { effectScope } from "@/signals/index.ts";
import { isBrowser } from "./environment.ts";

type LifecycleCallback = (self: DomLifecycleElement) => void;
type AdoptedCallback = (oldDocument: Document, newDocument: Document) => void;

/**
 * Custom element backing the `<dom-lifecycle>` JSX tag. Place inside any
 * element to receive lifecycle notifications for that surrounding subtree —
 * `onConnect` / `onDisconnect` mirror `connectedCallback` /
 * `disconnectedCallback`, `onMove` mirrors the upcoming `connectedMoveCallback`
 * (fires when the element is moved with `Node.moveBefore()` instead of
 * disconnect+connect), and `onAdopted` mirrors `adoptedCallback`.
 *
 * Position-tracking callbacks (`onConnect` / `onDisconnect` / `onMove`)
 * receive the lifecycle element itself. Read `self.parentElement` for the
 * surrounding element, `self.firstElementChild` / `self.children` for a
 * wrapped subtree, or `self.getRootNode()` to walk through a shadow root.
 * `self` is always the live element — non-null even when the lifecycle
 * element is the root of a shadow tree (where `parentElement` is `null`).
 *
 * If you need the connect-time parent inside `onDisconnect` (the spec sets
 * `parentElement` to `null` before `disconnectedCallback` runs), capture it
 * yourself in `onConnect`.
 *
 * `onConnect` runs inside an `effectScope`, so any `onCleanup` registered
 * inside it (directly or via factories like `setContext`, `on`, observers,
 * etc.) fires on disconnect — before `onDisconnect` is invoked. The scope
 * persists across moves (`onMove`); a fresh scope is created on every
 * reconnection.
 *
 * Layout / a11y inert by default: `display: contents` removes the box so the
 * element doesn't affect its parent's layout, and `role="none"` strips its
 * implicit role from the accessibility tree. Children still participate in
 * both layout and a11y. (CSS structural selectors like `:empty`,
 * `:first-child`, and `:nth-child` still see the element in the DOM tree —
 * place the lifecycle element where those selectors don't reach if needed.)
 *
 * @example
 * ```tsx
 * <div>
 *   <dom-lifecycle
 *     onConnect={(el) => el.parentElement?.classList.add("ready")}
 *     onDisconnect={(el) => {
 *       // el.parentElement is null here per spec — stash from onConnect if needed
 *     }}
 *   />
 * </div>
 * ```
 *
 * @example
 * Wrap children — read the wrapped subtree via `firstElementChild`:
 * ```tsx
 * <section>
 *   <dom-lifecycle onConnect={(el) => measure(el.firstElementChild)}>
 *     <h1>Title</h1>
 *     <p>Body</p>
 *   </dom-lifecycle>
 * </section>
 * ```
 */
export class DomLifecycleElement extends HTMLElement {
  #onConnect: LifecycleCallback | null = null;
  #onDisconnect: LifecycleCallback | null = null;
  #onMove: LifecycleCallback | null = null;
  #onAdopted: AdoptedCallback | null = null;
  #disposeScope: (() => void) | null = null;

  set onConnect(fn: LifecycleCallback | null) {
    this.#onConnect = fn;
  }
  get onConnect(): LifecycleCallback | null {
    return this.#onConnect;
  }

  set onDisconnect(fn: LifecycleCallback | null) {
    this.#onDisconnect = fn;
  }
  get onDisconnect(): LifecycleCallback | null {
    return this.#onDisconnect;
  }

  set onMove(fn: LifecycleCallback | null) {
    this.#onMove = fn;
  }
  get onMove(): LifecycleCallback | null {
    return this.#onMove;
  }

  set onAdopted(fn: AdoptedCallback | null) {
    this.#onAdopted = fn;
  }
  get onAdopted(): AdoptedCallback | null {
    return this.#onAdopted;
  }

  connectedCallback(): void {
    this.style.display = "contents";
    if (!this.hasAttribute("role")) this.setAttribute("role", "none");
    this.#disposeScope?.();
    this.#disposeScope = effectScope(() => this.#onConnect?.(this));
  }

  disconnectedCallback(): void {
    this.#disposeScope?.();
    this.#disposeScope = null;
    this.#onDisconnect?.(this);
  }

  // Spec: `connectedMoveCallback` fires in place of disconnect+connect when
  // the element is repositioned via `Node.moveBefore()`. Browsers without
  // `moveBefore` will keep firing the disconnect+connect pair instead.
  // Scope persists across move — move is not disconnect.
  connectedMoveCallback(): void {
    this.#onMove?.(this);
  }

  adoptedCallback(oldDocument: Document, newDocument: Document): void {
    this.#onAdopted?.(oldDocument, newDocument);
  }
}

if (isBrowser && !customElements.get("dom-lifecycle")) {
  customElements.define("dom-lifecycle", DomLifecycleElement);
}

declare global {
  namespace ElementsKit {
    interface CustomElementRegistry {
      "dom-lifecycle": typeof DomLifecycleElement;
    }
  }
}
