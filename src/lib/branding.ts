// ─────────────────────────────────────────────────────────────
// School branding
// ─────────────────────────────────────────────────────────────
// The school's identity, surfaced on the login screen and in settings.
// Overridable via env so the same build can serve a different school.
// ─────────────────────────────────────────────────────────────

export const SCHOOL_NAME =
  process.env.NEXT_PUBLIC_SCHOOL_NAME || "Drona Valley Public School";

export const SCHOOL_LOCATION =
  process.env.NEXT_PUBLIC_SCHOOL_LOCATION || "Vishnupuri";

/** "Drona Valley Public School, Vishnupuri" */
export const SCHOOL_FULL_NAME = `${SCHOOL_NAME}, ${SCHOOL_LOCATION}`;

/** Public website, shown on the ID-card back footer. */
export const SCHOOL_WEBSITE =
  process.env.NEXT_PUBLIC_SCHOOL_WEBSITE || "vsp.eldenheights.org";
