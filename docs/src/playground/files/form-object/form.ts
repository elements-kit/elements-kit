import { signal } from "elements-kit/signals";
import { FormObject } from "elements-kit/utilities/form-object";

/** JSON of the form's current values. */
export const snapshot = signal("{}");

export function update(form: HTMLFormElement) {
  snapshot(JSON.stringify(new FormObject(form).toObject(), null, 2));
}

export function prefill(form: HTMLFormElement) {
  new FormObject(form).fromObject({
    user: { name: "Sara", email: "sara@example.com" },
    address: { city: "Paris" },
    interests: ["music", "travel"],
    newsletter: "yes",
  });
  update(form);
}
