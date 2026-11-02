import { fail } from "./api";

// Wraps a route handler so thrown errors become safe JSON responses.
export const handle =
  (fn) =>
  async (req, ctx) => {
    try {
      return await fn(req, ctx);
    } catch (e) {
      return fail(e);
    }
  };
