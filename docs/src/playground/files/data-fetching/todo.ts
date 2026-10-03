import { signal } from "elements-kit/signals";
import { async } from "elements-kit/utilities/async";

export const id = signal(1);
let attempt = 0;

export const fetchTodo = async(async () => {
  const currentId = id();
  attempt++;
  console.log(`[fetch] attempt=${attempt} id=${currentId}`);
  await new Promise((r) => setTimeout(r, 400));
  if (attempt % 3 === 0) throw new Error("simulated failure");
  return { id: currentId, title: `Todo #${currentId}`, fetchedAt: Date.now() };
});

fetchTodo.start();
