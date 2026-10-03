export type Item = { id: number; label: string };

const PAGE_SIZE = 20;
export const TOTAL = 200;

export const fetchPage = (
  cursor: number,
): Promise<{ items: Item[]; next: number | null }> =>
  new Promise((resolve) =>
    setTimeout(() => {
      const items = Array.from({ length: PAGE_SIZE }, (_, i) => {
        const id = cursor + i;
        return { id, label: `item ${id}` };
      }).filter((i) => i.id < TOTAL);
      const next = cursor + PAGE_SIZE >= TOTAL ? null : cursor + PAGE_SIZE;
      resolve({ items, next });
    }, 250),
  );
