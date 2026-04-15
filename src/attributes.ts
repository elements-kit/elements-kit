export interface AttrChangeHandler<T> {
  (this: T, value: string | null, oldValue?: string | null): void;
}

export const ATTRIBUTES: unique symbol = Symbol("attributes");

/**
 * Dispatches an attribute change to the matching handler in the static `attributes` map,
 * walking the prototype chain for inherited handlers.
 * @example
 * ```ts
 * class MyElement extends HTMLElement {
 *   static [ATTRIBUTES]: Attributes<MyElement> = {
 *     count(value) {
 *       this.#count = Number(value);
 *     },
 *   };
 *   static observedAttributes: string[] = observedAttributes(MyElement);
 *
 *   attributeChangedCallback(name: string, oldValue: string | null, newValue: string | null) {
 *     dispatchAttrChange.call(this, name, oldValue, newValue);
 *   }
 * }
 * ```
 */
export function dispatchAttrChange<
  T extends {
    constructor: {
      [ATTRIBUTES]: Record<string, AttrChangeHandler<T>>;
    };
  },
>(this: T, name: string, oldValue: string | null, newValue: string | null) {
  let cls: any = this.constructor;
  while (cls) {
    if (cls[ATTRIBUTES] && name in cls[ATTRIBUTES]) {
      cls[ATTRIBUTES][name].call(this, newValue, oldValue);
      return;
    }
    cls = Object.getPrototypeOf(cls);
  }
}

export type Attributes<T> = Record<string, AttrChangeHandler<T>>;

/**
 * Returns a deduplicated array of all observed attribute names for a custom element class and its ancestors.
 *
 * Call after defining static `[ATTRIBUTES]`, and assign to static `observedAttributes`.
 *
 * Example:
 * ```ts
 * class MyElement extends HTMLElement {
 *   static [ATTRIBUTES]: Attributes<MyElement> = {
 *     count(value) {
 *       this.#count = Number(value);
 *     },
 *   };
 *   static observedAttributes: string[] = observedAttributes(MyElement);
 * }
 *
 * class ChildElement extends MyElement {
 *   static [ATTRIBUTES]: Attributes<ChildElement> = {
 *     bar(value) {
 *       // ...
 *     },
 *   };
 *   static observedAttributes: string[] = observedAttributes(ChildElement);
 * }
 * // ChildElement.observedAttributes will include both 'count' and 'bar', deduplicated.
 * ```
 *
 * @param cls The custom element class constructor
 * @returns Array of unique attribute names to observe
 */
export function observedAttributes(cls: { [ATTRIBUTES]?: Record<string, unknown>; observedAttributes?: string[]; prototype: unknown }) {
  const s = new Set<string>(Object.keys(cls[ATTRIBUTES] || {}));
  let _cls = Object.getPrototypeOf(cls);
  while (_cls) {
    if (_cls.observedAttributes) {
      _cls.observedAttributes.forEach((attr: string) => s.add(attr));
    }
    _cls = Object.getPrototypeOf(_cls);
  }
  return Array.from(s);
}

/**
 * A class decorator that automatically wires up `observedAttributes` and `attributeChangedCallback`
 * from a static `[ATTRIBUTES]` map.
 *
 * The `this` type inside attribute handlers is automatically inferred from the decorated class.
 *
 * @example
 * ```ts
 * @attributes
 * class MyElement extends HTMLElement {
 *   static [ATTRIBUTES] = {
 *     count(this: MyElement, value: string | null) {
 *       this.count = Number(value);
 *     },
 *   };
 * }
 * ```
 */
export type AttributeTarget<
  T extends abstract new (...args: any[]) => HTMLElement,
> = T & { [ATTRIBUTES]: Record<string, AttrChangeHandler<InstanceType<T>>> };

export type AttributeDecorated<
  T extends abstract new (...args: any[]) => HTMLElement,
> = T &
  (new (...args: any[]) => InstanceType<T> & {
    attributeChangedCallback(
      name: string,
      oldValue: string | null,
      newValue: string | null,
    ): void;
  }) & { observedAttributes: string[] };

export function attributes<
  T extends abstract new (...args: any[]) => HTMLElement,
>(
  target: AttributeTarget<T>,
  context: ClassDecoratorContext<T>,
): AttributeDecorated<T> {
  // addInitializer defers until after static field initializers run,
  // so target[ATTRIBUTES] is populated when observedAttributes reads it.
  context.addInitializer(function () {
    (target as any).observedAttributes = observedAttributes(target);
  });
  target.prototype.attributeChangedCallback = function (
    name: string,
    oldValue: string | null,
    newValue: string | null,
  ) {
    dispatchAttrChange.call(this, name, oldValue, newValue);
  };
  return target as any;
}
