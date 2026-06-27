import { signal } from "elements-kit/signals";
import { FormObject } from "elements-kit/utilities/form-object";
import "elements-kit/utilities/dom-lifecycle";

const snapshot = signal("{}");

function update(form: HTMLFormElement) {
  snapshot(JSON.stringify(new FormObject(form).toObject(), null, 2));
}

const field = "display: grid; gap: 4px; margin-bottom: 12px;";
const input =
  "padding: 6px 8px; border: 1px solid #d1d5db; border-radius: 6px;";

export class App {
  render() {
    let form!: HTMLFormElement;

    const prefill = () => {
      new FormObject(form).fromObject({
        user: { name: "Sara", email: "sara@example.com" },
        address: { city: "Paris" },
        interests: ["music", "travel"],
        newsletter: "yes",
      });
      update(form);
    };

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
            <input style={input} name="address.city" value="Tunis" />
          </label>

          <fieldset style="border: 1px solid #e5e7eb; border-radius: 8px; margin-bottom: 12px;">
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
            on:click={prefill}
            style="margin-bottom: 8px; padding: 6px 12px; border: 1px solid #d1d5db; border-radius: 6px; cursor: pointer;"
          >
            Prefill from object
          </button>
          <pre style="margin: 0; padding: 12px; background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; font-size: 13px; overflow: auto;">
            {() => snapshot()}
          </pre>
        </div>
      </div>
    );
  }
}
