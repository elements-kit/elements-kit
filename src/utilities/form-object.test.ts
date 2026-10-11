import { describe, it, expect, afterEach } from "vitest";
import {
  FormObject,
  defaultTransforms,
  skipButtons,
  dropUnchecked,
  uncheckedAs,
  skipEmpty,
  type Field,
} from "./form-object.ts";

afterEach(() => {
  document.body.innerHTML = "";
});

/** Build a form from an HTML string and attach it to the document. */
function makeForm(html: string): HTMLFormElement {
  const form = document.createElement("form");
  form.innerHTML = html;
  document.body.appendChild(form);
  return form;
}

describe("FormObject.toObject", () => {
  it("reads flat fields into a flat object", () => {
    const form = makeForm(`
      <input name="email" value="a@b.com" />
      <input name="age" value="30" />
    `);
    expect(new FormObject(form).toObject()).toEqual({
      email: "a@b.com",
      age: "30",
    });
  });

  it("nests dot-notation names into nested objects", () => {
    const form = makeForm(`
      <input name="user.name" value="Wael" />
      <input name="user.address.city" value="Tunis" />
    `);
    expect(new FormObject(form).toObject()).toEqual({
      user: { name: "Wael", address: { city: "Tunis" } },
    });
  });

  it("builds arrays from numeric segments", () => {
    const form = makeForm(`
      <input name="tags.0" value="a" />
      <input name="tags.1" value="b" />
    `);
    expect(new FormObject(form).toObject()).toEqual({ tags: ["a", "b"] });
  });

  it("builds arrays of objects from mixed numeric + key segments", () => {
    const form = makeForm(`
      <input name="items.0.id" value="1" />
      <input name="items.1.id" value="2" />
    `);
    expect(new FormObject(form).toObject()).toEqual({
      items: [{ id: "1" }, { id: "2" }],
    });
  });

  it("reads textarea values", () => {
    const form = makeForm(`<textarea name="bio">hello</textarea>`);
    expect(new FormObject(form).toObject()).toEqual({ bio: "hello" });
  });

  it("uses a checked checkbox's value, defaulting to 'on'", () => {
    const form = makeForm(`<input type="checkbox" name="agree" checked />`);
    expect(new FormObject(form).toObject()).toEqual({ agree: "on" });
  });

  it("omits an unchecked checkbox by default", () => {
    const form = makeForm(`<input type="checkbox" name="agree" />`);
    expect(new FormObject(form).toObject()).toEqual({});
  });

  it("includes an unchecked checkbox as false via uncheckedAs", () => {
    const form = makeForm(`<input type="checkbox" name="agree" />`);
    expect(
      new FormObject(form, {
        transforms: [skipButtons, uncheckedAs(false)],
      }).toObject(),
    ).toEqual({ agree: false });
  });

  it("collects a `[]` checkbox group into an array of checked values", () => {
    const form = makeForm(`
      <input type="checkbox" name="colors[]" value="red" checked />
      <input type="checkbox" name="colors[]" value="green" />
      <input type="checkbox" name="colors[]" value="blue" checked />
    `);
    expect(new FormObject(form).toObject()).toEqual({
      colors: ["red", "blue"],
    });
  });

  it("reads the selected radio value", () => {
    const form = makeForm(`
      <input type="radio" name="plan" value="free" />
      <input type="radio" name="plan" value="pro" checked />
    `);
    expect(new FormObject(form).toObject()).toEqual({ plan: "pro" });
  });

  it("reads a single select value", () => {
    const form = makeForm(`
      <select name="country">
        <option value="tn">Tunisia</option>
        <option value="fr" selected>France</option>
      </select>
    `);
    expect(new FormObject(form).toObject()).toEqual({ country: "fr" });
  });

  it("reads a multiple select as an array", () => {
    const form = makeForm(`
      <select name="langs" multiple>
        <option value="js" selected>JS</option>
        <option value="ts" selected>TS</option>
        <option value="go">Go</option>
      </select>
    `);
    expect(new FormObject(form).toObject()).toEqual({
      langs: ["js", "ts"],
    });
  });

  it("skips disabled controls by default", () => {
    const form = makeForm(`
      <input name="a" value="1" />
      <input name="b" value="2" disabled />
    `);
    expect(new FormObject(form).toObject()).toEqual({ a: "1" });
  });

  it("includes disabled controls when skipDisabled is omitted", () => {
    const form = makeForm(`
      <input name="a" value="1" />
      <input name="b" value="2" disabled />
    `);
    expect(
      new FormObject(form, {
        transforms: [skipButtons, dropUnchecked],
      }).toObject(),
    ).toEqual({ a: "1", b: "2" });
  });

  it("skips unnamed controls", () => {
    const form = makeForm(`
      <input value="ignored" />
      <input name="kept" value="ok" />
    `);
    expect(new FormObject(form).toObject()).toEqual({ kept: "ok" });
  });

  it("yields File objects for file inputs", () => {
    const form = makeForm(`<input type="file" name="doc" />`);
    const input = form.elements.namedItem("doc") as HTMLInputElement;
    const file = new File(["data"], "report.txt", { type: "text/plain" });
    const dt = new DataTransfer();
    dt.items.add(file);
    input.files = dt.files;

    const result = new FormObject(form).toObject();
    expect(result.doc).toBeInstanceOf(File);
    expect((result.doc as File).name).toBe("report.txt");
  });
});

