// Loyalty tiers based on lifetime spend (non-cancelled orders). 1 point per whole currency unit spent.

export const TIERS = [
  { name: "Bronze", min: 0, color: "from-amber-700 to-amber-900", perk: "Member-only deals" },
  { name: "Silver", min: 200, color: "from-slate-400 to-slate-600", perk: "Early access to sales" },
  { name: "Gold", min: 500, color: "from-yellow-400 to-amber-600", perk: "Free express shipping" },
  { name: "Platinum", min: 1000, color: "from-indigo-500 to-fuchsia-600", perk: "Priority support & gifts" },
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
