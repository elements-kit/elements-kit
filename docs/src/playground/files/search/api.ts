const FRUITS = [
  "apple", "apricot", "avocado", "banana", "blackberry", "blueberry",
  "cherry", "coconut", "cranberry", "date", "fig", "grape", "kiwi",
  "lemon", "lime", "mango", "melon", "nectarine", "orange", "papaya",
  "peach", "pear", "pineapple", "plum", "pomegranate", "raspberry",
  "strawberry", "tangerine", "watermelon",
];

export const fakeFetch = (q: string, signal: AbortSignal) =>
  new Promise<string[]>((resolve, reject) => {
    const id = setTimeout(() => {
      resolve(FRUITS.filter((f) => f.includes(q.toLowerCase())));
    }, 300);
    signal.addEventListener("abort", () => {
      clearTimeout(id);
      reject(new DOMException("aborted", "AbortError"));
    });
  });
