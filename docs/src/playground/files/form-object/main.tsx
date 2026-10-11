import "elements-kit/utilities/dom-lifecycle";
import { snapshot, update, prefill } from "./form";
import { field, input } from "./styles";

export class App {
  render() {
    let form!: HTMLFormElement;

    return (
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem; padding: 1.5rem; font-family: system-ui, sans-serif;">
        <form
          ref={(el) => {
            form = el;
          }}
          on:input={() => update(form)}
        >
          {/* Snapshot once the form is connected to the DOM */}
          <dom-lifecycle onConnect={() => update(form)} />

          <label style={field}>
            Name
            <input style={input} name="user.name" value="Wael" />
          </label>
          <label style={field}>
            Email
            <input style={input} name="user.email" value="wael@example.com" />
          </label>
          <label style={field}>
            City
            <input style={input} name="address.city" value="Mostaganem" />
          </label>

          <fieldset style="border: 1px solid #8884; border-radius: 8px; margin-bottom: 12px;">
            <legend>Interests (name="interests[]")</legend>
            <label>
              <input type="checkbox" name="interests[]" value="code" checked /> Code
            </label>{" "}
            <label>
              <input type="checkbox" name="interests[]" value="music" /> Music
            </label>{" "}
            <label>
              <input type="checkbox" name="interests[]" value="travel" checked />{" "}
              Travel
            </label>
          </fieldset>

          {/* hidden + checkbox idiom: unchecked → "no", checked → "yes" */}
          <label>
            <input type="hidden" name="newsletter" value="no" />
            <input type="checkbox" name="newsletter" value="yes" /> Subscribe to
            newsletter
          </label>
        </form>

        <div>
          <button
            type="button"
            on:click={() => prefill(form)}
            style="margin-bottom: 8px; padding: 6px 12px; border: 1px solid #8884; border-radius: 6px; cursor: pointer;"
          >
            Prefill from object
          </button>
          <pre style="margin: 0; padding: 12px; background: #8881; border: 1px solid #8884; border-radius: 8px; font-size: 13px; overflow: auto;">
            {() => snapshot()}
          </pre>
        </div>
      </div>
    );
  }
}
