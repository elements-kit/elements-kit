import { signal } from "elements-kit/signals";

export type Row = { id: number; label: string };

let nextId = 4;
export const rows = signal<Row[]>([
  { id: 1, label: "alpha" },
  { id: 2, label: "beta" },
  { id: 3, label: "gamma" },
]);

export const add = () => {
  const id = nextId++;
  rows([...rows(), { id, label: `item ${id}` }]);
};
export const removeLast = () => rows(rows().slice(0, -1));
export const shuffle = () => rows([...rows()].sort(() => Math.random() - 0.5));
