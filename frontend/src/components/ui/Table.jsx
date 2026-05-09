/**
 * Table — DESIGN_BRIEF.md §3 + §5
 *
 * Zero radius, hairlines, ink-50 alternating rows, mono right-aligned
 * numerics, caption-style headers. The inner thead/tbody/tr/th/td use
 * their native HTML; primitives.css styles them via the .pk-table class.
 *
 * Numeric cells must add the className "pk-num":
 *   <td className="pk-num">{pct(0.42)}</td>
 *
 * Flagged rows:
 *   <tr className="pk-flag-hidden">  — gold left border (Hidden Risk)
 *   <tr className="pk-flag-warning"> — red left border (Warning)
 */
export default function Table({ className = "", children, ...props }) {
  const cls = ["pk-table", className].filter(Boolean).join(" ");
  return (
    <div className="pk-table-wrap">
      <table className={cls} {...props}>
        {children}
      </table>
    </div>
  );
}
