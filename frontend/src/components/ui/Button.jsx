import { forwardRef } from "react";

/**
 * Button — DESIGN_BRIEF.md §5
 *
 * variant:
 *   "primary"   blue-700 bg / white text — default action
 *   "secondary" white bg / ink-300 border / ink-900 text
 *   "tertiary"  link-style: blue-700 text, no bg, underline on hover
 *   "gold"      gold-500 bg / ink-900 text — RESERVED, max ONE per page (§4)
 * size:
 *   "md" (default) — 12/20 padding per §5
 *   "sm"           — compact
 *
 * Pages must use this component instead of styling raw <button> elements.
 */
const Button = forwardRef(function Button(
  { variant = "primary", size = "md", className = "", type = "button", ...props },
  ref,
) {
  const cls = ["pk-btn", `pk-btn--${variant}`, `pk-btn--${size}`, className]
    .filter(Boolean)
    .join(" ");
  return <button ref={ref} type={type} className={cls} {...props} />;
});

export default Button;
