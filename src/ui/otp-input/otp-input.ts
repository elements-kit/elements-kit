import {
  ATTRIBUTES,
  type Attributes,
  observedAttributes,
} from "@/attributes.ts";
import { computed, effect, signal } from "@/signals/index.ts";
import { render } from "@/render.ts";
import { on } from "@/utilities/event-listener.ts";
import { isBrowser } from "@/utilities/environment.ts";
import shadowCss from "./otp-input.shadow.css?inline";

function toggleAttr(el: Element, name: string, on: boolean): void {
  if (on) el.setAttribute(name, "");
  else el.removeAttribute(name);
}

// One shared constructable stylesheet, adopted into every instance's shadow
// root. Authored in otp-input.shadow.css and imported as a processed string
// (`?inline`) — styles the transparent overlay input + hides its native
// selection highlight. Guarded for DOMs without constructable sheets.
const SHADOW_SHEET =
  typeof CSSStyleSheet === "undefined" ? null : new CSSStyleSheet();
SHADOW_SHEET?.replaceSync(shadowCss);

/**
 * `<x-otp-input>` — segmented one-time-passcode / pin input.
 *
 * A single transparent `<input>` (rendered into the shadow root) overlays the
 * author-composed cells and owns all keyboard / pointer / paste / mobile
 * autofill behavior. The cells (`<x-otp-slot>`, projected through a `<slot>`)
 * are a purely visual layer whose active cell + fake caret are mirrored from
 * the input's selection. Because it is one field there is no roving tabindex
 * and a screen reader perceives a single textbox.
 *
 * Form-associated: submits under the host `name`, participates in
 * reset / restore / disabled, and reports `valueMissing` / `tooShort`.
 *
 * ```html
 * <x-otp-input name="code" maxlength="6" pattern="[0-9]" aria-label="Code">
 *   <x-otp-group>
 *     <x-otp-slot index="0"></x-otp-slot>
 *     <x-otp-slot index="1"></x-otp-slot>
 *     <x-otp-slot index="2"></x-otp-slot>
 *   </x-otp-group>
 *   <x-otp-separator></x-otp-separator>
 *   <x-otp-group>
 *     <x-otp-slot index="3"></x-otp-slot>
 *     <x-otp-slot index="4"></x-otp-slot>
 *     <x-otp-slot index="5"></x-otp-slot>
 *   </x-otp-group>
 * </x-otp-input>
 * ```
 */
export class XOtpInput extends HTMLElement {
  static formAssociated = true;

  // Attribute → property map. `@attributes` isn't used as a decorator (oxc's
  // test transform only supports legacy decorators); we wire the same machinery
  // by hand via `observedAttributes` + `dispatchAttrChange` below.
  static [ATTRIBUTES]: Attributes<XOtpInput> = {
    value(value) {
      this.value = value ?? "";
    },
    maxlength(value) {
      this.maxLength = value == null ? 6 : Math.max(1, Number(value) || 6);
    },
    disabled(value) {
      this.disabled = value != null;
    },
    required(value) {
      this.required = value != null;
    },
    pattern(value) {
      this.pattern = value;
    },
    inputmode(value) {
      this.#inputMode(value ?? "text");
    },
  };

  static observedAttributes = observedAttributes(XOtpInput);

  declare static events: { complete: CustomEvent<string> };

  attributeChangedCallback(
    name: string,
    oldValue: string | null,
    newValue: string | null,
  ): void {
    XOtpInput[ATTRIBUTES][name]?.call(this, newValue, oldValue);
  }

  // — Reactive public state (hand-written signal accessors) —
  #value = signal("");
  get value(): string {
    return this.#value();
  }
  set value(v: string) {
    this.#value(v ?? "");
  }

  #maxLength = signal(6);
  get maxLength(): number {
    return this.#maxLength();
  }
  set maxLength(v: number) {
    this.#maxLength(v);
  }

  #disabled = signal(false);
  get disabled(): boolean {
    return this.#disabled();
  }
  set disabled(v: boolean) {
    this.#disabled(v);
  }

  #required = signal(false);
  get required(): boolean {
    return this.#required();
  }
  set required(v: boolean) {
    this.#required(v);
  }

