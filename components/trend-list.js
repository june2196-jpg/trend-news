function formatScore(score) {
  return Number(score || 0).toLocaleString("ko-KR");
}

export default function TrendList({ trends, loading }) {
  if (loading && trends.length === 0) {
    return (
      <div className="rounded-3xl border border-dashed border-white/15 bg-slate-950/50 px-4 py-8 text-center text-sm text-slate-300">
        실시간 트렌드 데이터를 불러오는 중입니다.
      </div>
    );
  }

  if (trends.length === 0) {
    return (
      <div className="rounded-3xl border border-dashed border-white/15 bg-slate-950/50 px-4 py-8 text-center text-sm text-slate-300">
        아직 표시할 데이터가 없습니다. `trends` 컬렉션을 먼저 채워주세요.
      </div>
    );
  }

  return (
    <div className="grid gap-3">
      {trends.map((trend) => {
        return (
          <article
            className="grid gap-3 rounded-3xl border border-white/10 bg-white/[0.03] p-4 shadow-[0_16px_40px_rgba(15,23,42,0.22)] sm:grid-cols-[auto_1fr_auto] sm:items-center"
            key={trend.id}
          >
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-cyan-400/10 text-sm font-bold text-cyan-300">
              #{trend.rank}
            </div>
            <div className="min-w-0">
              <h3 className="truncate text-lg font-semibold text-white">{trend.keyword}</h3>
              <p className="mt-1 text-sm text-slate-300">
                {trend.source || "Unknown source"} · {trend.scheduledForLabel || "시각 정보 없음"}
              </p>
              <p className="mt-1 text-xs uppercase tracking-[0.2em] text-slate-400">
                {trend.traffic || "Traffic unavailable"}
              </p>
            </div>
            <div className="text-left sm:text-right">
              <strong className="block text-2xl font-semibold text-white">
                {formatScore(trend.score)}
              </strong>
              <span className="text-xs uppercase tracking-[0.22em] text-slate-400">score</span>
            </div>
          </article>
        );
      })}
    </div>
  );
}
