export function getConfiguredSiteUrl() {
  const url = process.env.NEXT_PUBLIC_SITE_URL?.trim();

  if (!url) {
    return null;
  }

  return url.replace(/\/+$/, "");
}

export function getBrowserSiteOrigin() {
  if (typeof window === "undefined") {
    return getConfiguredSiteUrl() ?? "";
  }

  return getConfiguredSiteUrl() ?? window.location.origin;
}

export function getPublicProjectUrl(slug: string) {
  const origin = getBrowserSiteOrigin();
  return `${origin}/${slug.replace(/^\/+/, "")}`;
}

export function getAuthCallbackUrl(next = "/dashboard") {
  const origin = getBrowserSiteOrigin();
  const callbackUrl = new URL("/auth/callback", origin);
  callbackUrl.searchParams.set("next", next);
  return callbackUrl.toString();
}