describe("FormObject same-name controls (bare name → last value wins)", () => {
  it("keeps the last value when repeated text inputs share a bare name", () => {
    const form = makeForm(`
      <input name="x" value="a" />
      <input name="x" value="b" />
    `);
    expect(new FormObject(form).toObject()).toEqual({ x: "b" });
  });

  it("keeps the last value across mixed control kinds with a bare name", () => {
    const form = makeForm(`
      <input name="y" value="a" />
      <select name="y"><option value="b" selected>b</option></select>
    `);
    expect(new FormObject(form).toObject()).toEqual({ y: "b" });
  });

  it("keeps the last checked value for a bare checkbox group", () => {
    const form = makeForm(`
      <input type="checkbox" name="c" value="r" checked />
      <input type="checkbox" name="c" value="g" checked />
    `);
    expect(new FormObject(form).toObject()).toEqual({ c: "g" });
  });

  it("lets a checked checkbox override a preceding hidden fallback (idiom)", () => {
    const form = makeForm(`
      <input type="hidden" name="agree" value="0" />
      <input type="checkbox" name="agree" value="1" checked />
    `);
    expect(new FormObject(form).toObject()).toEqual({ agree: "1" });
  });

  it("keeps the hidden fallback when the checkbox is unchecked", () => {
    const form = makeForm(`
      <input type="hidden" name="agree" value="0" />
      <input type="checkbox" name="agree" value="1" />
    `);
    expect(new FormObject(form).toObject()).toEqual({ agree: "0" });
  });

  it("keeps a pure radio group as a scalar", () => {
    const form = makeForm(`
      <input type="radio" name="r" value="a" />
      <input type="radio" name="r" value="b" checked />
    `);
    expect(new FormObject(form).toObject()).toEqual({ r: "b" });
  });
});

