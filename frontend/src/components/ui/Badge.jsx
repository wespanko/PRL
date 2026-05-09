/**
 * Badge — DESIGN_BRIEF.md §2 (2px radius), caption-style typography.
 *
 * variant:
 *   "default" (neutral ink)   — generic tag
 *   "blue"                     — informational
 *   "gold"                     — emphasis (use sparingly per §4)
 *   "red"                      — risk / warning data-context
 *   "green"                    — gain / pass data-context
 */
export default function Badge({ variant = "default", className = "", children, ...props }) {
  const variantClass = variant === "default" ? "" : `pk-badge--${variant}`;
  const cls = ["pk-badge", variantClass, className].filter(Boolean).join(" ");
  return (
    <span className={cls} {...props}>
      {children}
    </span>
  );
}
