const trendDataset = {
  trends: [
    {
      id: "top-1",
      rank: 1,
      keyword: "AI 반도체 공급망",
      score: 982,
      source: "Cloudflare Static Feed",
      traffic: "검색 반응 +38%",
      scheduledFor: "2026-04-17T09:00:00Z",
    },
    {
      id: "top-2",
      rank: 2,
      keyword: "모바일 생성형 뉴스",
      score: 914,
      source: "Cloudflare Static Feed",
      traffic: "SNS 언급 +29%",
      scheduledFor: "2026-04-17T09:00:00Z",
    },
    {
      id: "top-3",
      rank: 3,
      keyword: "실시간 요약 브리핑",
      score: 876,
      source: "Cloudflare Static Feed",
      traffic: "클릭률 +22%",
      scheduledFor: "2026-04-17T09:00:00Z",
    },
    {
      id: "top-4",
      rank: 4,
      keyword: "국내 플랫폼 트렌드",
      score: 821,
      source: "Cloudflare Static Feed",
      traffic: "방문 유지 +17%",
      scheduledFor: "2026-04-17T09:00:00Z",
    },
    {
      id: "top-5",
      rank: 5,
      keyword: "퍼블리셔 자동화",
      score: 764,
      source: "Cloudflare Static Feed",
      traffic: "구독 전환 +12%",
      scheduledFor: "2026-04-17T09:00:00Z",
    },
  ],
  history: [
    { keyword: "AI 반도체 공급망", score: 720, scheduledFor: "2026-04-17T04:00:00Z" },
    { keyword: "모바일 생성형 뉴스", score: 645, scheduledFor: "2026-04-17T04:00:00Z" },
    { keyword: "실시간 요약 브리핑", score: 602, scheduledFor: "2026-04-17T04:00:00Z" },
    { keyword: "AI 반도체 공급망", score: 781, scheduledFor: "2026-04-17T05:00:00Z" },
    { keyword: "모바일 생성형 뉴스", score: 701, scheduledFor: "2026-04-17T05:00:00Z" },
    { keyword: "실시간 요약 브리핑", score: 688, scheduledFor: "2026-04-17T05:00:00Z" },
    { keyword: "AI 반도체 공급망", score: 846, scheduledFor: "2026-04-17T06:00:00Z" },
    { keyword: "모바일 생성형 뉴스", score: 759, scheduledFor: "2026-04-17T06:00:00Z" },
    { keyword: "실시간 요약 브리핑", score: 731, scheduledFor: "2026-04-17T06:00:00Z" },
    { keyword: "AI 반도체 공급망", score: 892, scheduledFor: "2026-04-17T07:00:00Z" },
    { keyword: "모바일 생성형 뉴스", score: 824, scheduledFor: "2026-04-17T07:00:00Z" },
    { keyword: "실시간 요약 브리핑", score: 768, scheduledFor: "2026-04-17T07:00:00Z" },
    { keyword: "AI 반도체 공급망", score: 945, scheduledFor: "2026-04-17T08:00:00Z" },
    { keyword: "모바일 생성형 뉴스", score: 871, scheduledFor: "2026-04-17T08:00:00Z" },
    { keyword: "실시간 요약 브리핑", score: 814, scheduledFor: "2026-04-17T08:00:00Z" },
    { keyword: "AI 반도체 공급망", score: 982, scheduledFor: "2026-04-17T09:00:00Z" },
    { keyword: "모바일 생성형 뉴스", score: 914, scheduledFor: "2026-04-17T09:00:00Z" },
    { keyword: "실시간 요약 브리핑", score: 876, scheduledFor: "2026-04-17T09:00:00Z" },
  ],
};

const seriesColors = ["#78dce8", "#ffb454", "#63e6be"];

function formatScore(value) {
  return Number(value || 0).toLocaleString("ko-KR");
}

