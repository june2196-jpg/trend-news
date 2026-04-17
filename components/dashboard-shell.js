"use client";

import MetricCard from "@/components/metric-card";
import TrendList from "@/components/trend-list";
import TrendSparkline from "@/components/trend-sparkline";
import { useRealtimeTrendMetrics } from "@/lib/use-realtime-trend-metrics";

function formatTime(date) {
  if (!date) {
    return "연결 대기 중";
  }

  return new Intl.DateTimeFormat("ko-KR", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function buildChartData(trends, history) {
  const seriesKeys = trends.slice(0, 3).map((trend) => trend.keyword);
  const grouped = new Map();

  for (const item of history) {
    if (!seriesKeys.includes(item.keyword) || !item.scheduledFor) {
      continue;
    }

    const key = item.scheduledFor.toISOString();

    if (!grouped.has(key)) {
      grouped.set(key, {
        label: formatTime(item.scheduledFor),
        scheduledFor: item.scheduledFor,
      });
    }

    grouped.get(key)[item.keyword] = item.score;
  }

  return {
    seriesKeys,
    data: [...grouped.values()].sort((left, right) => left.scheduledFor - right.scheduledFor),
  };
}

export default function DashboardShell() {
  const { trends, history, loading, error, lastUpdated } = useRealtimeTrendMetrics();
  const chart = buildChartData(trends, history);

  const totalScore = trends.reduce((sum, trend) => sum + (trend.score || 0), 0);
  const topKeyword = trends[0]?.keyword ?? "No live trend";
  const averageScore = trends.length
    ? Math.round(totalScore / trends.length)
    : 0;
  const historyMoments = new Set(history.map((item) => item.scheduledFor?.toISOString()).filter(Boolean))
    .size;
  const latestSource = trends[0]?.source ?? "Firestore";

  return (
    <main className="mx-auto min-h-screen w-full max-w-7xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
      <section className="overflow-hidden rounded-[32px] border border-white/10 bg-[linear-gradient(135deg,rgba(8,47,73,0.9),rgba(15,23,42,0.92),rgba(30,41,59,0.85))] p-6 shadow-[0_24px_80px_rgba(2,6,23,0.55)] sm:p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-[0.72rem] font-semibold uppercase tracking-[0.3em] text-cyan-300/80">
              Live Trend Briefing
            </p>
            <h1 className="mt-3 max-w-3xl text-4xl font-semibold tracking-tight text-white sm:text-5xl lg:text-6xl">
              Firestore trends를 카드와 시간축 차트로 바로 읽는 대시보드
            </h1>
          </div>
          <p className="max-w-xl text-sm leading-7 text-slate-200 sm:text-base">
            `trends`의 현재 순위와 `trendHistory`의 누적 이력을 함께 구독합니다.
            모바일에서는 핵심 카드가 먼저 보이고, 데스크톱에서는 차트와 랭킹이 한 화면에 정리됩니다.
          </p>
        </div>

        <div className="mt-6 flex flex-wrap items-center gap-3 text-sm text-slate-200">
          <span className="rounded-full border border-cyan-300/20 bg-cyan-400/10 px-3 py-1.5">
            상태: {loading ? "동기화 중" : "실시간 연결됨"}
          </span>
          <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5">
            마지막 반영 {formatTime(lastUpdated)}
          </span>
          <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5">
            데이터 소스 {latestSource}
          </span>
        </div>
      </section>

      <section className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="현재 선두 키워드"
          value={topKeyword}
          hint="현재 `trends` 컬렉션 기준 1위"
        />
        <MetricCard
          label="집계 점수"
          value={totalScore.toLocaleString("ko-KR")}
          hint="현재 상위 5개 키워드 score 합계"
        />
        <MetricCard
          label="기록 시점 수"
          value={`${historyMoments}개`}
          hint="라인 차트에 반영된 최근 스냅샷 수"
        />
        <MetricCard
          label="평균 지표 강도"
          value={averageScore.toLocaleString("ko-KR")}
          hint="항목당 평균 score"
        />
      </section>

      {error ? (
        <div className="mt-5 rounded-3xl border border-rose-400/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
          Firestore 구독 중 오류가 발생했습니다. 환경 변수와 보안 규칙을 확인하세요.
        </div>
      ) : null}

      <section className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1.45fr)_minmax(320px,0.92fr)]">
        <div className="space-y-5">
          <TrendSparkline data={chart.data} seriesKeys={chart.seriesKeys} />

          <section className="rounded-[28px] border border-white/10 bg-slate-950/70 p-4 shadow-[0_20px_60px_rgba(15,23,42,0.45)] backdrop-blur sm:p-6">
            <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-cyan-300/70">
                  Live Ranking
                </p>
                <h2 className="mt-2 text-2xl font-semibold text-white">현재 트렌드 랭킹</h2>
                <p className="mt-1 text-sm leading-6 text-slate-300">
                  `trends` 컬렉션을 rank 오름차순으로 구독해 최신 상위 5개를 보여줍니다.
                </p>
              </div>
            </div>
            <TrendList trends={trends} loading={loading} />
          </section>
        </div>

        <aside className="space-y-5">
          <section className="rounded-[28px] border border-white/10 bg-slate-950/70 p-5 shadow-[0_20px_60px_rgba(15,23,42,0.45)] backdrop-blur sm:p-6">
            <div>
              <p className="text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-cyan-300/70">
                Data Flow
              </p>
              <h2 className="mt-2 text-2xl font-semibold text-white">연동 방식</h2>
            </div>
            <div className="mt-5 space-y-4 text-sm leading-7 text-slate-300">
              <article className="rounded-3xl border border-white/10 bg-white/[0.03] p-4">
                <h3 className="font-semibold text-white">현재 상태용 컬렉션</h3>
                <p className="mt-2">
                  <code className="rounded bg-white/10 px-1.5 py-0.5 text-xs">trends/top-1 ~ top-5</code>
                  문서에 현재 랭킹, 점수, source, scheduledFor를 유지합니다.
                </p>
              </article>
              <article className="rounded-3xl border border-white/10 bg-white/[0.03] p-4">
                <h3 className="font-semibold text-white">차트용 이력 컬렉션</h3>
                <p className="mt-2">
                  스케줄러가 같은 시점 데이터를{" "}
                  <code className="rounded bg-white/10 px-1.5 py-0.5 text-xs">trendHistory</code>
                  에도 함께 저장해서 시간축 차트가 이전 변화를 복원할 수 있게 했습니다.
                </p>
              </article>
              <article className="rounded-3xl border border-white/10 bg-white/[0.03] p-4">
                <h3 className="font-semibold text-white">모바일 우선 레이아웃</h3>
                <p className="mt-2">
                  핵심 지표 카드, 차트, 랭킹 리스트 순서로 쌓이도록 구성해서 작은 화면에서도 한눈에 흐름을 파악할 수 있습니다.
                </p>
              </article>
            </div>
          </section>

          <section className="rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(14,165,233,0.14),rgba(15,23,42,0.78))] p-5 shadow-[0_20px_60px_rgba(15,23,42,0.45)] backdrop-blur sm:p-6">
            <p className="text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-cyan-300/80">
              Snapshot
            </p>
            <h2 className="mt-2 text-2xl font-semibold text-white">지금 보이는 신호</h2>
            <div className="mt-5 space-y-3 text-sm text-slate-100">
              <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-black/10 px-4 py-3">
                <span>최근 시각</span>
                <strong>{formatTime(lastUpdated)}</strong>
              </div>
              <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-black/10 px-4 py-3">
                <span>차트 라인 수</span>
                <strong>{chart.seriesKeys.length}개</strong>
              </div>
              <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-black/10 px-4 py-3">
                <span>현재 최고 score</span>
                <strong>{(trends[0]?.score ?? 0).toLocaleString("ko-KR")}</strong>
              </div>
            </div>
          </section>
        </aside>
      </section>
    </main>
  );
}
