// Horizen brand mark: a ring with a wave cut through it (the middle stroke is
// page-background colored, masking a gap in the outer ring). Matches the
// redesign mockup — intrinsic 30×30, height-constrained here.
export function Logo({ height = 30 }: { height?: number }) {
  return (
    <svg width={height} height={height} viewBox="0 0 30 30" fill="none" aria-hidden="true">
      <circle cx="15" cy="15" r="13.5" style={{ stroke: "var(--hl-navy)" }} strokeWidth={2.4} />
      <path
        d="M4 19 C 12 12, 18 12, 26 19"
        style={{ stroke: "var(--hl-grey-light)" }}
        strokeWidth={5}
        strokeLinecap="round"
      />
      <path
        d="M6.5 18.5 C 12.5 13.5, 17.5 13.5, 23.5 18.5"
        style={{ stroke: "var(--hl-navy)" }}
        strokeWidth={2.2}
        strokeLinecap="round"
      />
    </svg>
  );
}
