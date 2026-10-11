import "./counter";

// Mount three instances — all share the same parsed stylesheet
export class App {
  render() {
    return (
      <div style="display: flex; gap: 1rem; flex-wrap: wrap; padding: 1rem">
        <x-counter2 />
        <x-counter2 />
        <x-counter2 />
      </div>
    );
  }
}
