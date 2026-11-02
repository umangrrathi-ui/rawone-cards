import { redirectFromCode } from "../../../lib/shortlink";
export const GET = (req, ctx) => redirectFromCode(req, ctx, "n");
