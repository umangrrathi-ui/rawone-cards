// Browser-side JSON helper. Throws Error(message) with .data / .status on failure.
export async function api(path, { method = "POST", body } = {}) {
  const r = await fetch(path, {
    method,
    headers: body !== undefined ? { "content-type": "application/json" } : {},
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  let j = {};
  try {
    j = await r.json();
  } catch {
    /* empty body */
  }
  if (!r.ok) throw Object.assign(new Error(j.error || "Something went wrong. Try again."), { data: j, status: r.status });
  return j;
}
