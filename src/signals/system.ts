/**
 * @module system
 *
 * Low-level reactive dependency-tracking infrastructure.
 *
 * `createReactiveSystem` is a factory that wires together the graph primitives
 * (link / unlink / propagate / checkDirty / shallowPropagate) and delegates
 * three lifecycle decisions back to the caller:
 *
 * - **update** – recompute a dirty computed/signal node and report whether its
 *   value changed.
 * - **notify** – schedule a watching node (effect) for execution.
 * - **unwatched** – a dep node lost its last subscriber; let the caller decide
 *   whether to stop tracking it or keep it alive.
 *
 * All graph nodes implement {@link ReactiveNode}.  Edges between nodes are
 * represented as {@link Link} objects that participate in two independent
 * doubly-linked lists simultaneously:
 *
 * - **dep-list** (`prevDep` / `nextDep`): the ordered set of dependencies of a
 *   single subscriber, threaded through that subscriber's `deps`/`depsTail`
 *   pointers.
 * - **sub-list** (`prevSub` / `nextSub`): the ordered set of subscribers of a
 *   single dependency, threaded through that dep's `subs`/`subsTail` pointers.
 */

/**
 * Base interface shared by every reactive primitive (signal, computed, effect,
 * effectScope).
 *
 * A node sits at the intersection of two linked lists:
 * - As a **subscriber**: `deps` → `depsTail` lists every dep it reads.
 * - As a **dependency**: `subs` → `subsTail` lists every subscriber that reads
 *   it.
 */
export interface ReactiveNode {
  /** Head of this node's dependency list (things this node reads). */
  deps?: Link;
  /** Tail of this node's dependency list; used for O(1) append. */
  depsTail?: Link;
  /** Head of this node's subscriber list (things that read this node). */
  subs?: Link;
  /** Tail of this node's subscriber list; used for O(1) append. */
  subsTail?: Link;
  /** Bitmask of {@link ReactiveFlags} describing the node's current state. */
  flags: ReactiveFlags;
}

/**
 * A directed edge in the reactive graph connecting one dependency node to one
 * subscriber node.
 *
 * Each `Link` participates in **two** doubly-linked lists at once:
 * - The subscriber's dep-chain (`prevDep` / `nextDep`).
 * - The dependency's sub-chain (`prevSub` / `nextSub`).
 *
 * `version` is a logical clock value stamped when the link is created or
 * refreshed during a tracking run, allowing stale links to be detected and
 * pruned efficiently.
 */
export interface Link {
  /** Logical clock value at the time this link was last refreshed. */
  version: number;
  /** The dependency (upstream) node. */
  dep: ReactiveNode;
  /** The subscriber (downstream) node. */
  sub: ReactiveNode;
  /** Previous link in the subscriber's dep-chain, or `undefined` if first. */
  prevSub: Link | undefined;
  /** Next link in the subscriber's dep-chain, or `undefined` if last. */
  nextSub: Link | undefined;
  /** Previous link in the dependency's sub-chain, or `undefined` if first. */
  prevDep: Link | undefined;
  /** Next link in the dependency's sub-chain, or `undefined` if last. */
  nextDep: Link | undefined;
}

/** @internal Stack node used for iterative graph traversal without recursion. */
interface Stack<T> {
  value: T;
  prev: Stack<T> | undefined;
}

/**
 * Bitmask flags that encode the current state of a {@link ReactiveNode}.
 *
 * | Flag            | Meaning |
 * |-----------------|---------|
 * | `None`          | Clean, not tracking. |
 * | `Mutable`       | Node can propagate value changes downstream (signal / computed). |
 * | `Watching`      | Node is actively watching for changes and should be notified (effect). |
 * | `RecursedCheck` | Node is mid-execution; used to detect self-referential cycles. |
 * | `Recursed`      | Node was found to be recursed during propagation. |
 * | `Dirty`         | Node's value is known to be stale; must recompute before reading. |
 * | `Pending`       | A dep *might* be dirty; check before deciding whether to recompute. |
 */
export const enum ReactiveFlags {
  None = 0,
  Mutable = 1,
  Watching = 2,
  RecursedCheck = 4,
  Recursed = 8,
  Dirty = 16,
  Pending = 32,
}

/**
 * Creates and returns the five core graph-manipulation functions that together
 * implement push-pull reactive dependency tracking.
 *
 * The caller supplies three callbacks that customise high-level behaviour while
 * the returned functions handle all graph bookkeeping:
 *
 * @param update   - Called when a Mutable+Dirty node needs to recompute.
 *                   Return `true` if the computed value changed (triggers
 *                   downstream dirty propagation).
 * @param notify   - Called when a Watching node should be scheduled for
 *                   re-execution (i.e. a dep became dirty).
 * @param unwatched - Called when a dep node's last subscriber is removed.
 *                   The caller may choose to stop the node or keep it alive.
 *
 * @returns `{ link, unlink, propagate, checkDirty, shallowPropagate }`
 */
