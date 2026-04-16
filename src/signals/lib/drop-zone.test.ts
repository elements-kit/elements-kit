import { describe, it, expect } from "vitest";
import { effectScope } from "../index.ts";
import { createDropZone } from "./drop-zone.ts";

describe("createDropZone", () => {
  it("starts with isOver=false and empty files", () => {
    const el = document.createElement("div");

    let dz!: ReturnType<typeof createDropZone>;
    effectScope(() => {
      dz = createDropZone(el);
    });

    expect(dz.isOver()).toBe(false);
    expect(dz.files()).toEqual([]);
  });

  it("sets isOver=true on dragenter", () => {
    const el = document.createElement("div");
    document.body.appendChild(el);

    let dz!: ReturnType<typeof createDropZone>;
    effectScope(() => {
      dz = createDropZone(el);
    });

    el.dispatchEvent(new Event("dragenter"));
    expect(dz.isOver()).toBe(true);
  });

  it("sets isOver=false after dragleave", () => {
    const el = document.createElement("div");
    document.body.appendChild(el);

    let dz!: ReturnType<typeof createDropZone>;
    effectScope(() => {
      dz = createDropZone(el);
    });

    el.dispatchEvent(new Event("dragenter"));
    el.dispatchEvent(new Event("dragleave"));
    expect(dz.isOver()).toBe(false);
  });

  it("cleans up on dispose", () => {
    const el = document.createElement("div");

    let dz!: ReturnType<typeof createDropZone>;
    effectScope(() => {
      dz = createDropZone(el);
    });

    dz[Symbol.dispose]();
  });
});
