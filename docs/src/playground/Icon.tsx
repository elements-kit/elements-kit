/** @jsxImportSource react */
import add from "@material-symbols/svg-400/rounded/add.svg?raw";
import check from "@material-symbols/svg-400/rounded/check.svg?raw";
import close from "@material-symbols/svg-400/rounded/close.svg?raw";
import formatAlignLeft from "@material-symbols/svg-400/rounded/format_align_left.svg?raw";
import link from "@material-symbols/svg-400/rounded/link.svg?raw";
import openInNew from "@material-symbols/svg-400/rounded/open_in_new.svg?raw";
import restartAlt from "@material-symbols/svg-400/rounded/restart_alt.svg?raw";
import terminal from "@material-symbols/svg-400/rounded/terminal.svg?raw";

// Material Symbols, the kit's icon set: the path only, sized by font-size.
const pathOf = (svg: string) => svg.match(/ d="([^"]+)"/)![1];

const icons = {
  add,
  check,
  close,
  format: formatAlignLeft,
  link,
  open: openInNew,
  reset: restartAlt,
  terminal,
};

export type IconName = keyof typeof icons;

export function Icon({ name, className = "" }: { name: IconName; className?: string }) {
  return (
    <svg viewBox="0 -960 960 960" fill="currentColor" aria-hidden="true" className={`size-[1.25em] shrink-0 ${className}`}>
      <path d={pathOf(icons[name])} />
    </svg>
  );
}
