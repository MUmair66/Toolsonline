// Loyalty tiers based on lifetime spend in PKR (non-cancelled orders). 1 point per rupee spent.
// Tiers are recognition only — add real perks here once the store decides to offer them.

export const TIERS = [
  { name: "Bronze", min: 0, color: "from-amber-700 to-amber-900", perk: "Welcome to Toolsonline" },
  { name: "Silver", min: 25000, color: "from-slate-400 to-slate-600", perk: "Regular customer" },
  { name: "Gold", min: 75000, color: "from-yellow-400 to-amber-600", perk: "Valued customer" },
  { name: "Platinum", min: 200000, color: "from-slate-800 to-slate-950", perk: "Top customer" },
] as const;

export function loyalty(spent: number) {
  let idx = 0;
  TIERS.forEach((t, i) => {
    if (spent >= t.min) idx = i;
  });
  const tier = TIERS[idx];
  const next = TIERS[idx + 1] ?? null;
  const progress = next ? Math.min(100, ((spent - tier.min) / (next.min - tier.min)) * 100) : 100;
  return { tier, next, progress, points: Math.floor(spent), toNext: next ? Math.max(0, next.min - spent) : 0 };
}
