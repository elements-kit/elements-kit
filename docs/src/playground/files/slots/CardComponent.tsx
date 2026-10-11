import { reactive } from "elements-kit/signals";
import { Children } from "elements-kit/jsx-runtime";

// Inside elements-kit JSX, named slots are just properties — pass them as
// props (`<CardComponent header={…}/>`) and place them in the template. No
// `@slot()` decorator is needed here; `@slot()` is for filling a custom
// element's slots imperatively from OUTSIDE elements-kit (React/vanilla), see
// the Custom Elements guide. Fields are `@reactive` so a reassignment could
// update live if the template read them as `{() => this.header}`.
export class CardComponent {
  @reactive() header!: Children;
  @reactive() actions!: Children;
  @reactive() children!: Children;

  render() {
    return (
      <article
        style="
        border: 1px solid #8884;
        border-radius: 8px;
        overflow: hidden;
        max-width: 320px;
        font-family: sans-serif;
      "
      >
        <header style="padding: 1rem; border-bottom: 1px solid #8884; background: #8881">
          {this.header}
        </header>
        <main style="padding: 1rem">{this.children}</main>
        <footer style="padding: 0.75rem 1rem; border-top: 1px solid #8884; display: flex; gap: 8px">
          {this.actions}
        </footer>
      </article>
    );
  }
}
