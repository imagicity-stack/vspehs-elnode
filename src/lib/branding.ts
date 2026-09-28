// ─────────────────────────────────────────────────────────────
// School branding
// ─────────────────────────────────────────────────────────────
// The school's identity — name, campus, marks and colours — in one place, so
// the login screen, portal chrome, ID cards, receipts and report cards all
// speak with the same voice. Overridable via env so the same build can serve
// another campus without a code change.
// ─────────────────────────────────────────────────────────────

export const SCHOOL_NAME =
  process.env.NEXT_PUBLIC_SCHOOL_NAME || "The Elden Heights School";

/** The campus this deployment serves. */
export const SCHOOL_LOCATION =
  process.env.NEXT_PUBLIC_SCHOOL_LOCATION || "Vishnupuri Campus";

/** "The Elden Heights School, Vishnupuri Campus" */
export const SCHOOL_FULL_NAME = `${SCHOOL_NAME}, ${SCHOOL_LOCATION}`;

/** Motto on the crest ribbon. */
export const SCHOOL_TAGLINE =
  process.env.NEXT_PUBLIC_SCHOOL_TAGLINE || "Towards Eternal Glory";

/** Public website, shown on the ID-card back footer and printed documents. */
export const SCHOOL_WEBSITE =
  process.env.NEXT_PUBLIC_SCHOOL_WEBSITE || "vsp.eldenheights.org";

// ── Marks ────────────────────────────────────────────────────
/** Horizontal lockup: crest beside the wordmark. Use where width allows. */
export const SCHOOL_LOGO = "/ehs-logo.png";
/** The crest alone. Use in square slots, watermarks and app icons. */
export const SCHOOL_CREST = "/ehs-crest.png";

// ── Crest palette ────────────────────────────────────────────
// Sampled from the artwork so printed documents match the badge exactly.
export const BRAND_MAROON = "#901818";
export const BRAND_GOLD = "#e4cc6c";
/** The same two, as RGB triples for jsPDF. */
export const BRAND_MAROON_RGB: [number, number, number] = [144, 24, 24];
export const BRAND_GOLD_RGB: [number, number, number] = [228, 204, 108];
