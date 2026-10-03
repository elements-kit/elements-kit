import { signal } from "elements-kit/signals";
import { async } from "elements-kit/utilities/async";
import { fetchPage, type Item } from "./api";

export const items = signal<Item[]>([]);
const cursor = signal<number>(0);
export const done = signal(false);

export const loadMore = async(async () => {
  const c = cursor();
  const page = await fetchPage(c);
  items([...items(), ...page.items]);
  if (page.next == null) done(true);
  else cursor(page.next);
});
