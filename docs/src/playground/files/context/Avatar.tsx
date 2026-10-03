import { signal, type Signal } from "elements-kit/signals";
import { getContext } from "elements-kit/utilities/context";
import "elements-kit/utilities/dom-lifecycle";
import { USER, type User } from "./user";

export function Avatar() {
  const user = signal<Signal<User> | undefined>(undefined);
  const lookup = (el: Element) => user(getContext<Signal<User>>(el, USER));
  return (
    <dom-lifecycle
      onConnect={(el) => {
        user(getContext<Signal<User>>(el, USER));
      }}
    >
      <span
        ref={lookup}
        style="display: inline-flex; align-items: center; gap: 8px;"
      >
        <span
          style="width: 28px; height: 28px; border-radius: 50%; background: #2563eb; color: white; display: inline-flex; align-items: center; justify-content: center; font-weight: 600;"
          aria-hidden="true"
        >
          {() => user()?.().name[0] ?? "?"}
        </span>
        <span>{() => user()?.().name ?? "(none)"}</span>
      </span>
    </dom-lifecycle>
  );
}
