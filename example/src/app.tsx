import { async, Async } from "elements-kit/utilities/async";
import { effect, signal } from "elements-kit/signals";

const id = signal(0);
const promise = async(function (this: Async) {
  return fetch("https://jsonplaceholder.typicode.com/todos/" + id())
    .then((res) => {
      if (!res.ok) {
        this.error = new Error("Network response was not ok");
      }
      return res;
    })
    .then((res) => res.json())
    .catch((err) => {
      console.error("Fetch error:", err);
      throw err;
    });
});

effect(() => {
  console.log("----");
  console.log("Pending:", promise.pending);
  console.log("Error:", promise.error);
  console.log("Result:", promise.result);
});

export class App {
  render() {
    return (
      <div>
        <h1>Async Signal Example</h1>
        <button onClick={() => promise.run()}>Fetch Data</button>
        <div>ID: {id}</div>
        <button onClick={() => id(id() + 1)}>Next ID</button>
      </div>
    );
  }
}
