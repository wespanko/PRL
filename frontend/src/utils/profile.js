const KEY = "panko_profile";

export function loadProfile() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const p = JSON.parse(raw);
    if (!p || typeof p !== "object" || !p.name) return null;
    return p;
  } catch {
    return null;
  }
}

export function saveProfile({ name, email, riskTolerance }) {
  const cleaned = {
    name: String(name || "").trim().slice(0, 60),
    email: String(email || "").trim().slice(0, 120),
    riskTolerance: ["conservative", "balanced", "aggressive"].includes(riskTolerance)
      ? riskTolerance
      : "balanced",
    createdAt: new Date().toISOString(),
  };
  localStorage.setItem(KEY, JSON.stringify(cleaned));
  return cleaned;
}

export function clearProfile() {
  localStorage.removeItem(KEY);
}

export function profileInitials(name) {
  if (!name) return "?";
  const parts = String(name).trim().split(/\s+/);
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function profileFirstName(name) {
  if (!name) return "";
  return String(name).trim().split(/\s+/)[0];
}
