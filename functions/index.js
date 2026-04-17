const { initializeApp, getApps } = require("firebase-admin/app");
const { FieldValue, getFirestore } = require("firebase-admin/firestore");
const logger = require("firebase-functions/logger");
const { onSchedule } = require("firebase-functions/v2/scheduler");

const STOPWORDS = new Set([
  "about",
  "after",
  "amid",
  "also",
  "and",
  "are",
  "back",
  "been",
  "before",
  "behind",
  "below",
  "between",
  "breaking",
  "could",
  "first",
  "from",
  "have",
  "into",
  "just",
  "more",
  "most",
  "over",
  "said",
  "says",
  "that",
  "their",
  "there",
  "these",
  "they",
  "this",
  "through",
  "today",
  "under",
  "very",
  "what",
  "when",
  "where",
  "which",
  "while",
  "with",
  "would",
  "your",
]);

function getAdminApp() {
  if (getApps().length === 0) {
    initializeApp();
  }

  return getApps()[0];
}

function decodeXml(value) {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function extractTag(block, tagName) {
  const match = block.match(new RegExp(`<${tagName}>([\\s\\S]*?)<\\/${tagName}>`, "i"));
  return match ? decodeXml(match[1].trim()) : null;
}

function normalizeScore(rawValue) {
  if (!rawValue) {
    return null;
  }

  const match = rawValue.replace(/,/g, "").match(/(\d+(?:\.\d+)?)\s*([KMB])?\+?/i);

  if (!match) {
    return null;
  }

  const value = Number(match[1]);
  const unit = match[2]?.toUpperCase();

  switch (unit) {
    case "K":
      return Math.round(value * 1_000);
    case "M":
      return Math.round(value * 1_000_000);
    case "B":
      return Math.round(value * 1_000_000_000);
    default:
      return Math.round(value);
  }
}

async function fetchGoogleTrendsKeywords() {
  const response = await fetch(
    "https://trends.google.com/trends/trendingsearches/daily/rss?geo=US",
    {
      headers: {
        "user-agent": "trend-news-dashboard/1.0",
      },
    },
  );

  if (!response.ok) {
    throw new Error(`Google Trends request failed with ${response.status}`);
  }

  const xml = await response.text();
  const items = [...xml.matchAll(/<item>([\s\S]*?)<\/item>/gi)]
    .map((match) => match[1])
    .map((item, index) => {
      const keyword = extractTag(item, "title");
      const traffic = extractTag(item, "ht:approx_traffic");

      if (!keyword) {
        return null;
      }

      return {
        keyword,
        rank: index + 1,
        score: normalizeScore(traffic),
        traffic,
        source: "Google Trends",
      };
    })
    .filter(Boolean)
    .slice(0, 5);

  if (items.length < 5) {
    throw new Error(`Google Trends returned only ${items.length} items`);
  }

  return items;
}

function extractCandidateKeywords(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .split(/\s+/)
    .map((token) => token.trim())
    .filter((token) => token.length >= 3)
    .filter((token) => !STOPWORDS.has(token))
    .filter((token) => !/^\d+$/.test(token));
}

async function fetchNewsApiKeywords(apiKey) {
  if (!apiKey) {
    throw new Error("NEWS_API_KEY is not configured");
  }

  const response = await fetch(
    "https://newsapi.org/v2/top-headlines?country=us&pageSize=25",
    {
      headers: {
        "X-Api-Key": apiKey,
      },
    },
  );

  if (!response.ok) {
    throw new Error(`NewsAPI request failed with ${response.status}`);
  }

  const payload = await response.json();
  const articles = Array.isArray(payload.articles) ? payload.articles : [];
  const counts = new Map();

  for (const article of articles) {
    const text = [article.title, article.description].filter(Boolean).join(" ");

    for (const token of extractCandidateKeywords(text)) {
      counts.set(token, (counts.get(token) ?? 0) + 1);
    }
  }

  const keywords = [...counts.entries()]
    .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
    .slice(0, 5)
    .map(([keyword, score], index) => ({
      keyword,
      rank: index + 1,
      score,
      traffic: null,
      source: "NewsAPI",
    }));

  if (keywords.length < 5) {
    throw new Error(`NewsAPI keyword extraction returned only ${keywords.length} items`);
  }

  return keywords;
}

async function resolveTopKeywords(newsApiKey) {
  try {
    return await fetchGoogleTrendsKeywords();
  } catch (googleError) {
    logger.warn("Google Trends fetch failed, falling back to NewsAPI.", {
      error: googleError.message,
    });
  }

  return fetchNewsApiKeywords(newsApiKey);
}

async function saveTrends(keywords, scheduledFor) {
  getAdminApp();
  const db = getFirestore();
  const batch = db.batch();
  const snapshotIdPrefix = scheduledFor.replace(/[^0-9A-Za-z_-]/g, "-");

  for (const trend of keywords) {
    const ref = db.collection("trends").doc(`top-${trend.rank}`);
    const historyRef = db
      .collection("trendHistory")
      .doc(`${snapshotIdPrefix}-rank-${trend.rank}`);

    batch.set(
      ref,
      {
        keyword: trend.keyword,
        rank: trend.rank,
        score: trend.score,
        traffic: trend.traffic,
        source: trend.source,
        scheduledFor,
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );

    batch.set(
      historyRef,
      {
        keyword: trend.keyword,
        rank: trend.rank,
        score: trend.score,
        traffic: trend.traffic,
        source: trend.source,
        scheduledFor,
        capturedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );
  }

  await batch.commit();
}

exports.syncTrendingKeywords = onSchedule(
  {
    schedule: "0 * * * *",
    timeZone: "Etc/UTC",
    region: "us-central1",
  },
  async (event) => {
    const scheduledFor = event.scheduleTime || new Date().toISOString();
    const newsApiKey = process.env.NEWS_API_KEY?.trim();
    const keywords = await resolveTopKeywords(newsApiKey);

    await saveTrends(keywords, scheduledFor);

    logger.info("Stored trending keywords.", {
      scheduledFor,
      keywords: keywords.map((keyword) => keyword.keyword),
    });
  },
);
