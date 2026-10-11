if (!Symbol.dispose) {
  Object.defineProperty(Symbol, "dispose", { value: Symbol("dispose") });
}
declare global {
  interface SymbolConstructor {
    readonly dispose: symbol;
  }

  interface Disposable {
    [Symbol.dispose](): void;
  }
}

export {};
