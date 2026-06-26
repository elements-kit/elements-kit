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

  it("collapses multiple same-named checkboxes into an array", () => {
    const form = makeForm(`
      <input type="checkbox" name="colors" value="red" checked />
      <input type="checkbox" name="colors" value="green" />
      <input type="checkbox" name="colors" value="blue" checked />
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
