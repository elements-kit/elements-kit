import { computed, signal, type Signal } from "elements-kit/signals";
import { getContext } from "elements-kit/utilities/context";
import "elements-kit/utilities/dom-lifecycle";
import { USER, type User } from "./user";

export function Toolbar() {
  const user = signal<Signal<User> | undefined>(undefined);
  const notAdmin = computed(() => user()?.().role !== "admin");
  const lookup = (el: Element) => user(getContext<Signal<User>>(el, USER));
  return (
    <dom-lifecycle
      onConnect={(el) => {
        user(getContext<Signal<User>>(el, USER));
      }}
    >
      <div ref={lookup} style="display: flex; gap: 8px; align-items: center;">
        <span style="color: #888;">role:</span>
        <strong>{() => user()?.().role ?? "—"}</strong>
        <span hidden={notAdmin}>— admin tools available</span>
      </div>
    </dom-lifecycle>
  );
}
