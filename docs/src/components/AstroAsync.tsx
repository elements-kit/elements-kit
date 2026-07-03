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
    <p style="padding:0.75rem 1rem;border:1px solid var(--sl-color-gray-5);border-radius:0.5rem">
      Server value, no client refetch: <strong>{fetchedAt}</strong>
    </p>
  );
}