  #pattern = signal<string | null>(null);
  get pattern(): string | null {
    return this.#pattern();
  }
  set pattern(v: string | null) {
    this.#pattern(v);
  }

  // Reflect `name` as a property (native form controls do) so form serializers
  // that read `control.name` — e.g. FormObject — pick the field up.
  get name(): string {
    return this.getAttribute("name") ?? "";
  }
  set name(v: string) {
    if (v == null || v === "") this.removeAttribute("name");
    else this.setAttribute("name", v);
  }

  /** Optional transform applied to pasted text before validation. */
  pasteTransformer: ((text: string) => string) | null = null;

  // — Internals — `attachInternals` is absent in some non-browser test DOMs;
  // degrade gracefully (form participation is verified in a real browser).
  readonly #internals: ElementInternals | null =
    typeof this.attachInternals === "function" ? this.attachInternals() : null;
  #shadow = this.attachShadow({ mode: "open" });
  #input: HTMLInputElement | null = null;
  #unmount: (() => void) | null = null;

  #focused = signal(false);
  #selStart = signal<number | null>(null);
  #selEnd = signal<number | null>(null);
  #inputMode = signal("text");
  #prevValue = "";

  // Rebuilds only when `pattern` changes; a character is accepted iff it matches.
  #regex = computed<RegExp | null>(() => {
    const p = this.pattern;
    if (!p) return null;
    try {
      return new RegExp(p, "u");
    } catch {
      return null;
    }
  });

  connectedCallback(): void {
    if (SHADOW_SHEET) this.#shadow.adoptedStyleSheets = [SHADOW_SHEET];
    if (!this.#shadow.querySelector("slot")) {
      this.#shadow.append(document.createElement("slot"));
    }
    this.#unmount?.();
    this.#unmount = render(this.#shadow, () => this.#renderField());
  }

  disconnectedCallback(): void {
    this.#unmount?.();
    this.#unmount = null;
    this.#input = null;
  }

  formResetCallback(): void {
    this.value = "";
  }

  formStateRestoreCallback(state: unknown): void {
    this.value = typeof state === "string" ? state : "";
  }

  formDisabledCallback(disabled: boolean): void {
    this.disabled = disabled;
  }

  get validity(): ValidityState | null {
    return this.#internals?.validity ?? null;
  }

  /** Build the overlay input and wire all reactive state + listeners. */
  #renderField(): HTMLInputElement {
    const input = document.createElement("input");
    input.className = "x-otp-input__field";
    input.type = "text";
    input.autocomplete = "one-time-code";
    input.setAttribute("autocapitalize", "none");
    input.spellcheck = false;
    this.#input = input;

    // Keep the input configured from reactive state.
    effect(() => {
      input.inputMode = this.#inputMode();
      input.maxLength = this.maxLength;
      input.disabled = this.disabled;
      const label = this.getAttribute("aria-label");
      if (label) input.setAttribute("aria-label", label);
    });

    // Push value → input / form value / validity (covers programmatic and
    // controlled updates as well as edits committed in `#commit`).
    effect(() => {
      const v = this.value;
      if (input.value !== v) input.value = v;
      this.#prevValue = v;
      this.#internals?.setFormValue(v);
      this.#updateValidity();
    });

    // Drive the cells from one effect. Reading every dependency up front (not
    // behind a short-circuit) subscribes this effect to all of them, so it
    // re-runs on any value / selection / focus / disabled change and repaints
    // each authored <x-otp-slot> by its index.
    effect(() => {
      const value = this.value;
      const focused = this.#focused();
      const s = this.#selStart();
      const e = this.#selEnd();
      const max = this.maxLength;
      const disabled = this.disabled;
      for (const slot of this.querySelectorAll("x-otp-slot")) {
        const i = Number(slot.getAttribute("index")) || 0;
        const char = value[i];
        slot.textContent = char ?? "";
        const hasSel = focused && s !== null && e !== null;
        // Single caret (start === end) → one active cell with the ring + caret.
        // A multi-cell range → those cells get a continuous selection tint (no
        // per-cell ring, so shared seams never show a doubled outline).
        const caretCell = hasSel && s === e && i === Math.min(s!, max - 1);
        const inRange = hasSel && s !== e && i >= s! && i < e!;
        toggleAttr(slot, "data-active", caretCell);
        toggleAttr(slot, "data-selected", inRange);
        toggleAttr(slot, "data-caret", caretCell && char == null);
        toggleAttr(slot, "data-disabled", disabled);
      }
    });

    on(input, "input", () => this.#commit());
    on(input, "keydown", (e) => this.#onKeydown(e as KeyboardEvent));
    on(input, "focus", () => this.#onFocus());
    on(input, "blur", () => this.#focused(false));
    on(input, "paste", (e) => this.#onPaste(e as ClipboardEvent));
    // Mirror the active cell(s) on every caret / selection change. The input
    // lives in the shadow root, so its `selectionchange` never reaches the
    // document — listen on the input itself, and keep keyup/pointerup/select as
    // cross-browser fallbacks for range selection (Shift-arrows, drag, Cmd-A).
    on(input, "selectionchange", () => this.#syncSelection());
    on(input, "keyup", () => this.#syncSelection());
    on(input, "pointerup", () => this.#syncSelection());
    on(input, "select", () => this.#syncSelection());

    if (this.hasAttribute("autofocus")) input.focus();
    return input;
  }

  #charOk(ch: string): boolean {
    const r = this.#regex();
    return !r || r.test(ch);
  }

  /** Filter to accepted characters and clamp to `maxLength`. */
  #sanitize(raw: string): string {
    let out = "";
    for (const ch of raw) {
      if (out.length >= this.maxLength) break;
      if (this.#charOk(ch)) out += ch;
    }
    return out;
  }

  #commit(): void {
    const input = this.#input;
    if (!input) return;
    const next = this.#sanitize(input.value);
    if (input.value !== next) input.value = next;
    const prev = this.#prevValue;
    if (next === prev) {
      this.#syncSelection();
      return;
    }
    this.value = next; // effect syncs input/form/validity + prevValue
    this.#syncSelection();
    this.dispatchEvent(new Event("input", { bubbles: true }));
    this.dispatchEvent(new Event("change", { bubbles: true }));
    if (prev.length < this.maxLength && next.length === this.maxLength) {
      this.dispatchEvent(
        new CustomEvent("complete", { detail: next, bubbles: true }),
      );
    }
  }

  #onKeydown(e: KeyboardEvent): void {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    if (e.key.length === 1 && !this.#charOk(e.key)) e.preventDefault();
  }

  #onFocus(): void {
    this.#focused(true);
    const input = this.#input;
    if (input) {
      const end = input.value.length;
      input.setSelectionRange(end, end);
    }
    this.#syncSelection();
  }

  #onPaste(e: ClipboardEvent): void {
    e.preventDefault();
    const input = this.#input;
    if (!input) return;
    const raw = e.clipboardData?.getData("text") ?? "";
    const text = this.pasteTransformer ? this.pasteTransformer(raw) : raw;
    const start = input.selectionStart ?? this.value.length;
    const end = input.selectionEnd ?? start;
    const merged = this.value.slice(0, start) + text + this.value.slice(end);
    const next = this.#sanitize(merged);
    input.value = next;
    const caret = Math.min(next.length, this.maxLength);
    input.setSelectionRange(caret, caret);
    this.#commit();
  }

  #syncSelection(): void {
    const input = this.#input;
    if (!input) return;
    this.#selStart(input.selectionStart);
    this.#selEnd(input.selectionEnd);
  }

  #updateValidity(): void {
    const internals = this.#internals;
    if (!internals) return;
    const v = this.value;
    if (this.required && v.length === 0) {
      internals.setValidity({ valueMissing: true }, "Please fill out this field.");
    } else if (v.length > 0 && v.length < this.maxLength) {
      internals.setValidity(
        { tooShort: true },
        `Please enter all ${this.maxLength} characters.`,
      );
    } else {
      internals.setValidity({});
    }
  }
}

if (isBrowser && !customElements.get("x-otp-input")) {
  customElements.define("x-otp-input", XOtpInput);
}

declare global {
  namespace ElementsKit {
    interface CustomElementRegistry {
      "x-otp-input": typeof XOtpInput;
    }
  }
}
