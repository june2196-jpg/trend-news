const DEFAULT_GEO = "KR";
const SUPPORTED_GEOS = ["KR", "US", "JP"];

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function decodeXml(value) {
  return String(value || "")
    .replace(/<!\[CDATA\[(.*?)\]\]>/gs, "$1")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function stripTags(value) {
  return decodeXml(value).replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function getFirstMatch(block, patterns) {
  for (const pattern of patterns) {
    const match = block.match(pattern);

    if (match?.[1]) {
      return match[1];
    }
  }

  return "";
}

function extractItems(xml) {
  return [...xml.matchAll(/<item\b[\s\S]*?<\/item>/g)].map((match) => match[0]);
}

function slugify(value) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function formatDate(value, locale = "ko-KR") {
  if (!value) {
    return "";
  }

  try {
    return new Intl.DateTimeFormat(locale, {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(value));
  } catch {
    return value;
  }
}

function getLocale(geo) {
  if (geo === "US") {
    return "en-US";
  }

  if (geo === "JP") {
    return "ja-JP";
  }

  return "ko-KR";
}

function getNewsConfig(geo) {
  if (geo === "US") {
    return { hl: "en-US", gl: "US", ceid: "US:en", locale: "en-US" };
  }

  if (geo === "JP") {
    return { hl: "ja", gl: "JP", ceid: "JP:ja", locale: "ja-JP" };
  }

  return { hl: "ko", gl: "KR", ceid: "KR:ko", locale: "ko-KR" };
}

function parseTrendItem(block, index) {
  const title = stripTags(getFirstMatch(block, [/<title>([\s\S]*?)<\/title>/i]));
  const traffic = stripTags(
    getFirstMatch(block, [
      /<ht:approx_traffic>([\s\S]*?)<\/ht:approx_traffic>/i,
      /<approx_traffic>([\s\S]*?)<\/approx_traffic>/i,
    ])
  );
  const pubDate = stripTags(getFirstMatch(block, [/<pubDate>([\s\S]*?)<\/pubDate>/i]));
  const picture = stripTags(getFirstMatch(block, [/<ht:picture>([\s\S]*?)<\/ht:picture>/i]));
  const articles = [...block.matchAll(/<ht:news_item\b[\s\S]*?<\/ht:news_item>/g)].map((entry) => {
    const itemBlock = entry[0];
    return {
      title: stripTags(getFirstMatch(itemBlock, [/<ht:news_item_title>([\s\S]*?)<\/ht:news_item_title>/i])),
      source: stripTags(getFirstMatch(itemBlock, [/<ht:news_item_source>([\s\S]*?)<\/ht:news_item_source>/i])),
      link: stripTags(getFirstMatch(itemBlock, [/<ht:news_item_url>([\s\S]*?)<\/ht:news_item_url>/i])),
    };
  });

  return {
    id: `trend-${index + 1}`,
    slug: slugify(title || `trend-${index + 1}`),
    title,
    traffic,
    pubDate,
    picture,
    articles,
    source: "Google Trends",
  };
}

function parseNewsItem(block) {
  return {
    title: stripTags(getFirstMatch(block, [/<title>([\s\S]*?)<\/title>/i])),
    link: stripTags(getFirstMatch(block, [/<link>([\s\S]*?)<\/link>/i])),
    pubDate: stripTags(getFirstMatch(block, [/<pubDate>([\s\S]*?)<\/pubDate>/i])),
    source: stripTags(getFirstMatch(block, [/<source[^>]*>([\s\S]*?)<\/source>/i])),
    description: decodeXml(getFirstMatch(block, [/<description>([\s\S]*?)<\/description>/i])),
  };
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "public, max-age=300",
    },
  });
}

function html(body, status = 200) {
  return new Response(body, {
    status,
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "public, max-age=300",
    },
  });
}

function xml(body) {
  return new Response(body, {
    headers: {
      "content-type": "application/xml; charset=utf-8",
      "cache-control": "public, max-age=300",
    },
  });
}

function text(body) {
  return new Response(body, {
    headers: {
      "content-type": "text/plain; charset=utf-8",
      "cache-control": "public, max-age=300",
    },
  });
}

async function fetchTrends(geo) {
  const feedUrl = `https://trends.google.com/trending/rss?geo=${encodeURIComponent(geo)}`;
  const response = await fetch(feedUrl, {
    headers: {
      "user-agent": "Mozilla/5.0",
      accept: "application/rss+xml, application/xml;q=0.9, text/xml;q=0.8",
    },
  });

  if (!response.ok) {
    throw new Error("Failed to fetch Google Trends");
  }

  const xmlBody = await response.text();

  return extractItems(xmlBody)
    .map(parseTrendItem)
    .filter((item) => item.title);
}

