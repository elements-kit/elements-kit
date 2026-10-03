import { signal } from "elements-kit/signals";
import { async } from "elements-kit/utilities/async";

export const query = signal("hello");

export const search = async(async () => {
  const input = query();
  console.log(`[async] run input="${input}"`);
  await new Promise((r) => setTimeout(r, 500));
  const result = `result for "${input}"`;
  console.log(`[async] done →`, result);
  return result;
}).start();
