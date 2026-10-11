import { signal } from "elements-kit/signals";
import { setContext } from "elements-kit/utilities/context";
import { USER, ROLES, type User } from "./user";
import { Avatar } from "./Avatar";
import { Toolbar } from "./Toolbar";

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
        <p style="color: #888; margin: 0 0 1rem;">
          One <code>setContext</code> on the root. Two unrelated descendants
          read it via <code>getContext</code> in a deferred <code>ref</code>.
        </p>

        <div style="border: 1px solid #8884; border-radius: 8px; padding: 1rem; margin-bottom: 1rem;">
          <h3 style="margin: 0 0 0.5rem;">Header</h3>
          <Avatar />
        </div>

        <div style="border: 1px solid #8884; border-radius: 8px; padding: 1rem; margin-bottom: 1rem;">
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