async function fetchNews(geo, query) {
  const config = getNewsConfig(geo);
  const feedUrl = `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=${encodeURIComponent(config.hl)}&gl=${encodeURIComponent(config.gl)}&ceid=${encodeURIComponent(config.ceid)}`;
  const response = await fetch(feedUrl, {
    headers: {
      "user-agent": "Mozilla/5.0",
      accept: "application/rss+xml, application/xml;q=0.9, text/xml;q=0.8",
    },
  });

  if (!response.ok) {
    throw new Error("Failed to fetch Google News");
  }

  const xmlBody = await response.text();

  return extractItems(xmlBody)
    .map(parseNewsItem)
    .filter((item) => item.title && item.link)
    .slice(0, 12);
}

function buildTrendSummary(trend) {
  const leadArticle = trend.articles?.[0]?.title;
  const traffic = trend.traffic || "검색량 급증";

  if (leadArticle) {
    return `${trend.title} 키워드는 ${traffic} 상태이며, 현재 주목받는 이슈는 ${leadArticle} 입니다.`;
  }

  return `${trend.title} 키워드는 ${traffic} 흐름을 보이며 Google Trends 상위권에 올라와 있습니다.`;
}

function buildDetailSummary(trend, newsItems) {
  const first = newsItems[0]?.title || "";
  const second = newsItems[1]?.title || "";

  return `${trend.title} 관련 뉴스 흐름을 정리한 페이지입니다.${first ? ` 주요 기사로는 ${first}` : ""}${second ? `, ${second}` : ""}${first || second ? " 등이 확인됩니다." : ""}`;
}

function buildLayout({ title, description, canonical, content, structuredData, image }) {
  const safeTitle = escapeHtml(title);
  const safeDescription = escapeHtml(description);
  const safeCanonical = escapeHtml(canonical);
  const safeImage = escapeHtml(image || `${new URL(canonical).origin}/og-default.jpg`);
  const jsonLd = structuredData ? `<script type="application/ld+json">${JSON.stringify(structuredData)}</script>` : "";

  return `<!doctype html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${safeTitle}</title>
  <meta name="description" content="${safeDescription}">
  <meta name="robots" content="index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1">
  <link rel="canonical" href="${safeCanonical}">
  <meta property="og:type" content="website">
  <meta property="og:title" content="${safeTitle}">
  <meta property="og:description" content="${safeDescription}">
  <meta property="og:url" content="${safeCanonical}">
  <meta property="og:image" content="${safeImage}">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${safeTitle}">
  <meta name="twitter:description" content="${safeDescription}">
  <meta name="google-adsense-account" content="ca-pub-4898037749323009">
  <meta name="google-adsense-platform" content="cloudflare-worker">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Manrope:wght@500;600;700;800&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="/style.css">
  <script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-4898037749323009" crossorigin="anonymous"></script>
  ${jsonLd}
</head>
<body>
  <div class="page-shell">
    ${content}
  </div>
</body>
</html>`;
}

function renderGeoNav(currentGeo, basePath = "/") {
  return `<nav class="geo-nav" aria-label="지역 선택">
    ${SUPPORTED_GEOS.map((geo) => {
      const href = `${basePath}${basePath.includes("?") ? "&" : "?"}geo=${geo}`;
      const className = geo === currentGeo ? "geo-link geo-link-active" : "geo-link";
      return `<a class="${className}" href="${href}">${geo}</a>`;
    }).join("")}
  </nav>`;
}

function renderHeader(currentGeo, title, description) {
  return `<header class="topbar">
      <a class="brand" href="/?geo=${currentGeo}">Trend News</a>
      ${renderGeoNav(currentGeo)}
    </header>
    <section class="hero">
      <p class="eyebrow">Google Trends ${currentGeo}</p>
      <h1>${escapeHtml(title)}</h1>
      <p class="hero-meta">${escapeHtml(description)}</p>
    </section>`;
}

function renderTrendCard(trend, geo, locale) {
  const href = `/trend/${trend.slug}?geo=${geo}`;
  const summary = buildTrendSummary(trend);
  const relatedLinks = (trend.articles || [])
    .slice(0, 2)
    .map((article) => {
      if (!article.link) {
        return "";
      }

      return `<a class="mini-link" href="${escapeHtml(article.link)}" target="_blank" rel="noreferrer">${escapeHtml(article.title)}</a>`;
    })
    .join("");

  return `<article class="trend-card">
    <div class="trend-rank">#${escapeHtml(trend.id.replace("trend-", ""))}</div>
    <div>
      <h2 class="trend-card-title"><a href="${escapeHtml(href)}">${escapeHtml(trend.title)}</a></h2>
      <p class="trend-summary">${escapeHtml(summary)}</p>
      <p class="trend-meta">${escapeHtml(trend.traffic || "검색량 정보 없음")}${trend.pubDate ? ` · ${escapeHtml(formatDate(trend.pubDate, locale))}` : ""}</p>
      <div class="mini-link-list">${relatedLinks}</div>
    </div>
    <a class="trend-action" href="${escapeHtml(href)}">상세 뉴스 보기</a>
  </article>`;
}