describe("FormObject `[]` array fields", () => {
  it("wraps a single `[]` control in an array", () => {
    const form = makeForm(`<input type="checkbox" name="c[]" value="x" checked />`);
    expect(new FormObject(form).toObject()).toEqual({ c: ["x"] });
  });

  it("appends every surviving `[]` control in document order", () => {
    const form = makeForm(`
      <input type="checkbox" name="c[]" value="x" checked />
      <input type="checkbox" name="c[]" value="y" checked />
    `);
    expect(new FormObject(form).toObject()).toEqual({ c: ["x", "y"] });
  });

  it("yields an empty array for a declared-but-empty `[]` field", () => {
    const form = makeForm(`<input type="checkbox" name="c[]" value="x" />`);
    expect(new FormObject(form).toObject()).toEqual({ c: [] });
  });

  it("nests a `[]` array under a dot-path", () => {
    const form = makeForm(`
      <input name="user.tags[]" value="a" />
      <input name="user.tags[]" value="b" />
    `);
    expect(new FormObject(form).toObject()).toEqual({
      user: { tags: ["a", "b"] },
    });
  });

  it("hidden + `[]` checkbox: array with both when checked, hidden-only when unchecked", () => {
    const checked = makeForm(`
      <input type="hidden" name="a[]" value="0" />
      <input type="checkbox" name="a[]" value="1" checked />
    `);
    const unchecked = makeForm(`
      <input type="hidden" name="a[]" value="0" />
      <input type="checkbox" name="a[]" value="1" />
    `);
    expect(new FormObject(checked).toObject()).toEqual({ a: ["0", "1"] });
    expect(new FormObject(unchecked).toObject()).toEqual({ a: ["0"] });
  });

  it("builds an array of objects via explicit indices", () => {
    const form = makeForm(`
      <input name="items.0.id" value="1" />
      <input name="items.1.id" value="2" />
    `);
    expect(new FormObject(form).toObject()).toEqual({
      items: [{ id: "1" }, { id: "2" }],
    });
  });
});

describe("FormObject disabled controls", () => {
  it("skips a disabled checked checkbox under the default pipeline", () => {
    const form = makeForm(
      `<input type="checkbox" name="a" value="1" checked disabled />`,
    );
    expect(new FormObject(form).toObject()).toEqual({});
  });

  it("includes a disabled checked checkbox when skipDisabled is omitted", () => {
    const form = makeForm(
      `<input type="checkbox" name="a" value="1" checked disabled />`,
    );
    expect(
      new FormObject(form, {
        transforms: [skipButtons, dropUnchecked],
      }).toObject(),
    ).toEqual({ a: "1" });
  });

  it("still drops a disabled UNCHECKED checkbox via dropUnchecked even without skipDisabled", () => {
    const form = makeForm(
      `<input type="checkbox" name="a" value="1" disabled />`,
    );
    expect(
      new FormObject(form, {
        transforms: [skipButtons, dropUnchecked],
      }).toObject(),
    ).toEqual({});
  });

  it("appends an included disabled member to a `[]` array", () => {
    const form = makeForm(`
      <input type="checkbox" name="g[]" value="1" checked />
      <input type="checkbox" name="g[]" value="2" checked disabled />
    `);
    expect(
      new FormObject(form, {
        transforms: [skipButtons, dropUnchecked],
      }).toObject(),
    ).toEqual({ g: ["1", "2"] });
  });

  it("drops a disabled `[]` member under the default pipeline, keeping the array", () => {
    const form = makeForm(`
      <input type="checkbox" name="g[]" value="1" checked />
      <input type="checkbox" name="g[]" value="2" checked disabled />
    `);
    expect(new FormObject(form).toObject()).toEqual({ g: ["1"] });
  });

  it("a disabled bare checkbox leaves only the hidden value under the default pipeline", () => {
    const form = makeForm(`
      <input type="hidden" name="a" value="0" />
      <input type="checkbox" name="a" value="1" checked disabled />
    `);
    expect(new FormObject(form).toObject()).toEqual({ a: "0" });
  });

  it("an included disabled checkbox overrides the hidden value (bare, last wins)", () => {
    const form = makeForm(`
      <input type="hidden" name="a" value="0" />
      <input type="checkbox" name="a" value="1" checked disabled />
    `);
    expect(
      new FormObject(form, {
        transforms: [skipButtons, dropUnchecked],
      }).toObject(),
    ).toEqual({ a: "1" });
  });

  it("does not write disabled controls in fromObject", () => {
    const form = makeForm(`<input name="a" value="orig" disabled />`);
    new FormObject(form).fromObject({ a: "changed" });
    expect((form.elements.namedItem("a") as HTMLInputElement).value).toBe(
      "orig",
    );
  });
});

