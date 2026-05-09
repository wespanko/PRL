// Panko UI primitives — DESIGN_BRIEF.md §5
//
// Pages should import from this barrel:
//   import { Button, Card, Input, Textarea, Field, Table, Badge, Banner } from "../ui";
//
// Do NOT create one-off styled buttons/cards/etc. inside page files — every
// page must consume these primitives so the design stays consistent.

export { default as Button } from "./Button";
export { default as Card } from "./Card";
export { default as Table } from "./Table";
export { default as Badge } from "./Badge";
export { default as Banner } from "./Banner";
export { Input, Textarea, Field } from "./Input";
