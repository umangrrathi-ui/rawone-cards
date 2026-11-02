// Plan limits are enforced on the server only.
// items = services + products on a card, photos = photos per product (used by the content blocks in the next phase).
export const PLANS = {
  free: { label: "Free", cards: 1, statsDays: 30, csv: false, footer: true, items: 3, photos: 1, reviewGen: false },
  pro: { label: "Pro", cards: 3, statsDays: 180, csv: true, footer: false, items: 10, photos: 3, reviewGen: false },
  top: { label: "Top", cards: 5, statsDays: 360, csv: true, footer: false, items: 25, photos: 3, reviewGen: true },
};
export const PAID = ["pro", "top"];
export const MAX_PRODUCT_PHOTO = 2 * 1024 * 1024; // 2 MB per product photo

export function planOf(user) {
  if (PAID.includes(user?.plan) && (!user.plan_until || new Date(user.plan_until) > new Date())) return user.plan;
  return "free";
}

export const limitsOf = (user) => PLANS[planOf(user)];
