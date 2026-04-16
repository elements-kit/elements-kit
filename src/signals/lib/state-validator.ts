import { type Computed, effect, signal } from "../index.ts";

type StateValidatorResult<E> = {
  errors: Computed<E | null>;
  isValid: Computed<boolean>;
};

/**
 * Runs `validator` reactively against a getter's value and exposes the result
 * as `errors` and `isValid` computeds.
 *
 * Return `null` from `validator` to indicate no error.
 */
export function createStateValidator<T, E>(
  getter: () => T,
  validator: (value: T) => E | null,
): StateValidatorResult<E> {
  const errors = signal<E | null>(null);

  effect(() => {
    errors(validator(getter()));
  });

  const isValid = () => errors() === null;

  return {
    errors: errors as Computed<E | null>,
    isValid: isValid as Computed<boolean>,
  };
}
