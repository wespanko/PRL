import { forwardRef } from "react";

/**
 * Input — DESIGN_BRIEF.md §2 (2px radius for inputs/buttons/badges).
 *
 * <Input mono /> — apply IBM Plex Mono for numeric / ticker inputs (§6:
 * "every numeral in mono"). Use this for ticker, weight, $, %, ratio fields.
 */
export const Input = forwardRef(function Input(
  { mono = false, className = "", type = "text", ...props },
  ref,
) {
  const cls = ["pk-input", mono && "pk-input--mono", className]
    .filter(Boolean)
    .join(" ");
  return <input ref={ref} type={type} className={cls} {...props} />;
});

/**
 * Textarea — DESIGN_BRIEF.md §7 (Build → Custom Thesis):
 * ink-50 bg, ink-200 border, 4px radius, body-lg font.
 * "Feel like a serious input."
 */
export const Textarea = forwardRef(function Textarea(
  { className = "", ...props },
  ref,
) {
  const cls = ["pk-input", "pk-input--textarea", className]
    .filter(Boolean)
    .join(" ");
  return <textarea ref={ref} className={cls} {...props} />;
});

/**
 * Field — labeled wrapper for an input / textarea / select.
 *
 * <Field label="Ticker" help="e.g. AAPL"><Input mono /></Field>
 */
export function Field({ label, help, htmlFor, className = "", children }) {
  const cls = ["pk-field", className].filter(Boolean).join(" ");
  return (
    <div className={cls}>
      {label && (
        <label className="pk-field-label" htmlFor={htmlFor}>
          {label}
        </label>
      )}
      {children}
      {help && <span className="pk-field-help">{help}</span>}
    </div>
  );
}

export default Input;