export function createReactiveSystem({
  update,
  notify,
  unwatched,
}: {
  update(sub: ReactiveNode): boolean;
  notify(sub: ReactiveNode): void;
  unwatched(sub: ReactiveNode): void;
}) {
  return {
    link,
    unlink,
    propagate,
    checkDirty,
    shallowPropagate,
  };

  /**
   * Records that `sub` now depends on `dep` at the given `version`.
   *
   * Duplicate links (same dep/sub pair within the same tracking cycle) are
   * detected and skipped in O(1) by checking the tail of both chains before
   * allocating a new `Link` object.
   *
   * @param dep     - The upstream node being read.
   * @param sub     - The downstream node doing the reading.
   * @param version - Current logical clock value; used for stale-link detection.
   */
  function link(dep: ReactiveNode, sub: ReactiveNode, version: number): void {
    const prevDep = sub.depsTail;
    if (prevDep !== undefined && prevDep.dep === dep) {
      return;
    }
    const nextDep = prevDep !== undefined ? prevDep.nextDep : sub.deps;
    if (nextDep !== undefined && nextDep.dep === dep) {
      nextDep.version = version;
      sub.depsTail = nextDep;
      return;
    }
    const prevSub = dep.subsTail;
    if (
      prevSub !== undefined &&
      prevSub.version === version &&
      prevSub.sub === sub
    ) {
      return;
    }
    const newLink =
      (sub.depsTail =
      dep.subsTail =
        {
          version,
          dep,
          sub,
          prevDep,
          nextDep,
          prevSub,
          nextSub: undefined,
        });
    if (nextDep !== undefined) {
      nextDep.prevDep = newLink;
    }
    if (prevDep !== undefined) {
      prevDep.nextDep = newLink;
    } else {
      sub.deps = newLink;
    }
    if (prevSub !== undefined) {
      prevSub.nextSub = newLink;
    } else {
      dep.subs = newLink;
    }
  }

  /**
   * Removes a link from both the dep-chain and the sub-chain.
   *
   * If removing the link leaves the dep with **no remaining subscribers**,
   * {@link unwatched} is called on the dep so the caller can decide whether to
   * stop tracking it.
   *
   * @param link - The edge to remove.
   * @param sub  - The subscriber owning the dep-chain (defaults to `link.sub`).
   * @returns The next link in the subscriber's dep-chain, or `undefined`.
   */
  function unlink(link: Link, sub = link.sub): Link | undefined {
    const dep = link.dep;
    const prevDep = link.prevDep;
    const nextDep = link.nextDep;
    const nextSub = link.nextSub;
    const prevSub = link.prevSub;
    if (nextDep !== undefined) {
      nextDep.prevDep = prevDep;
    } else {
      sub.depsTail = prevDep;
    }
    if (prevDep !== undefined) {
      prevDep.nextDep = nextDep;
    } else {
      sub.deps = nextDep;
    }
    if (nextSub !== undefined) {
      nextSub.prevSub = prevSub;
    } else {
      dep.subsTail = prevSub;
    }
    if (prevSub !== undefined) {
      prevSub.nextSub = nextSub;
    } else if ((dep.subs = nextSub) === undefined) {
      unwatched(dep);
    }
    return nextDep;
  }

  /**
   * Performs a **deep, push-based** propagation starting from `link`.
   *
   * Traverses the subscriber graph breadth-first (using an explicit stack to
   * avoid call-stack overflows on deep graphs), marking each reachable node:
   *
   * - Watching nodes (effects) are passed to {@link notify}.
   * - Mutable nodes (computeds) are traversed further so their subscribers are
   *   also marked.
   * - Already-dirty or recursed nodes are handled conservatively to avoid
   *   duplicate notifications.
   *
   * @param link - The first subscriber link from which propagation begins.
   */
  function propagate(link: Link, innerWrite: boolean): void {
    let next = link.nextSub;
    let stack: Stack<Link | undefined> | undefined;

    top: do {
      const sub = link.sub;
      let flags = sub.flags;

      if (
        !(
          flags &
          (ReactiveFlags.RecursedCheck |
            ReactiveFlags.Recursed |
            ReactiveFlags.Dirty |
            ReactiveFlags.Pending)
        )
      ) {
        sub.flags = flags | ReactiveFlags.Pending;
        if (innerWrite) {
          sub.flags |= ReactiveFlags.Recursed;
        }
      } else if (
        !(flags & (ReactiveFlags.RecursedCheck | ReactiveFlags.Recursed))
      ) {
        flags = ReactiveFlags.None;
      } else if (!(flags & ReactiveFlags.RecursedCheck)) {
        sub.flags = (flags & ~ReactiveFlags.Recursed) | ReactiveFlags.Pending;
      } else if (
        !(flags & (ReactiveFlags.Dirty | ReactiveFlags.Pending)) &&
        isValidLink(link, sub)
      ) {
        sub.flags = flags | (ReactiveFlags.Recursed | ReactiveFlags.Pending);
        flags &= ReactiveFlags.Mutable;
      } else {
        flags = ReactiveFlags.None;
      }

      if (flags & ReactiveFlags.Watching) {
        notify(sub);
      }

      if (flags & ReactiveFlags.Mutable) {
        const subSubs = sub.subs;
        if (subSubs !== undefined) {
          const nextSub = (link = subSubs).nextSub;
          if (nextSub !== undefined) {
            stack = { value: next, prev: stack };
            next = nextSub;
          }
          continue;
        }
      }

      if ((link = next!) !== undefined) {
        next = link.nextSub;
        continue;
      }

      while (stack !== undefined) {
        link = stack.value!;
        stack = stack.prev;
        if (link !== undefined) {
          next = link.nextSub;
          continue top;
        }
      }

      break;
    } while (true);
  }

  /**
   * **Pull-based** dirty check: walks up the dep graph from `sub` to determine
   * whether any ancestor signal has actually changed.
   *
   * This is the "lazy" half of the push-pull model.  After `propagate` marks a
   * computed as `Pending`, `checkDirty` is called before the computed is read
   * to decide whether a full recompute is warranted.  It short-circuits as soon
   * as it confirms the node is dirty (or clean).
   *
   * @param link - First dep link of the node being checked.
   * @param sub  - The node whose dirtiness is in question.
   * @returns `true` if the node must recompute, `false` if it is still clean.
   */
  function checkDirty(link: Link, sub: ReactiveNode): boolean {
    let stack: Stack<Link> | undefined;
    let checkDepth = 0;
    let dirty = false;

    top: do {
      const dep = link.dep;
      const flags = dep.flags;

      if (sub.flags & ReactiveFlags.Dirty) {
        dirty = true;
      } else if (
        (flags & (ReactiveFlags.Mutable | ReactiveFlags.Dirty)) ===
        (ReactiveFlags.Mutable | ReactiveFlags.Dirty)
      ) {
        const subs = dep.subs!;
        if (update(dep)) {
          if (subs.nextSub !== undefined) {
            shallowPropagate(subs);
          }
          dirty = true;
        }
      } else if (
        (flags & (ReactiveFlags.Mutable | ReactiveFlags.Pending)) ===
        (ReactiveFlags.Mutable | ReactiveFlags.Pending)
      ) {
        stack = { value: link, prev: stack };
        link = dep.deps!;
        sub = dep;
        ++checkDepth;
        continue;
      }

      if (!dirty) {
        const nextDep = link.nextDep;
        if (nextDep !== undefined) {
          link = nextDep;
          continue;
        }
      }

      while (checkDepth--) {
        link = stack!.value;
        stack = stack!.prev;
        if (dirty) {
          const subs = sub.subs!;
          if (update(sub)) {
            if (subs.nextSub !== undefined) {
              shallowPropagate(subs);
            }
            sub = link.sub;
            continue;
          }
          dirty = false;
        } else {
          sub.flags &= ~ReactiveFlags.Pending;
        }
        sub = link.sub;
        const nextDep = link.nextDep;
        if (nextDep !== undefined) {
          link = nextDep;
          continue top;
        }
      }

      return dirty && !!sub.flags;
    } while (true);
  }

  /**
   * Marks all direct subscribers of `link` as `Dirty` (if they were only
   * `Pending`) and notifies any Watching subscribers.
   *
   * Used after a computed node is found to have changed during `checkDirty`, to
   * eagerly mark its immediate subscribers without recursing into the full graph.
   *
   * @param link - The first subscriber link of the changed computed.
   */
  function shallowPropagate(link: Link): void {
    do {
      const sub = link.sub;
      const flags = sub.flags;
      if (
        (flags & (ReactiveFlags.Pending | ReactiveFlags.Dirty)) ===
        ReactiveFlags.Pending
      ) {
        sub.flags = flags | ReactiveFlags.Dirty;
        if (
          (flags & (ReactiveFlags.Watching | ReactiveFlags.RecursedCheck)) ===
          ReactiveFlags.Watching
        ) {
          notify(sub);
        }
      }
    } while ((link = link.nextSub!) !== undefined);
  }

  /**
   * Returns `true` if `checkLink` is still present in `sub`'s current dep-chain.
   *
   * Used during propagation to verify that a link is valid for a recursed node
   * before upgrading its flags to `Recursed | Pending`.
   *
   * @internal
   */
  function isValidLink(checkLink: Link, sub: ReactiveNode): boolean {
    let link = sub.depsTail;
    while (link !== undefined) {
      if (link === checkLink) {
        return true;
      }
      link = link.prevDep;
    }
    return false;
  }
}
