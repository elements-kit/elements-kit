import "./range-display";

export class App {
  render() {
    return (
      <div style="padding: 1.5rem; max-width: 400px">
        <h2>Attribute demo</h2>
        <p style="font-size: 0.85em; color: #888">
          Attributes are HTML strings. <code>@attributes</code> converts them to
          typed reactive properties.
        </p>
        <x-range label="Volume" min={0} max={100} value={75} />
        <x-range label="Temperature" min={-20} max={40} value={22} />
        <x-range label="Brightness" min={0} max={255} value={128} />
      </div>
    );
  }
}
