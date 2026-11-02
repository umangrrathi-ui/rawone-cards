// Plan limits are enforced on the server only.
export const PLANS = {
  free: { label: "Free", cards: 1, statsDays: 7, csv: false, footer: true },
  pro: { label: "Pro", cards: 3, statsDays: 365, csv: true, footer: false },
};

export function planOf(user) {
  if (user?.plan === "pro" && (!user.plan_until || new Date(user.plan_until) > new Date())) return "pro";
  return "free";
}

export const limitsOf = (user) => PLANS[planOf(user)];
