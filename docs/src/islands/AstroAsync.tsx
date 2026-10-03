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
    <p class="unset x-card" data-variant="surface" data-size="2" style="margin:0">
      Server value, no client refetch: <strong>{fetchedAt}</strong>
    </p>
  );
}
