export default function MetricCard({ label, value, hint }) {
  return (
    <article className="rounded-3xl border border-white/10 bg-slate-950/70 p-5 shadow-[0_20px_60px_rgba(15,23,42,0.45)] backdrop-blur">
      <p className="text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-cyan-300/70">
        {label}
      </p>
      <h2 className="mt-3 text-2xl font-semibold tracking-tight text-white sm:text-3xl">
        {value}
      </h2>
      <p className="mt-2 text-sm leading-6 text-slate-300">{hint}</p>
    </article>
  );
}
