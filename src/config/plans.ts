import type { SubscriptionTier } from "@/types/project";

const premiumEmailWhitelist = new Set(
  (process.env.PREMIUM_EMAIL_WHITELIST ?? "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean),
);

export const projectLimits: Record<SubscriptionTier, number> = {
  free: 10,
  premium: 20,
};

export function getSubscriptionTier(email?: string | null): SubscriptionTier {
  if (!email) {
    return "free";
  }

  return premiumEmailWhitelist.has(email.toLowerCase()) ? "premium" : "free";
}

