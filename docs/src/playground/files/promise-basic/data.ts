import { promise } from "elements-kit/utilities/promise";

export const data = promise<string>((resolve) => {
  setTimeout(() => resolve(`Hello at ${new Date().toLocaleTimeString()}`), 800);
});
