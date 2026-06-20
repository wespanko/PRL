export default function Panel({ title, sub, right, children, className = "", inner = true }) {
  return (
    <section className={`border border-zinc-900 bg-zinc-950/60 rounded ${className}`}>
      {(title || right) && (
        <div className="px-4 py-2.5 border-b border-zinc-900 flex items-baseline justify-between">
          <div>
            {title && <div className="font-mono text-[11px] tracking-widest text-amber-400">{title}</div>}
            {sub && <div className="text-[11px] text-zinc-500 mt-0.5">{sub}</div>}
          </div>
          {right && <div className="text-[11px] text-zinc-500">{right}</div>}
        </div>
      )}
      <div className={inner ? "p-4" : ""}>{children}</div>
    </section>
  );
}
