export type User = { name: string; role: "viewer" | "editor" | "admin" };

/** Context key for the current user signal. */
export const USER = Symbol("user");

export const ROLES: User["role"][] = ["viewer", "editor", "admin"];
