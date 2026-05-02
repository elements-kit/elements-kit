import { computed, signal, type Signal } from "elements-kit/signals";
import { setContext, getContext } from "elements-kit/utilities/context";
import "elements-kit/utilities/dom-lifecycle";

type User = { name: string; role: "viewer" | "editor" | "admin" };
const USER = Symbol("user");

const ROLES: User["role"][] = ["viewer", "editor", "admin"];

function Avatar() {
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

function Toolbar() {
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
        <span style="color: #6b7280;">role:</span>
        <strong>{() => user()?.().role ?? "—"}</strong>
        <span hidden={notAdmin}>— admin tools available</span>
      </div>
    </dom-lifecycle>
  );
}

export class App {
  render() {
    const currentUser = signal<User>({ name: "Ada", role: "admin" });
    return (
      <div
        ref={(el) => {
          setContext(el, USER, currentUser);
        }}
        style="padding: 1.5rem; font-family: system-ui, sans-serif; max-width: 640px;"
      >
        <h2 style="margin-top: 0;">Context — current user, no prop drilling</h2>
        <p style="color: #6b7280; margin: 0 0 1rem;">
          One <code>setContext</code> on the root. Two unrelated descendants
          read it via <code>getContext</code> in a deferred <code>ref</code>.
        </p>

        <div style="border: 1px solid #e5e7eb; border-radius: 8px; padding: 1rem; margin-bottom: 1rem;">
          <h3 style="margin: 0 0 0.5rem;">Header</h3>
          <Avatar />
        </div>

        <div style="border: 1px solid #e5e7eb; border-radius: 8px; padding: 1rem; margin-bottom: 1rem;">
          <h3 style="margin: 0 0 0.5rem;">Toolbar (deeply nested)</h3>
          <section>
            <div>
              <Toolbar />
            </div>
          </section>
        </div>

        <div style="display: flex; gap: 8px; flex-wrap: wrap;">
          <button on:click={() => currentUser({ name: "Ada", role: "admin" })}>
            Ada (admin)
          </button>
          <button
            on:click={() => currentUser({ name: "Grace", role: "editor" })}
          >
            Grace (editor)
          </button>
          <button
            on:click={() => currentUser({ name: "Linus", role: "viewer" })}
          >
            Linus (viewer)
          </button>
          <button
            on:click={() => {
              const next = ROLES[(ROLES.indexOf(currentUser().role) + 1) % 3];
              currentUser({ ...currentUser(), role: next });
            }}
          >
            cycle role
          </button>
        </div>
      </div>
    );
  }
}
