// Single source for version and provenance. Used by the page footer, the printed report
// and the copied report text, so they always agree. Bump `version` and `date` on each release.

export const APP = {
  name: "OMAM Aortic Root Z-Scores",
  version: "1.1",
  date: "2026-10-26",
  url: "https://parameterz.github.io/OMAM-Aortic-Root/",
  author: "Dan Dyar, MA, ACS, RDCS, FASE",
  authorUrl: "https://www.linkedin.com/in/dan-dyar-ma-acs-rdcs-ae-pe-fe-fase/",
  equations: "Yao G, et al. MedComm 2026;7(6):e70788 (CITED I). doi:10.1002/mco2.70788",
  method: "Yc = measured / expected; Z = (Yc − mean) / SD; flag against the published 95% limits of Yc",
};

/** "26 October 2026" from an ISO date, without time-zone drift. */
export function longDate(iso) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
}

/** Generation timestamp with time zone, e.g. "26 Oct 2026, 14:05 PDT". */
export const stamp = (when = new Date()) =>
  when.toLocaleString(undefined, {
    year: "numeric", month: "short", day: "numeric",
    hour: "2-digit", minute: "2-digit", timeZoneName: "short",
  });
