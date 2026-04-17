const DEFAULT_GEO = "KR";

const state = {
  geo: DEFAULT_GEO,
  trends: [],
  currentTrend: "",
};

const elements = {
  geoSelect: document.querySelector("#geo-select"),
  heroEyebrow: document.querySelector("#hero-eyebrow"),
  heroMeta: document.querySelector("#hero-meta"),
  trendStatus: document.querySelector("#trend-status"),
  detailStatus: document.querySelector("#detail-status"),
  trendList: document.querySelector("#trend-list"),
  newsList: document.querySelector("#news-list"),
  refreshButton: document.querySelector("#refresh-button"),
  trendView: document.querySelector("#trend-view"),
  detailView: document.querySelector("#detail-view"),
  detailTitle: document.querySelector("#detail-title"),
  detailSubtitle: document.querySelector("#detail-subtitle"),
  backLink: document.querySelector("#back-link"),
};

function getParams() {
  return new URLSearchParams(window.location.search);
}

function setStatus(target, message, isError = false) {
  target.textContent = message;
  target.style.color = isError ? "#ff9cab" : "";
}

function formatDate(value) {
  if (!value) {
    return "";
  }

  return new Intl.DateTimeFormat("ko-KR", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function decodeHtml(value) {
  const textarea = document.createElement("textarea");
  textarea.innerHTML = value || "";
  return textarea.value;
}

function stripTags(value) {
  return decodeHtml(String(value || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim());
}

function getFallbackTrends() {
  return [
    {
      id: "fallback-1",
      title: "Google Trends 연결 대기",
      traffic: "데이터 준비 중",
      pubDate: new Date().toISOString(),
      picture: "",
      articles: [],
      source: "Fallback",
    },
  ];
}

async function fetchJson(url) {
  const response = await fetch(url, {
    headers: {
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(`Request failed: ${response.status}`);
  }

  return response.json();
}

function renderHero() {
  const updatedAt = state.trends[0]?.pubDate;
  elements.heroEyebrow.textContent = `Google Trends ${state.geo}`;
  elements.heroMeta.textContent = updatedAt
    ? `${formatDate(updatedAt)} 기준으로 많이 검색된 키워드를 불러왔습니다. 카드를 누르면 관련 뉴스 목록으로 이동합니다.`
    : "실시간 트렌드를 불러오는 중입니다.";
}

function renderTrendList() {
  if (!state.trends.length) {
    elements.trendList.innerHTML = '<div class="empty-state">표시할 트렌드가 없습니다.</div>';
    return;
  }

  elements.trendList.innerHTML = state.trends
    .map((trend, index) => {
      const summary = trend.articles?.[0]?.title || trend.traffic || "관련 기사 정보 없음";
      const detailHref = `./?geo=${encodeURIComponent(state.geo)}&trend=${encodeURIComponent(trend.title)}`;

      return `
        <article class="trend-card">
          <div class="trend-rank">#${index + 1}</div>
          <div>
            <h3>${trend.title}</h3>
            <p class="trend-summary">${summary}</p>
            <p class="trend-meta">${trend.traffic || "검색량 정보 없음"}${trend.pubDate ? ` · ${formatDate(trend.pubDate)}` : ""}</p>
          </div>
          <a class="trend-action" href="${detailHref}">상세보기</a>
        </article>
      `;
    })
    .join("");
}

function renderNewsList(items) {
  if (!items.length) {
    elements.newsList.innerHTML = '<div class="empty-state">관련 뉴스를 찾지 못했습니다.</div>';
    return;
  }

  elements.newsList.innerHTML = items
    .map((item) => {
      return `
        <article class="news-card">
          <h3>${item.title}</h3>
          <p class="news-summary">${stripTags(item.description) || "요약 정보가 없습니다."}</p>
          <p class="news-meta">${item.source || "Google News"}${item.pubDate ? ` · ${formatDate(item.pubDate)}` : ""}</p>
          <a href="${item.link}" target="_blank" rel="noreferrer">원문 보기</a>
        </article>
      `;
    })
    .join("");
}

function setView(mode) {
  const showDetail = mode === "detail";
  elements.trendView.hidden = showDetail;
  elements.detailView.hidden = !showDetail;
  elements.trendView.classList.toggle("view-active", !showDetail);
  elements.detailView.classList.toggle("view-active", showDetail);
}

async function loadTrends() {
  setStatus(elements.trendStatus, "트렌드를 불러오는 중입니다.");

  try {
    const data = await fetchJson(`/api/trends?geo=${encodeURIComponent(state.geo)}`);
    state.trends = data.items?.length ? data.items : getFallbackTrends();
    renderHero();
    renderTrendList();
    setStatus(elements.trendStatus, `${state.trends.length}개의 트렌드를 불러왔습니다.`);
  } catch (error) {
    state.trends = getFallbackTrends();
    renderHero();
    renderTrendList();
    setStatus(elements.trendStatus, "Google Trends를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.", true);
  }
}

async function loadDetail(trend) {
  state.currentTrend = trend;
  elements.detailTitle.textContent = trend;
  elements.detailSubtitle.textContent = `${state.geo} 기준 관련 뉴스`;
  elements.backLink.href = `./?geo=${encodeURIComponent(state.geo)}`;
  setView("detail");
  setStatus(elements.detailStatus, "관련 뉴스를 불러오는 중입니다.");

  try {
    const data = await fetchJson(`/api/news?geo=${encodeURIComponent(state.geo)}&q=${encodeURIComponent(trend)}`);
    renderNewsList(data.items || []);
    setStatus(elements.detailStatus, `${trend} 관련 뉴스를 ${data.items?.length || 0}건 불러왔습니다.`);
  } catch (error) {
    renderNewsList([]);
    setStatus(elements.detailStatus, "관련 뉴스를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.", true);
  }
}

async function syncViewFromLocation() {
  const params = getParams();
  const geo = params.get("geo") || DEFAULT_GEO;
  const trend = params.get("trend") || "";

  state.geo = geo.toUpperCase();
  elements.geoSelect.value = state.geo;

  await loadTrends();

  if (trend) {
    await loadDetail(trend);
    return;
  }

  setView("list");
}

function updateLocation(nextTrend = "") {
  const params = new URLSearchParams();
  params.set("geo", state.geo);

  if (nextTrend) {
    params.set("trend", nextTrend);
  }

  const nextUrl = `${window.location.pathname}?${params.toString()}`;
  window.history.pushState({}, "", nextUrl);
}

function bindEvents() {
  elements.geoSelect.addEventListener("change", async (event) => {
    state.geo = event.target.value;
    updateLocation("");
    await syncViewFromLocation();
  });

  elements.refreshButton.addEventListener("click", async () => {
    await syncViewFromLocation();
  });

  window.addEventListener("popstate", async () => {
    await syncViewFromLocation();
  });

  document.addEventListener("click", async (event) => {
    const trendLink = event.target.closest(".trend-action");

    if (!trendLink) {
      return;
    }

    event.preventDefault();
    const href = new URL(trendLink.href);
    const trend = href.searchParams.get("trend") || "";
    updateLocation(trend);
    await loadDetail(trend);
  });
}

async function init() {
  bindEvents();
  await syncViewFromLocation();
}

init();