describe("FormObject path edge cases", () => {
  it("does not pollute Object.prototype via __proto__ segments", () => {
    const form = makeForm(`<input name="__proto__.polluted" value="yes" />`);
    const result = new FormObject(form).toObject();
    expect(result).toEqual({});
    expect(({} as Record<string, unknown>).polluted).toBeUndefined();
  });

  it("ignores constructor / prototype segments", () => {
    const form = makeForm(`
      <input name="constructor.prototype.x" value="bad" />
      <input name="a.prototype.b" value="bad" />
    `);
    expect(new FormObject(form).toObject()).toEqual({});
  });

  it("leaves gaps in sparse array indices as holes", () => {
    const form = makeForm(`
      <input name="t.0" value="a" />
      <input name="t.2" value="c" />
    `);
    // Index 1 has no control — the array hole serializes to null via JSON.
    expect(new FormObject(form).toObject()).toEqual({ t: ["a", undefined, "c"] });
  });

  it("builds deeply nested arrays of objects", () => {
    const form = makeForm(`
      <input name="a.0.b.0.c" value="1" />
      <input name="a.0.b.1.c" value="2" />
    `);
    expect(new FormObject(form).toObject()).toEqual({
      a: [{ b: [{ c: "1" }, { c: "2" }] }],
    });
  });

  it("treats numeric top-level names as object keys, not an array", () => {
    const form = makeForm(`
      <input name="0" value="a" />
      <input name="1" value="b" />
    `);
    expect(new FormObject(form).toObject()).toEqual({ "0": "a", "1": "b" });
  });
});

describe("FormObject transforms", () => {
  it("skips named buttons by default", () => {
    const form = makeForm(`
      <input name="email" value="a@b.com" />
      <button name="action" value="save">Save</button>
      <input type="submit" name="submit" value="go" />
    `);
    expect(new FormObject(form).toObject()).toEqual({ email: "a@b.com" });
  });

  it("drops unchecked checkboxes and radios by default", () => {
    const form = makeForm(`
      <input type="checkbox" name="agree" />
      <input type="radio" name="plan" value="free" />
      <input type="radio" name="plan" value="pro" />
    `);
    expect(new FormObject(form).toObject()).toEqual({});
  });

  it("uncheckedAs(false) includes unchecked checkbox but still drops unchecked radio", () => {
    const form = makeForm(`
      <input type="checkbox" name="agree" />
      <input type="radio" name="plan" value="free" />
      <input type="radio" name="plan" value="pro" />
    `);
    expect(
      new FormObject(form, {
        transforms: [skipButtons, uncheckedAs(false)],
      }).toObject(),
    ).toEqual({ agree: false });
  });

  it("skipEmpty drops empty-string fields", () => {
    const form = makeForm(`
      <input name="filled" value="x" />
      <input name="blank" value="" />
    `);
    expect(
      new FormObject(form, {
        transforms: [...defaultTransforms, skipEmpty],
      }).toObject(),
    ).toEqual({ filled: "x" });
  });

  it("runs a custom transform that rewrites the value", () => {
    const form = makeForm(`<input name="name" value="  Wael  " />`);
    const trim = (f: Field): Field => ({
      ...f,
      value: typeof f.value === "string" ? f.value.trim() : f.value,
    });
    expect(
      new FormObject(form, {
        transforms: [...defaultTransforms, trim],
      }).toObject(),
    ).toEqual({ name: "Wael" });
  });

  it("runs a custom transform that renames the field path", () => {
    const form = makeForm(`<input name="legacy" value="v" />`);
    const rename = (f: Field): Field =>
      f.name === "legacy" ? { ...f, name: "modern" } : f;
    expect(
      new FormObject(form, {
        transforms: [...defaultTransforms, rename],
      }).toObject(),
    ).toEqual({ modern: "v" });
  });

  it("with an empty pipeline emits everything (disabled, buttons, unchecked)", () => {
    const form = makeForm(`
      <input name="a" value="1" disabled />
      <button name="b" value="x">x</button>
      <input type="checkbox" name="c" value="on" />
    `);
    expect(new FormObject(form, { transforms: [] }).toObject()).toEqual({
      a: "1",
      b: "x",
      c: "on",
    });
  });
});

