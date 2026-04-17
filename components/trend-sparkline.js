import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const SERIES_COLORS = ["#22d3ee", "#f59e0b", "#34d399"];

function formatScore(value) {
  return Number(value || 0).toLocaleString("ko-KR");
}

function CustomTooltip({ active, label, payload }) {
  if (!active || !payload?.length) {
    return null;
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-slate-950/95 px-3 py-2 text-sm shadow-2xl">
      <p className="font-medium text-white">{label}</p>
      <div className="mt-2 space-y-1">
        {payload.map((entry) => (
          <p key={entry.dataKey} style={{ color: entry.color }}>
            {entry.name}: {formatScore(entry.value)}
          </p>
        ))}
      </div>
    </div>
  );
}

export default function TrendSparkline({ data, seriesKeys }) {
  if (data.length === 0 || seriesKeys.length === 0) {
    return (
      <div className="rounded-3xl border border-dashed border-white/15 bg-slate-950/50 px-4 py-8 text-center text-sm text-slate-300">
        시간 흐름 차트를 표시할 이력 데이터가 없습니다. `trendHistory`가 쌓이면 여기서 변화를 볼 수 있습니다.
      </div>
    );
  }

  return (
    <section className="rounded-[28px] border border-white/10 bg-slate-950/70 p-4 shadow-[0_20px_60px_rgba(15,23,42,0.45)] backdrop-blur sm:p-6">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-cyan-300/70">
            Trend History
          </p>
          <h3 className="mt-2 text-xl font-semibold text-white sm:text-2xl">
            시간 흐름에 따른 상위 키워드 점수 변화
          </h3>
        </div>
        <p className="max-w-sm text-sm leading-6 text-slate-300">
          최근 스냅샷 기준 상위 키워드 3개의 점수 변화를 시간축으로 보여줍니다.
        </p>
      </div>
      <div className="h-72 w-full sm:h-80">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
            <CartesianGrid stroke="rgba(148, 163, 184, 0.14)" vertical={false} />
            <XAxis
              dataKey="label"
              stroke="#94a3b8"
              tickLine={false}
              axisLine={false}
              minTickGap={24}
              tick={{ fontSize: 12 }}
            />
            <YAxis
              stroke="#94a3b8"
              tickLine={false}
              axisLine={false}
              tickFormatter={formatScore}
              width={64}
              tick={{ fontSize: 12 }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend wrapperStyle={{ paddingTop: 12 }} />
            {seriesKeys.map((seriesKey, index) => (
              <Line
                key={seriesKey}
                type="monotone"
                dataKey={seriesKey}
                name={seriesKey}
                stroke={SERIES_COLORS[index % SERIES_COLORS.length]}
                strokeWidth={3}
                dot={{ r: 3, strokeWidth: 0 }}
                activeDot={{ r: 5 }}
                connectNulls
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
