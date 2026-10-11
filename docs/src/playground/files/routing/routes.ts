import { computed, effect } from "elements-kit/signals";
import { patchHistory, matches, match } from "elements-kit/utilities/routing";

patchHistory();

// Real apps match on `pathname`; the hash is used because the preview is a
// sandboxed iframe. `{/}?` also matches the empty hash on first load.
export const isHome = matches({ hash: "{/}?" });
export const userMatch = match({ hash: "/users/:id" });
export const isSettings = matches({ hash: "/settings" });
export const isUser = computed(() => userMatch() != null);
export const isUnknown = computed(
  () => !isHome() && !userMatch() && !isSettings(),
);

effect(() => {
  const id = userMatch()?.hash.groups.id;
  document.title = id
    ? `User ${id}`
    : isHome()
      ? "Home"
      : isSettings()
        ? "Settings"
        : "Not found";
});
