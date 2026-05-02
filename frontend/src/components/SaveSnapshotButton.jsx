import { useState, useRef } from "react";
import { saveSnapshot } from "../utils/snapshots";

export default function SaveSnapshotButton({ payload, results }) {
  const [state, setState] = useState("idle"); // idle | naming | saved
  const [name, setName] = useState("");
  const inputRef = useRef(null);

  function openNaming() {
    setState("naming");
    setTimeout(() => inputRef.current?.focus(), 0);
  }

  function commit() {
    saveSnapshot(payload, results, name.trim() || null);
    setName("");
    setState("saved");
    setTimeout(() => setState("idle"), 3000);
  }

  function cancel() {
    setName("");
    setState("idle");
  }

  if (state === "saved") {
    return <span className="snapshot-saved-badge">✓ Saved to Monitor</span>;
  }

  if (state === "naming") {
    return (
      <div className="snapshot-name-row">
        <input
          ref={inputRef}
          className="snapshot-name-input"
          placeholder="Label (optional)"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") commit(); if (e.key === "Escape") cancel(); }}
        />
        <button className="btn btn-primary btn-sm" onClick={commit}>Save</button>
        <button className="btn btn-secondary btn-sm" onClick={cancel}>Cancel</button>
      </div>
    );
  }

  return (
    <button className="btn btn-secondary btn-sm" onClick={openNaming}>
      Save Snapshot
    </button>
  );
}
