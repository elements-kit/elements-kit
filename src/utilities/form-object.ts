/** Leaf value a single control contributes to the extracted object. */
export type FormObjectValue = string | number | boolean | File | null;

/** A nested plain object built from a form's dot-notation field names. */
export type FormValues = { [key: string]: unknown };

/** Named controls FormObject reads from and writes to. */
export type NamedControl =
  | HTMLInputElement
  | HTMLSelectElement
  | HTMLTextAreaElement;

/**
 * One control's contribution, as seen by transforms before the nested object
 * is assembled. `value` is the raw extracted value; `checked` is present only
 * for checkbox / radio controls.
 */
export interface Field {
  control: NamedControl;
  /** Dot-notation path. Transforms may rewrite it to remap the output key. */
  name: string;
  /** `string | string[] | File | File[] | boolean` depending on control type. */
  value: unknown;
  /** Whether the control is checked — checkbox / radio only. */
  checked?: boolean;
}

/**
 * Per-field transform. Return the (possibly modified) field to keep it, or
 * `null` to drop it from the output. Run in order during {@link FormObject.toObject}.
 */
export type FormFieldTransform = (field: Field) => Field | null;

export interface FormObjectOptions {
  /**
   * Pipeline applied to each field during `toObject()`. Defaults to
   * {@link defaultTransforms}. Providing this **replaces** the defaults —
   * spread `...defaultTransforms` to extend them.
   */
  transforms?: FormFieldTransform[];
}

/** True when the control is a button / submit / reset / image. */
function isButton(control: NamedControl): boolean {
  if (control instanceof HTMLButtonElement) return true;
  if (control instanceof HTMLInputElement) {
    return (
      control.type === "submit" ||
      control.type === "reset" ||
      control.type === "button" ||
      control.type === "image"
    );
  }
  return false;
}

/** Drop disabled controls (mirrors native `FormData`). */
export const skipDisabled: FormFieldTransform = (field) =>
  field.control.disabled ? null : field;

/** Drop submit / reset / button / image controls and `<button>` elements. */
export const skipButtons: FormFieldTransform = (field) =>
  isButton(field.control) ? null : field;

/** Drop fields whose control is an unchecked checkbox / radio. */
export const dropUnchecked: FormFieldTransform = (field) =>
  field.checked === false ? null : field;

/**
 * Include unchecked **checkboxes** with the given `value` instead of dropping
 * them. Unchecked **radios** are still dropped (only the selected radio is
 * meaningful). Use this **in place of** {@link dropUnchecked}.
 *
 * @example transforms: [skipDisabled, skipButtons, uncheckedAs(false)]
 */
export function uncheckedAs(value: unknown): FormFieldTransform {
  return (field) => {
    if (field.checked !== false) return field;
    if (field.control instanceof HTMLInputElement && field.control.type === "radio") {
      return null;
    }
    return { ...field, value, checked: undefined };
  };
}

/** Drop fields whose value is empty: `""`, `null`, or an empty array. */
export const skipEmpty: FormFieldTransform = (field) => {
  const v = field.value;
  if (v === "" || v === null) return null;
  if (Array.isArray(v) && v.length === 0) return null;
  return field;
};

/** Default pipeline: skip disabled controls, buttons, and unchecked checkboxes/radios. */
export const defaultTransforms: FormFieldTransform[] = [
  skipDisabled,
  skipButtons,
  dropUnchecked,
];

/** A non-negative integer string (e.g. "0", "12") — denotes an array index. */
function isIndex(segment: string): boolean {
  return /^(0|[1-9]\d*)$/.test(segment);
}

/**
 * Write `value` into `target` at the dot-notation `path`. Object segments
 * create plain objects; integer segments create/extend arrays.
 *
 * @example setPath(o, "user.tags.0", "a") // { user: { tags: ["a"] } }
 */
function setPath(target: FormValues, path: string, value: unknown): void {
  const keys = path.split(".");
  let node: Record<string, unknown> | unknown[] = target;

  for (let i = 0; i < keys.length; i++) {
    const key = keys[i]!;
    const last = i === keys.length - 1;

    if (last) {
      (node as Record<string, unknown>)[key] = value;
      return;
    }

    const nextKey = keys[i + 1]!;
    const childShouldBeArray = isIndex(nextKey);
    const existing = (node as Record<string, unknown>)[key];

    if (existing === undefined || typeof existing !== "object" || existing === null) {
      (node as Record<string, unknown>)[key] = childShouldBeArray ? [] : {};
    }
    node = (node as Record<string, unknown>)[key] as
      | Record<string, unknown>
      | unknown[];
  }
}

/** Read the value at the dot-notation `path` from `source`, or `undefined`. */
function getPath(source: FormValues, path: string): unknown {
  let node: unknown = source;
  for (const key of path.split(".")) {
    if (node === null || typeof node !== "object") return undefined;
    node = (node as Record<string, unknown>)[key];
  }
  return node;
}

