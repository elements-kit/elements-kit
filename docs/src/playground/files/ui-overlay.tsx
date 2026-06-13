import "elements-kit/ui/styles/theme.css";
import "elements-kit/ui/styles/scaling.css";
import "elements-kit/ui/styles/radius.css";
import "elements-kit/ui/styles/space.css";
import "elements-kit/ui/styles/typography.css";
import "elements-kit/ui/styles/cursor.css";
import "elements-kit/ui/styles/unset.css";
import "elements-kit/ui/styles/shadow.css";
import "elements-kit/ui/styles/palette/gray.css";
import "elements-kit/ui/styles/neutral/gray.css";
import "elements-kit/ui/styles/palette/black-alpha.css";
import "elements-kit/ui/styles/palette/mint.css";
import "elements-kit/ui/styles/accent/mint.css";

import "elements-kit/ui/button/button.css";
import "elements-kit/ui/card/card.css";
import "elements-kit/ui/overlay/index.css";
import "elements-kit/ui/overlay/overlay.css";

import { signal } from "elements-kit/signals";
import { createOverlayGestures } from "elements-kit/ui/overlay";

const dark = signal(false);
const detent = signal("medium");

/** Location points for the persistent panel — saturated values dock
 * flush to the constraint edges. */
const morphSpots: { label: string; x: string; y: string }[] = [
  { label: "corner", x: "9999px", y: "9999px" },
  { label: "bottom", x: "", y: "9999px" },
  { label: "center", x: "", y: "" },
  { label: "right", x: "9999px", y: "" },
];

function SectionHeading({ children }: { children: any }) {
  return (
    <h3 style:margin="0 0 12px" style:font-size="14px" style:font-weight="600">
      {children}
    </h3>
  );
}

export class App {
  sheet!: HTMLDialogElement;
  modal!: HTMLDialogElement;
  drawer!: HTMLDialogElement;
  panel!: HTMLDialogElement;
  #sheetGestures?: ReturnType<typeof createOverlayGestures>;

  openSheet() {
    if (!this.#sheetGestures) {
      this.#sheetGestures = createOverlayGestures(this.sheet);
      this.sheet.addEventListener("detentchange", () =>
        detent(this.#sheetGestures!.detent),
      );
    }
    this.#sheetGestures.setDetent("medium");
    this.sheet.showModal();
  }

  moveTo(spot: { x: string; y: string }) {
    if (spot.x) this.panel.style.setProperty("--overlay-x", spot.x);
    else this.panel.style.removeProperty("--overlay-x");
    if (spot.y) this.panel.style.setProperty("--overlay-y", spot.y);
    else this.panel.style.removeProperty("--overlay-y");
  }

  render() {
    return (
      <div
        class:dark={dark}
        data-accent="mint"
        data-neutral="gray"
        data-radius="medium"
        style:padding="24px"
        style:display="grid"
        style:gap="32px"
        style:background="var(--neutral-1)"
        style:color="var(--neutral-12)"
        style:font-family="var(--default-font-family, system-ui, sans-serif)"
        style:max-width="640px"
      >
        <button
          class="unset x-button"
          data-variant="text"
          data-size="1"
          style:justify-self="end"
          on:click={() => dark(!dark())}
        >
          {() => (dark() ? "☀ Light mode" : "☾ Dark mode")}
        </button>

        <section>
          <SectionHeading>
            Bottom sheet — drag the grabber, current detent: {() => detent()}
          </SectionHeading>
          <button
            class="unset x-button"
            data-variant="solid"
            data-size="2"
            on:click={() => this.openSheet()}
          >
            Open bottom sheet
          </button>
          <dialog
            class="unset x-overlay"
            data-resize="block-start"
            data-detent="medium"
            style="--overlay-y: 9999px; --overlay-w: var(--overlay-constraint-width)"
            ref={(el: HTMLDialogElement) => (this.sheet = el)}
          >
            <div class="x-card" data-variant="elevated" data-size="3">
              <strong>Filters</strong>
              <p>
                Drag between detents (small / medium / large), or flick down to
                dismiss. Esc and the close button also work — all native{" "}
                <code>&lt;dialog&gt;</code> behavior.
              </p>
              <button
                class="unset x-button"
                data-variant="soft"
                data-size="1"
                on:click={() => this.sheet.close()}
              >
                Close
              </button>
            </div>
          </dialog>
        </section>

        <section>
          <SectionHeading>
            Centered window — move from the top grabber, resize from the corner
          </SectionHeading>
          <button
            class="unset x-button"
            data-variant="surface"
            data-size="2"
            on:click={() => this.modal.showModal()}
          >
            Open card modal
          </button>
          <dialog
            class="unset x-overlay"
            data-resize="end-end"
            data-draggable
            ref={(el: HTMLDialogElement) => {
              this.modal = el;
              createOverlayGestures(el); // free corner resize
            }}
          >
            <div class="x-card" data-variant="elevated" data-size="3">
              <strong>Confirm</strong>
              <p>
                The default location (centered), iPad-window style: drag the
                top grabber to move it around the viewport (fling it
                off-screen to dismiss), and the bottom-end corner grip to
                resize.
              </p>
              <button
                class="unset x-button"
                data-variant="solid"
                data-size="1"
                on:click={() => this.modal.close()}
              >
                Done
              </button>
            </div>
          </dialog>
        </section>

        <section>
          <SectionHeading>Drawer — drag between width detents</SectionHeading>
          <button
            class="unset x-button"
            data-variant="outline"
            data-size="2"
            on:click={() => this.drawer.showModal()}
          >
            Open drawer
          </button>
          <dialog
            class="unset x-overlay"
            data-resize="inline-start"
            style="--overlay-x: 9999px; --overlay-h: var(--overlay-constraint-height)"
            ref={(el: HTMLDialogElement) => {
              this.drawer = el;
              createOverlayGestures(el); // width detents
            }}
          >
            <div class="x-card" data-variant="elevated" data-size="3">
              <strong>Settings</strong>
              <p>
                A full-height side drawer. Drag the inner-edge grabber between
                width detents, or flick toward the edge to dismiss.
              </p>
              <button
                class="unset x-button"
                data-variant="soft"
                data-size="1"
                on:click={() => this.drawer.close()}
              >
                Close
              </button>
            </div>
          </dialog>
        </section>

        <section>
          <SectionHeading>
            Persistent panel — move the location point while open
          </SectionHeading>
          <button
            class="unset x-button"
            data-variant="outline"
            data-size="2"
            popovertarget="overlay-panel"
          >
            Toggle panel
          </button>
          <dialog
            class="unset x-overlay"
            id="overlay-panel"
            popover="manual"
            data-resize="block-start"
            data-detent="small"
            style="--overlay-x: 9999px; --overlay-y: 9999px"
            ref={(el: HTMLDialogElement) => {
              this.panel = el;
              createOverlayGestures(el);
            }}
          >
            <div class="x-card" data-variant="elevated" data-size="2">
              <strong>Apple Maps style</strong>
              <p style:margin="4px 0 8px">
                <code>popover="manual"</code> keeps it in the top layer while
                the page stays interactive. Move the location point — it
                morphs with a plain CSS transition.
              </p>
              <div style:display="flex" style:flex-wrap="wrap" style:gap="8px">
                {morphSpots.map((spot) => (
                  <button
                    class="unset x-button"
                    data-variant="soft"
                    data-size="1"
                    on:click={() => this.moveTo(spot)}
                  >
                    {spot.label}
                  </button>
                ))}
              </div>
            </div>
          </dialog>
        </section>
      </div>
    );
  }
}
