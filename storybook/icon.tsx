import Symbol0 from "@material-symbols/svg-400/rounded/wifi-fill.svg?ek";
import Symbol1 from "@material-symbols/svg-400/rounded/flight-fill.svg?ek";
import Symbol2 from "@material-symbols/svg-400/rounded/notifications-fill.svg?ek";
import Symbol3 from "@material-symbols/svg-400/rounded/search-fill.svg?ek";
import Symbol4 from "@material-symbols/svg-400/rounded/chevron_left-fill.svg?ek";
import Symbol5 from "@material-symbols/svg-600/rounded/more_horiz-fill.svg?ek";
import Symbol6 from "@material-symbols/svg-400/rounded/share-fill.svg?ek";
import Symbol7 from "@material-symbols/svg-400/rounded/edit_square-fill.svg?ek";
import Symbol8 from "@material-symbols/svg-400/rounded/filter_list-fill.svg?ek";
import Symbol9 from "@material-symbols/svg-400/rounded/home-fill.svg?ek";
import Symbol10 from "@material-symbols/svg-400/rounded/local_library-fill.svg?ek";
import Symbol11 from "@material-symbols/svg-400/rounded/person-fill.svg?ek";
import Symbol12 from "@material-symbols/svg-400/rounded/videocam-fill.svg?ek";
import Symbol13 from "@material-symbols/svg-400/rounded/edit-fill.svg?ek";
import Symbol14 from "@material-symbols/svg-400/rounded/title-fill.svg?ek";
import Symbol15 from "@material-symbols/svg-400/rounded/shapes-fill.svg?ek";
import Symbol16 from "@material-symbols/svg-400/rounded/view_list-fill.svg?ek";
import Symbol17 from "@material-symbols/svg-400/rounded/grid_view-fill.svg?ek";
import Symbol18 from "@material-symbols/svg-400/rounded/view_kanban-fill.svg?ek";
import Symbol19 from "@material-symbols/svg-400/rounded/remove-fill.svg?ek";
import Symbol20 from "@material-symbols/svg-400/rounded/add-fill.svg?ek";
import Symbol21 from "@material-symbols/svg-400/rounded/close-fill.svg?ek";
import Symbol22 from "@material-symbols/svg-400/rounded/info-fill.svg?ek";
import Symbol23 from "@material-symbols/svg-400/rounded/keyboard_arrow_down-fill.svg?ek";
import Symbol24 from "@material-symbols/svg-400/rounded/widgets-fill.svg?ek";
import Symbol25 from "@material-symbols/svg-400/rounded/palette-fill.svg?ek";
import Symbol26 from "@material-symbols/svg-400/rounded/devices-fill.svg?ek";
import Symbol27 from "@material-symbols/svg-400/rounded/format_bold-fill.svg?ek";
import Symbol28 from "@material-symbols/svg-400/rounded/format_italic-fill.svg?ek";
import Symbol29 from "@material-symbols/svg-400/rounded/format_underlined-fill.svg?ek";
import Symbol30 from "@material-symbols/svg-400/rounded/arrow_back_ios-fill.svg?ek";
import Symbol31 from "@material-symbols/svg-400/rounded/arrow_back_ios_new-fill.svg?ek";
import Symbol32 from "@material-symbols/svg-400/rounded/reply-fill.svg?ek";
import Symbol33 from "@material-symbols/svg-400/rounded/forward-fill.svg?ek";
import Symbol34 from "@material-symbols/svg-400/rounded/flag-fill.svg?ek";
import Symbol35 from "@material-symbols/svg-400/rounded/notifications_off-fill.svg?ek";
import Symbol36 from "@material-symbols/svg-400/rounded/chevron_right-fill.svg?ek";
import Symbol37 from "@material-symbols/svg-400/rounded/check-fill.svg?ek";
import Symbol38 from "@material-symbols/svg-400/rounded/open_in_new-fill.svg?ek";
import Symbol39 from "@material-symbols/svg-400/rounded/delete-fill.svg?ek";

const icons = {
  wifi: Symbol0,
  flight: Symbol1,
  notifications: Symbol2,
  search: Symbol3,
  chevron_left: Symbol4,
  more_horiz: Symbol5,
  share: Symbol6,
  edit_square: Symbol7,
  filter_list: Symbol8,
  home: Symbol9,
  local_library: Symbol10,
  person: Symbol11,
  videocam: Symbol12,
  edit: Symbol13,
  title: Symbol14,
  shapes: Symbol15,
  view_list: Symbol16,
  grid_view: Symbol17,
  view_kanban: Symbol18,
  remove: Symbol19,
  add: Symbol20,
  close: Symbol21,
  info: Symbol22,
  keyboard_arrow_down: Symbol23,
  widgets: Symbol24,
  palette: Symbol25,
  devices: Symbol26,
  format_bold: Symbol27,
  format_italic: Symbol28,
  format_underlined: Symbol29,
  arrow_back_ios: Symbol30,
  arrow_back_ios_new: Symbol31,
  reply: Symbol32,
  forward: Symbol33,
  flag: Symbol34,
  notifications_off: Symbol35,
  chevron_right: Symbol36,
  check: Symbol37,
  open_in_new: Symbol38,
  delete: Symbol39,
};

export type IconName = keyof typeof icons;

/** Rounded Filled symbols at weight 400; heavier dots keep More legible. */
export function StoryIcon(props: { name: IconName; size?: string; class?: string; style?: string; "data-accent"?: string }) {
  const Symbol = icons[props.name];
  return <Symbol aria-hidden="true" width={props.size ?? "1.25em"} height={props.size ?? "1.25em"} class={props.class} style={props.style} data-accent={props["data-accent"]} />;
}