function formatTime(value) {
  if (!value) {
    return "연결 대기 중";
  }

  return new Intl.DateTimeFormat("ko-KR", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "UTC",
  }).format(new Date(value));
}

function buildChartData(trends, history) {
  const seriesKeys = trends.slice(0, 3).map((item) => item.keyword);
  const grouped = new Map();

  history.forEach((item) => {
    if (!seriesKeys.includes(item.keyword)) {
      return;
    }

    if (!grouped.has(item.scheduledFor)) {
      grouped.set(item.scheduledFor, {
        scheduledFor: item.scheduledFor,
        label: formatTime(item.scheduledFor),
      });
    }

    grouped.get(item.scheduledFor)[item.keyword] = item.score;
  });

  return {
    seriesKeys,
    data: [...grouped.values()].sort((left, right) => {
      return new Date(left.scheduledFor) - new Date(right.scheduledFor);
    }),
  };
}

function renderHeroStatus(trends) {
  const root = document.querySelector("#hero-status");
  const lastUpdated = trends[0]?.scheduledFor;

  root.innerHTML = `
    <div class="status-pill"><strong>상태</strong> 정적 데이터 렌더링</div>
    <div class="status-pill"><strong>마지막 반영</strong> ${formatTime(lastUpdated)}</div>
    <div class="status-pill"><strong>데이터 소스</strong> ${trends[0]?.source || "Static dataset"}</div>
  `;
}

function renderMetrics(trends, history) {
  const root = document.querySelector("#metrics");
  const totalScore = trends.reduce((sum, item) => sum + item.score, 0);
  const averageScore = Math.round(totalScore / trends.length);
  const historyMoments = new Set(history.map((item) => item.scheduledFor)).size;

  const cards = [
    {
      label: "현재 선두 키워드",
      value: trends[0]?.keyword || "-",
      hint: "정적 데이터 기준 1위 키워드",
    },
    {
      label: "집계 점수",
      value: formatScore(totalScore),
      hint: "상위 5개 score 합계",
    },
    {
      label: "기록 시점 수",
      value: `${historyMoments}개`,
      hint: "차트에 반영된 스냅샷 수",
    },
    {
      label: "평균 지표 강도",
      value: formatScore(averageScore),
      hint: "항목당 평균 score",
    },
  ];

  root.innerHTML = cards
    .map((card) => {
      return `
        <article class="metric-card">
          <p class="metric-label">${card.label}</p>
          <h2 class="metric-value">${card.value}</h2>
          <p class="metric-hint">${card.hint}</p>
        </article>
      `;
    })
    .join("");
}

function renderTrendList(trends) {
  const root = document.querySelector("#trend-list");

  root.innerHTML = trends
    .map((trend) => {
      return `
        <article class="trend-item">
          <div class="rank-badge">#${trend.rank}</div>
          <div>
            <h3 class="trend-title">${trend.keyword}</h3>
            <p class="trend-meta">${trend.source} · ${formatTime(trend.scheduledFor)}</p>
            <p class="trend-traffic">${trend.traffic}</p>
          </div>
          <div class="trend-score">
            <strong>${formatScore(trend.score)}</strong>
            <span>score</span>
          </div>
        </article>
      `;
    })
    .join("");
}

function renderSnapshot(trends, chart) {
  const root = document.querySelector("#snapshot-list");
  const highest = trends[0]?.score ?? 0;
  const lastUpdated = trends[0]?.scheduledFor;

  const items = [
    ["최근 시각", formatTime(lastUpdated)],
    ["차트 라인 수", `${chart.seriesKeys.length}개`],
    ["현재 최고 score", formatScore(highest)],
  ];

  root.innerHTML = items
    .map(([label, value]) => {
      return `
        <div class="snapshot-row">
          <span>${label}</span>
          <strong>${value}</strong>
        </div>
      `;
    })
    .join("");
}