function renderHomePage(origin, geo, trends) {
  const locale = getLocale(geo);
  const title = `${geo} Google Trends 실시간 키워드와 관련 뉴스`;
  const description = `${geo} 기준 Google Trends 인기 검색어와 관련 뉴스 링크를 한 페이지에서 빠르게 확인할 수 있습니다.`;
  const canonical = `${origin}/?geo=${geo}`;
  const itemList = trends.map((trend, index) => ({
    "@type": "ListItem",
    position: index + 1,
    url: `${origin}/trend/${trend.slug}?geo=${geo}`,
    name: trend.title,
  }));

  const content = `<main class="app-shell">
      ${renderHeader(geo, "지금 많이 검색되는 키워드", `${formatDate(trends[0]?.pubDate, locale)} 기준으로 수집된 Google Trends 키워드입니다.`)}
      <section class="view">
        <div class="section-head">
          <h2>실시간 트렌드 목록</h2>
          <a class="ghost-button" href="/?geo=${geo}">새로고침</a>
        </div>
        <div class="status-banner">${escapeHtml(`${trends.length}개의 키워드를 확인했습니다.`)}</div>
        <div class="trend-grid">
          ${trends.map((trend) => renderTrendCard(trend, geo, locale)).join("")}
        </div>
      </section>
    </main>`;

  return buildLayout({
    title,
    description,
    canonical,
    content,
    image: trends[0]?.picture,
    structuredData: {
      "@context": "https://schema.org",
      "@type": "CollectionPage",
      name: title,
      description,
      url: canonical,
      mainEntity: {
        "@type": "ItemList",
        itemListElement: itemList,
      },
    },
  });
}

function renderNewsCard(item, locale) {
  return `<article class="news-card">
    <h3>${escapeHtml(item.title)}</h3>
    <p class="news-summary">${escapeHtml(stripTags(item.description) || "관련 기사 요약이 제공되지 않았습니다.")}</p>
    <p class="news-meta">${escapeHtml(item.source || "Google News")}${item.pubDate ? ` · ${escapeHtml(formatDate(item.pubDate, locale))}` : ""}</p>
    <a href="${escapeHtml(item.link)}" target="_blank" rel="noreferrer">원문 보기</a>
  </article>`;
}

function renderDetailPage(origin, geo, trend, newsItems) {
  const locale = getLocale(geo);
  const title = `${trend.title} 관련 뉴스 모음 | Trend News`;
  const description = buildDetailSummary(trend, newsItems);
  const canonical = `${origin}/trend/${trend.slug}?geo=${geo}`;

  const content = `<main class="app-shell">
      ${renderHeader(geo, trend.title, description)}
      <section class="view">
        <div class="detail-header">
          <a class="back-link" href="/?geo=${geo}">목록으로</a>
          <div>
            <p class="eyebrow">Related News</p>
            <h2>${escapeHtml(trend.title)}</h2>
            <p class="detail-subtitle">${escapeHtml(trend.traffic || "검색량 정보 없음")}${trend.pubDate ? ` · ${escapeHtml(formatDate(trend.pubDate, locale))}` : ""}</p>
          </div>
        </div>
        <div class="status-banner">${escapeHtml(`${newsItems.length}개의 관련 기사를 정리했습니다.`)}</div>
        <div class="editor-note">
          <p>${escapeHtml(description)}</p>
        </div>
        <div class="news-list">
          ${newsItems.map((item) => renderNewsCard(item, locale)).join("")}
        </div>
      </section>
    </main>`;

  return buildLayout({
    title,
    description,
    canonical,
    content,
    image: trend.picture,
    structuredData: {
      "@context": "https://schema.org",
      "@type": "WebPage",
      name: title,
      description,
      url: canonical,
      about: {
        "@type": "Thing",
        name: trend.title,
      },
      mainEntity: {
        "@type": "ItemList",
        itemListElement: newsItems.map((item, index) => ({
          "@type": "ListItem",
          position: index + 1,
          url: item.link,
          name: item.title,
        })),
      },
    },
  });
}

