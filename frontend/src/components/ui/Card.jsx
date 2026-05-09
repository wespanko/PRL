import { forwardRef } from "react";

/**
 * Card — DESIGN_BRIEF.md §3
 *
 * White surface, 1px ink-200 border, 24px internal padding, 4px radius.
 * No drop shadow (§6).
 *
 * <Card>                       — bare card
 * <Card.Header>                — optional header row (eyebrow + title slot)
 * <Card.Eyebrow>SECTION LABEL</Card.Eyebrow>
 * <Card.Title>Concentration</Card.Title>
 */
const Card = forwardRef(function Card({ className = "", ...props }, ref) {
  const cls = ["pk-card", className].filter(Boolean).join(" ");
  return <div ref={ref} className={cls} {...props} />;
});

function Header({ className = "", ...props }) {
  const cls = ["pk-card-header", className].filter(Boolean).join(" ");
  return <div className={cls} {...props} />;
}

function Title({ className = "", as: Tag = "h2", ...props }) {
  const cls = ["pk-card-title", className].filter(Boolean).join(" ");
  return <Tag className={cls} {...props} />;
}

function Eyebrow({ className = "", ...props }) {
  const cls = ["pk-card-eyebrow", className].filter(Boolean).join(" ");
  return <div className={cls} {...props} />;
}

Card.Header = Header;
Card.Title = Title;
Card.Eyebrow = Eyebrow;

export default Card;
