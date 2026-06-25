export function StatCard({
  label,
  value,
  unit,
  hint,
  footer,
  highlight = false,
}: {
  label: string;
  value: React.ReactNode;
  unit?: string;
  hint?: string;
  footer?: React.ReactNode;
  highlight?: boolean;
}) {
  return (
    <div
      className="hl-card"
      style={{
        padding: "var(--hl-space-8)",
        display: "flex",
        flexDirection: "column",
        height: "100%",
        // emphasised card (e.g. headline protocol stat)
        ...(highlight
          ? { background: "var(--hl-yellow-light)", borderColor: "var(--hl-yellow)" }
          : null),
      }}
    >
      <div className="hl-label" style={{ marginBottom: "var(--hl-space-3)" }}>
        {label}
      </div>
      <div
        className="hl-mono"
        style={{ fontSize: 28, fontWeight: 600, lineHeight: 1.1, color: "var(--hl-navy)" }}
      >
        {value}
      </div>
      {/* unit and hint sit on their own line below the value so the unit never
          wraps onto the number; aligned consistently across all cards */}
      {unit && (
        <div style={{ fontSize: 14, color: "var(--hl-grey-text)", marginTop: 8 }}>{unit}</div>
      )}
      {hint && (
        <div style={{ fontSize: 13, color: "var(--hl-grey-text)", marginTop: 8 }}>{hint}</div>
      )}
      {/* footer anchored to the bottom so action buttons align across cards
          regardless of differing content height */}
      {footer && <div style={{ marginTop: "auto", paddingTop: "var(--hl-space-6)" }}>{footer}</div>}
    </div>
  );
}