describe("FormObject.fromObject", () => {
  it("writes nested values back onto controls", () => {
    const form = makeForm(`
      <input name="user.name" />
      <input name="user.address.city" />
    `);
    new FormObject(form).fromObject({
      user: { name: "Wael", address: { city: "Tunis" } },
    });
    expect((form.elements.namedItem("user.name") as HTMLInputElement).value).toBe(
      "Wael",
    );
    expect(
      (form.elements.namedItem("user.address.city") as HTMLInputElement).value,
    ).toBe("Tunis");
  });

  it("writes array values back into numeric-segment controls", () => {
    const form = makeForm(`
      <input name="tags.0" />
      <input name="tags.1" />
    `);
    new FormObject(form).fromObject({ tags: ["a", "b"] });
    expect((form.elements.namedItem("tags.0") as HTMLInputElement).value).toBe(
      "a",
    );
    expect((form.elements.namedItem("tags.1") as HTMLInputElement).value).toBe(
      "b",
    );
  });

  it("round-trips a `[]` checkbox group through fromObject", () => {
    const html = `
      <input type="checkbox" name="colors[]" value="red" />
      <input type="checkbox" name="colors[]" value="green" />
      <input type="checkbox" name="colors[]" value="blue" />
    `;
    const form = makeForm(html);
    new FormObject(form).fromObject({ colors: ["red", "blue"] });
    expect(new FormObject(form).toObject()).toEqual({ colors: ["red", "blue"] });
  });

  it("sets checkbox checked state from a boolean-ish value", () => {
    const form = makeForm(`<input type="checkbox" name="agree" value="yes" />`);
    new FormObject(form).fromObject({ agree: "yes" });
    expect((form.elements.namedItem("agree") as HTMLInputElement).checked).toBe(
      true,
    );
  });

  it("selects the matching radio", () => {
    const form = makeForm(`
      <input type="radio" name="plan" value="free" />
      <input type="radio" name="plan" value="pro" />
    `);
    new FormObject(form).fromObject({ plan: "pro" });
    const checked = form.querySelector<HTMLInputElement>(
      "input[name=plan]:checked",
    );
    expect(checked?.value).toBe("pro");
  });

  it("leaves controls untouched when the path is missing", () => {
    const form = makeForm(`<input name="keep" value="original" />`);
    new FormObject(form).fromObject({ other: "x" });
    expect((form.elements.namedItem("keep") as HTMLInputElement).value).toBe(
      "original",
    );
  });

  it("round-trips a form through toObject -> fromObject -> toObject", () => {
    const html = `
      <input name="user.name" value="Wael" />
      <input name="tags.0" value="a" />
      <input name="tags.1" value="b" />
      <input type="checkbox" name="agree" checked />
      <select name="country">
        <option value="tn">Tunisia</option>
        <option value="fr" selected>France</option>
      </select>
    `;
    const source = new FormObject(makeForm(html)).toObject();

    const target = makeForm(html);
    // wipe target values so fromObject is doing the work
    new FormObject(target).clear();
    const result = new FormObject(target).fromObject(source).toObject();

    expect(result).toEqual(source);
  });

  it("returns this for chaining", () => {
    const form = makeForm(`<input name="a" />`);
    const data = new FormObject(form);
    expect(data.fromObject({ a: "1" })).toBe(data);
    expect(data.clear()).toBe(data);
  });
});

describe("FormObject serialization", () => {
  it("supports JSON.stringify via toJSON", () => {
    const form = makeForm(`<input name="user.name" value="Wael" />`);
    expect(JSON.stringify(new FormObject(form))).toBe(
      JSON.stringify({ user: { name: "Wael" } }),
    );
  });
});