/** Extract one raw {@link Field} from a named control, pre-transform. */
function extractField(control: NamedControl): Field {
  if (control instanceof HTMLInputElement) {
    const type = control.type;
    if (type === "checkbox") {
      return {
        control,
        name: control.name,
        value: control.value || "on",
        checked: control.checked,
      };
    }
    if (type === "radio") {
      return {
        control,
        name: control.name,
        value: control.value,
        checked: control.checked,
      };
    }
    if (type === "file") {
      const value = control.multiple
        ? Array.from(control.files ?? [])
        : (control.files?.[0] ?? null);
      return { control, name: control.name, value };
    }
    return { control, name: control.name, value: control.value };
  }

  if (control instanceof HTMLSelectElement && control.multiple) {
    return {
      control,
      name: control.name,
      value: Array.from(control.selectedOptions, (o) => o.value),
    };
  }

  return { control, name: control.name, value: control.value };
}

/**
 * Extracts an {@link HTMLFormElement} into a nested plain object (and writes one
 * back) using dot-notation field names — `name="user.address.city"` nests into
 * objects, numeric segments like `name="tags.0"` build arrays. A static snapshot:
 * values are read/written at call time, no reactivity.
 *
 * Extraction runs each field through a composable {@link FormFieldTransform}
 * pipeline ({@link defaultTransforms} by default), which decides inclusion and
 * may rewrite names/values. Mirrors the ergonomics of the native `FormData`
 * constructor.
 *
 * @example
 * ```ts
 * import { FormObject, defaultTransforms, uncheckedAs }
 *   from "elements-kit/utilities/form-object";
 *
 * // <input name="user.name"> <input name="tags.0"> <input name="tags.1">
 * const data = new FormObject(form).toObject();
 * // => { user: { name: "..." }, tags: ["...", "..."] }
 *
 * // Replace the pipeline — include unchecked checkboxes as false
 * new FormObject(form, {
 *   transforms: [...defaultTransforms.slice(0, 2), uncheckedAs(false)],
 * }).toObject();
 *
 * new FormObject(form).fromObject({ user: { name: "Wael" }, tags: ["a", "b"] });
 * ```
 */
export class FormObject {
  #form: HTMLFormElement;
  #transforms: FormFieldTransform[];

  constructor(form: HTMLFormElement, options: FormObjectOptions = {}) {
    this.#form = form;
    this.#transforms = options.transforms ?? defaultTransforms;
  }

  /** Run a field through the transform pipeline; `null` if any transform drops it. */
  #applyTransforms(field: Field): Field | null {
    let current: Field | null = field;
    for (const transform of this.#transforms) {
      if (current === null) return null;
      current = transform(current);
    }
    return current;
  }

  /**
   * Set `name` to `value`, accumulating repeated names into an array in
   * document order (multi-checkbox groups, repeated inputs).
   */
  #assign(result: FormValues, name: string, value: unknown): void {
    const existing = getPath(result, name);
    if (existing === undefined) {
      setPath(result, name, value);
    } else if (Array.isArray(existing)) {
      existing.push(value);
    } else {
      setPath(result, name, [existing, value]);
    }
  }

  /** Snapshot the form into a nested object built from dot-notation names. */
  toObject(): FormValues {
    const result: FormValues = {};

    for (const el of this.#form.elements) {
      const control = el as Partial<NamedControl>;
      if (!control.name) continue;

      const field = this.#applyTransforms(extractField(el as NamedControl));
      if (field === null) continue;

      this.#assign(result, field.name, field.value);
    }

    return result;
  }

  /** Alias for {@link toObject} — lets `JSON.stringify(instance)` work. */
  toJSON(): FormValues {
    return this.toObject();
  }

  /** True when the control can be written/cleared (named and not disabled). */
  #isWritable(el: Element): el is NamedControl {
    const control = el as Partial<NamedControl>;
    return !!control.name && !control.disabled;
  }

  /** Write values from a nested object back onto the form's named controls. */
  fromObject(data: FormValues): this {
    for (const el of this.#form.elements) {
      if (!this.#isWritable(el)) continue;
      const control = el as NamedControl;
      const value = getPath(data, control.name);
      if (value === undefined) continue;

      if (control instanceof HTMLInputElement) {
        const type = control.type;

        if (type === "checkbox") {
          if (Array.isArray(value)) {
            control.checked = value.includes(control.value);
          } else if (typeof value === "boolean") {
            control.checked = value;
          } else {
            control.checked = value === control.value || value === "on";
          }
          continue;
        }

        if (type === "radio") {
          control.checked = control.value === value;
          continue;
        }

        if (type === "file") {
          continue; // file inputs cannot be assigned programmatically
        }

        control.value = value == null ? "" : String(value);
        continue;
      }

      if (control instanceof HTMLSelectElement && control.multiple) {
        const values = (Array.isArray(value) ? value : [value]).map(String);
        for (const option of control.options) {
          option.selected = values.includes(option.value);
        }
        continue;
      }

      control.value = value == null ? "" : String(value);
    }

    return this;
  }

  /** Reset every named control to its empty/default state. */
  clear(): this {
    for (const el of this.#form.elements) {
      if (!this.#isWritable(el)) continue;
      const control = el as NamedControl;

      if (control instanceof HTMLInputElement) {
        const type = control.type;
        if (type === "checkbox" || type === "radio") {
          control.checked = false;
        } else {
          control.value = "";
        }
        continue;
      }

      if (control instanceof HTMLSelectElement) {
        for (const option of control.options) option.selected = false;
        continue;
      }

      control.value = "";
    }

    return this;
  }
}