function renderNotFound(origin, geo) {
  return buildLayout({
    title: "페이지를 찾을 수 없습니다 | Trend News",
    description: "요청한 트렌드 페이지를 찾을 수 없습니다.",
    canonical: `${origin}/?geo=${geo}`,
    content: `<main class="app-shell">
      ${renderHeader(geo, "페이지를 찾을 수 없습니다", "현재 제공 중인 트렌드 목록으로 이동해 다시 선택해 주세요.")}
      <section class="view">
        <div class="empty-state">요청한 트렌드가 현재 목록에 없습니다. <a class="inline-link" href="/?geo=${geo}">메인 목록으로 이동</a></div>
      </section>
    </main>`,
  });
}

async function handleApiTrends(request) {
  const url = new URL(request.url);
  const geo = SUPPORTED_GEOS.includes((url.searchParams.get("geo") || DEFAULT_GEO).toUpperCase())
    ? (url.searchParams.get("geo") || DEFAULT_GEO).toUpperCase()
    : DEFAULT_GEO;
  const items = await fetchTrends(geo);
  return json({ geo, items });
}

async function handleApiNews(request) {
  const url = new URL(request.url);
  const geo = SUPPORTED_GEOS.includes((url.searchParams.get("geo") || DEFAULT_GEO).toUpperCase())
    ? (url.searchParams.get("geo") || DEFAULT_GEO).toUpperCase()
    : DEFAULT_GEO;
  const query = (url.searchParams.get("q") || "").trim();

  if (!query) {
    return json({ error: "Missing query" }, 400);
  }

  const items = await fetchNews(geo, query);
  return json({ geo, query, items });
}

async function handleHomePage(request) {
  const url = new URL(request.url);
  const geo = SUPPORTED_GEOS.includes((url.searchParams.get("geo") || DEFAULT_GEO).toUpperCase())
    ? (url.searchParams.get("geo") || DEFAULT_GEO).toUpperCase()
    : DEFAULT_GEO;
  const trends = await fetchTrends(geo);
  return html(renderHomePage(url.origin, geo, trends));
}

async function handleTrendPage(request) {
  const url = new URL(request.url);
  const geo = SUPPORTED_GEOS.includes((url.searchParams.get("geo") || DEFAULT_GEO).toUpperCase())
    ? (url.searchParams.get("geo") || DEFAULT_GEO).toUpperCase()
    : DEFAULT_GEO;
  const slug = url.pathname.split("/").filter(Boolean).at(-1) || "";
  const trends = await fetchTrends(geo);
  const trend = trends.find((item) => item.slug === slug);

  if (!trend) {
    return html(renderNotFound(url.origin, geo), 404);
  }

  const newsItems = await fetchNews(geo, trend.title);
  return html(renderDetailPage(url.origin, geo, trend, newsItems));
}

async function handleSitemap(request) {
  const url = new URL(request.url);
  const pages = [];

  for (const geo of SUPPORTED_GEOS) {
    pages.push(`${url.origin}/?geo=${geo}`);

    try {
      const trends = await fetchTrends(geo);
      trends.slice(0, 10).forEach((trend) => {
        pages.push(`${url.origin}/trend/${trend.slug}?geo=${geo}`);
      });
    } catch {
      continue;
    }
  }

  const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${pages
  .map((page) => {
    return `<url><loc>${escapeHtml(page)}</loc></url>`;
  })
  .join("")}
</urlset>`;

  return xml(body);
}

function handleRobots(request) {
  const origin = new URL(request.url).origin;
  return text(`User-agent: *\nAllow: /\nSitemap: ${origin}/sitemap.xml\n`);
}

function handleAdsTxt() {
  return text("google.com, pub-4898037749323009, DIRECT, f08c47fec0942fa0\n");
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    try {
      if (url.pathname === "/api/trends") {
        return await handleApiTrends(request);
      }

      if (url.pathname === "/api/news") {
        return await handleApiNews(request);
      }

      if (url.pathname === "/robots.txt") {
        return handleRobots(request);
      }

      if (url.pathname === "/sitemap.xml") {
        return await handleSitemap(request);
      }

      if (url.pathname === "/ads.txt") {
        return handleAdsTxt();
      }

      if (url.pathname === "/" || url.pathname === "/index.html") {
        return await handleHomePage(request);
      }

      if (url.pathname.startsWith("/trend/")) {
        return await handleTrendPage(request);
      }

      return env.ASSETS.fetch(request);
    } catch (error) {
      return html(
        buildLayout({
          title: "Trend News",
          description: "트렌드 페이지를 불러오는 중 오류가 발생했습니다.",
          canonical: new URL(request.url).origin,
          content: `<main class="app-shell">
            <section class="view">
              <div class="empty-state">페이지를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.</div>
            </section>
          </main>`,
        }),
        500
      );
    }
  },
};
