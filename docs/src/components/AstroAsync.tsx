/** @jsxImportSource elements-kit */
import { async } from "elements-kit/utilities/async";

const fetchedAt = async(
  () =>
    new Promise<string>((resolve) =>
      setTimeout(
        () => resolve(`rendered at ${new Date().toISOString()}`),
        150,
      ),
    ),
);

/**
 * Async seeding demo: the value is fetched during the server render,
 * serialized into ek-data, and seeded on the client — the deferred `run()`
 * is discarded, so the fetcher never executes in the browser. The timestamp
 * you see is the server's.
 */
export default function AstroAsync() {
  fetchedAt.run();
  return (
    <p class="x-card" style="margin:0;padding:var(--space-3) var(--space-4)">
      Server value, no client refetch: <strong>{fetchedAt}</strong>
    </p>
  );
}
