import { reactive, signal } from "@/signals";

enum Block {
  TOP = 0b00,
  BOTTOM = 0b01,
}
enum Inline {
  LEFT = 0b00,
  RIGHT = 0b10,
}

const BLOCK = 0b01;
const INLINE = 0b10;

declare const POSITION: unique symbol;
/** Packed `Block | Inline`. Only constructible via `position()`. */
type Position = number & { readonly [POSITION]: true };

const position = (b: Block, i: Inline) => (b | i) as Position;
const blockOf = (p: Position) => (p & BLOCK) as Block;
const inlineOf = (p: Position) => (p & INLINE) as Inline;

/** A pinned block edge and its coordinate. */
type BlockEdge =
  | { top: number; bottom?: never }
  | { bottom: number; top?: never };
/** A pinned inline edge and its coordinate. */
type InlineEdge =
  | { left: number; right?: never }
  | { right: number; left?: never };
/** Neither block edge pinned — the axis is free. */
type NoBlock = { top?: never; bottom?: never };
/** Neither inline edge pinned — the axis is free. */
type NoInline = { left?: never; right?: never };

/**
 * A corner (one edge pinned on each axis) or a side (one edge, the other axis
 * free). Never empty, and never both edges of one axis.
 */
export type Boundary =
  | (BlockEdge & InlineEdge) // corner
  | (BlockEdge & NoInline) // side
  | (NoBlock & InlineEdge); // side

export class Region {
  #position = signal(position(Block.TOP, Inline.LEFT));
  /** Coordinate of the pinned inline edge — left or right, per `position`. */
  #ix = signal(0);
  /** Coordinate of the pinned block edge — top or bottom, per `position`. */
  #iy = signal(0);
  @reactive() w = 0;
  @reactive() h = 0;

  /** The edges `ix`/`iy` are measured from; also the edges a resize grows away from. */
  get position() {
    return this.#position();
  }

  get x() {
    return inlineOf(this.position) === Inline.LEFT
      ? this.#ix()
      : this.#ix() - this.w;
  }
  get y() {
    return blockOf(this.position) === Block.TOP
      ? this.#iy()
      : this.#iy() - this.h;
  }

  get left() {
    return this.x;
  }
  get right() {
    return this.x + this.w;
  }
  get top() {
    return this.y;
  }
  get bottom() {
    return this.y + this.h;
  }

  set left(v: number) {
    this.#ix(v);
    this.#setInline(Inline.LEFT);
  }
  set right(v: number) {
    this.#ix(v);
    this.#setInline(Inline.RIGHT);
  }
  set top(v: number) {
    this.#iy(v);
    this.#setBlock(Block.TOP);
  }
  set bottom(v: number) {
    this.#iy(v);
    this.#setBlock(Block.BOTTOM);
  }

  #setBlock(b: Block) {
    this.#position(((this.position & ~BLOCK) | b) as Position);
  }
  #setInline(i: Inline) {
    this.#position(((this.position & ~INLINE) | i) as Position);
  }
}
