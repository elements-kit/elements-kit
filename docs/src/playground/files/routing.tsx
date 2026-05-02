import { computed, effect } from "elements-kit/signals";
import {
  patchHistory,
  navigate,
  matches,
  match,
  isLocalNavigationEvent,
} from "elements-kit/utilities/routing";
import { currentLocation } from "elements-kit/utilities/location";

patchHistory();

const isHome = matches({ pathname: "/" });
const userMatch = match({ pathname: "/users/:id" });
const isSettings = matches({ pathname: "/settings" });
const isUser = computed(() => userMatch() != null);
const isUnknown = computed(
  () => !isHome() && !userMatch() && !isSettings(),
);

const not = (c: () => boolean) => computed(() => !c());

effect(() => {
  const id = userMatch()?.pathname.groups.id;
  document.title = id
    ? `User ${id}`
    : isHome()
      ? "Home"
      : isSettings()
        ? "Settings"
        : "Not found";
});

const link = (href: string, label: string) => (
  <a
    href={href}
    style="color: #2563eb; text-decoration: underline; margin-right: 12px;"
  >
    {label}
  </a>
);

export class App {
  render() {
    const root = (
      <div style="padding: 1.5rem; font-family: system-ui, sans-serif; max-width: 640px;">
        <h2 style="margin-top: 0;">Routing — patchHistory + matches/match</h2>
        <nav style="margin-bottom: 1rem;">
          {link("/", "Home")}
          {link("/users/42", "User 42")}
          {link("/users/99", "User 99")}
          {link("/settings", "Settings")}
          {link("/oops", "404")}
        </nav>
        <p style="font-family: ui-monospace, monospace; margin: 0 0 1rem;">
          path: <strong>{() => currentLocation.pathname()}</strong>
        </p>
        <section style="border: 1px solid #e5e7eb; border-radius: 8px; padding: 1rem;">
          <p hidden={not(isHome)} style="margin: 0;">
            Welcome home.
          </p>
          <p hidden={not(isUser)} style="margin: 0;">
            Profile for user{" "}
            <strong>{() => userMatch()?.pathname.groups.id ?? ""}</strong>.
          </p>
          <p hidden={not(isSettings)} style="margin: 0;">
            Settings panel.
          </p>
          <p hidden={not(isUnknown)} style="margin: 0; color: #b91c1c;">
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
