import { computed } from "elements-kit/signals";
import { navigate, isLocalNavigationEvent } from "elements-kit/utilities/routing";
import { currentLocation } from "elements-kit/utilities/location";
import { isHome, isUser, isSettings, isUnknown, userMatch } from "./routes";
import { Link } from "./Link";

const not = (c: () => boolean) => computed(() => !c());

export class App {
  render() {
    const root = (
      <div style="padding: 1.5rem; font-family: system-ui, sans-serif; max-width: 640px;">
        <h2 style="margin-top: 0;">Routing — patchHistory + matches/match</h2>
        <nav style="margin-bottom: 1rem;">
          <Link href="#/">Home</Link>
          <Link href="#/users/42">User 42</Link>
          <Link href="#/users/99">User 99</Link>
          <Link href="#/settings">Settings</Link>
          <Link href="#/oops">404</Link>
        </nav>
        <p style="font-family: ui-monospace, monospace; margin: 0 0 1rem;">
          hash: <strong>{() => currentLocation.hash()}</strong>
        </p>
        <section style="border: 1px solid #8884; border-radius: 8px; padding: 1rem;">
          <p hidden={not(isHome)} style="margin: 0;">
            Welcome home.
          </p>
          <p hidden={not(isUser)} style="margin: 0;">
            Profile for user{" "}
            <strong>{() => userMatch()?.hash.groups.id ?? ""}</strong>.
          </p>
          <p hidden={not(isSettings)} style="margin: 0;">
            Settings panel.
          </p>
          <p hidden={not(isUnknown)} style="margin: 0; color: #ef4444;">
            404 — no such route.
          </p>
        </section>
      </div>
    ) as HTMLElement;

    root.addEventListener("click", (e) => {
      if (!isLocalNavigationEvent(e)) return;
      e.preventDefault();
      const a = (e.target as Element).closest("a") as HTMLAnchorElement;
      navigate(a.href);
    });

    return root;
  }
}
