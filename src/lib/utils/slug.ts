const slugSuffixLength = 4;

export function normalizeSlug(input: string) {
  return input
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9가-힣-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export function createSlugCandidate(input: string) {
  const normalized = normalizeSlug(input);

  if (normalized) {
    return normalized;
  }

  return `resume-${crypto.randomUUID().slice(0, slugSuffixLength)}`;
}

export function appendSlugSuffix(slug: string) {
  return `${slug}-${crypto.randomUUID().slice(0, slugSuffixLength)}`;
}