function renderLegend(seriesKeys) {
  const root = document.querySelector("#chart-legend");
  root.innerHTML = seriesKeys
    .map((key, index) => {
      return `
        <div class="legend-item">
          <span class="legend-swatch" style="background:${seriesColors[index % seriesColors.length]}"></span>
          <span>${key}</span>
        </div>
      `;
    })
    .join("");
}

function createSvgNode(tag, attributes = {}) {
  const node = document.createElementNS("http://www.w3.org/2000/svg", tag);
  Object.entries(attributes).forEach(([key, value]) => {
    node.setAttribute(key, value);
  });
  return node;
}

function renderChart(chart) {
  const svg = document.querySelector("#trend-chart");
  svg.innerHTML = "";

  if (!chart.data.length) {
    return;
  }

  const width = 760;
  const height = 320;
  const margin = { top: 24, right: 24, bottom: 44, left: 64 };
  const innerWidth = width - margin.left - margin.right;
  const innerHeight = height - margin.top - margin.bottom;

  const values = chart.data.flatMap((item) => {
    return chart.seriesKeys
      .map((key) => item[key])
      .filter((entry) => typeof entry === "number");
  });

  const maxValue = Math.max(...values);
  const minValue = Math.min(...values);
  const yMin = Math.floor(minValue * 0.9);
  const yMax = Math.ceil(maxValue * 1.05);

  const xForIndex = (index) => margin.left + (innerWidth / Math.max(chart.data.length - 1, 1)) * index;
  const yForValue = (value) => {
    const ratio = (value - yMin) / Math.max(yMax - yMin, 1);
    return margin.top + innerHeight - ratio * innerHeight;
  };

  const yTicks = 4;
  for (let tick = 0; tick <= yTicks; tick += 1) {
    const value = yMin + ((yMax - yMin) / yTicks) * tick;
    const y = yForValue(value);
    svg.appendChild(
      createSvgNode("line", {
        x1: margin.left,
        y1: y,
        x2: width - margin.right,
        y2: y,
        class: "grid-line",
      })
    );
    const label = createSvgNode("text", {
      x: 10,
      y: y + 4,
      class: "grid-line-label",
    });
    label.textContent = formatScore(Math.round(value));
    svg.appendChild(label);
  }

  svg.appendChild(
    createSvgNode("line", {
      x1: margin.left,
      y1: height - margin.bottom,
      x2: width - margin.right,
      y2: height - margin.bottom,
      class: "axis-line",
    })
  );

  chart.data.forEach((item, index) => {
    const x = xForIndex(index);
    const label = createSvgNode("text", {
      x,
      y: height - 16,
      "text-anchor": "middle",
      class: "axis-label",
    });
    label.textContent = item.label;
    svg.appendChild(label);
  });

  chart.seriesKeys.forEach((seriesKey, seriesIndex) => {
    const points = chart.data
      .map((item, index) => {
        if (typeof item[seriesKey] !== "number") {
          return null;
        }

        return `${xForIndex(index)},${yForValue(item[seriesKey])}`;
      })
      .filter(Boolean);

    if (!points.length) {
      return;
    }

    svg.appendChild(
      createSvgNode("polyline", {
        points: points.join(" "),
        stroke: seriesColors[seriesIndex % seriesColors.length],
        class: "chart-line",
      })
    );

    chart.data.forEach((item, index) => {
      if (typeof item[seriesKey] !== "number") {
        return;
      }

      svg.appendChild(
        createSvgNode("circle", {
          cx: xForIndex(index),
          cy: yForValue(item[seriesKey]),
          r: 4.5,
          fill: seriesColors[seriesIndex % seriesColors.length],
          class: "chart-dot",
        })
      );
    });
  });
}

function init() {
  const { trends, history } = trendDataset;
  const chart = buildChartData(trends, history);

  renderHeroStatus(trends);
  renderMetrics(trends, history);
  renderLegend(chart.seriesKeys);
  renderChart(chart);
  renderTrendList(trends);
  renderSnapshot(trends, chart);
}

document.addEventListener("DOMContentLoaded", init);
