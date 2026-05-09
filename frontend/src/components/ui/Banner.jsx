/**
 * Banner — DESIGN_BRIEF.md §5 (Improve warning):
 *   gold-100 bg, gold-700 text, 4px-wide gold-300 left border, no radius.
 *
 * Variants:
 *   "warning" (default) — gold. Primary use per §5 (Improve page header).
 *   "info"              — blue.
 *   "error"             — red. Data context only per §4.
 *
 * Pages may pass an icon glyph via the `icon` prop. §5 requires icon
 * styling to be 1.5px outline only — pass an outline-stroke SVG, never
 * an emoji or solid sparkle.
 *
 * <Banner variant="warning" title="Hidden risk detected">
 *   Single-name concentration exceeds 40% of total risk.
 * </Banner>
 */
export default function Banner({
  variant = "warning",
  title,
  icon,
  className = "",
  children,
  ...props
}) {
  const cls = ["pk-banner", `pk-banner--${variant}`, className]
    .filter(Boolean)
    .join(" ");
  return (
    <div className={cls} role="status" {...props}>
      {icon && (
        <span className="pk-banner-icon" aria-hidden="true">
          {icon}
        </span>
      )}
      <div className="pk-banner-body">
        {title && <div className="pk-banner-title">{title}</div>}
        {children && <div className="pk-banner-text">{children}</div>}
      </div>
    </div>
  );
}
