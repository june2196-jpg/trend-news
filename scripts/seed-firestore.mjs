import { cert, getApps, initializeApp } from "firebase-admin/app";
import { FieldValue, getFirestore } from "firebase-admin/firestore";

function requireEnv(name) {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing environment variable: ${name}`);
  }

  return value;
}

function getAdminApp() {
  if (getApps().length > 0) {
    return getApps()[0];
  }

  const projectId = requireEnv("FIREBASE_ADMIN_PROJECT_ID");
  const clientEmail = requireEnv("FIREBASE_ADMIN_CLIENT_EMAIL");
  const privateKey = requireEnv("FIREBASE_ADMIN_PRIVATE_KEY").replace(/\\n/g, "\n");

  return initializeApp({
    credential: cert({
      projectId,
      clientEmail,
      privateKey,
    }),
  });
}

const sampleTrendRuns = [
  {
    scheduledFor: "2026-04-17T04:00:00.000Z",
    items: [
      { keyword: "OpenAI", rank: 1, score: 188000, traffic: "188K+", source: "Google Trends" },
      { keyword: "Tesla", rank: 2, score: 166000, traffic: "166K+", source: "Google Trends" },
      { keyword: "Bitcoin", rank: 3, score: 151000, traffic: "151K+", source: "Google Trends" },
      { keyword: "NVIDIA", rank: 4, score: 139000, traffic: "139K+", source: "Google Trends" },
      { keyword: "Next.js", rank: 5, score: 122000, traffic: "122K+", source: "Google Trends" },
    ],
  },
  {
    scheduledFor: "2026-04-17T05:00:00.000Z",
    items: [
      { keyword: "OpenAI", rank: 1, score: 203000, traffic: "203K+", source: "Google Trends" },
      { keyword: "Bitcoin", rank: 2, score: 177000, traffic: "177K+", source: "Google Trends" },
      { keyword: "Tesla", rank: 3, score: 162000, traffic: "162K+", source: "Google Trends" },
      { keyword: "NVIDIA", rank: 4, score: 149000, traffic: "149K+", source: "Google Trends" },
      { keyword: "Firebase", rank: 5, score: 128000, traffic: "128K+", source: "Google Trends" },
    ],
  },
  {
    scheduledFor: "2026-04-17T06:00:00.000Z",
    items: [
      { keyword: "OpenAI", rank: 1, score: 214000, traffic: "214K+", source: "Google Trends" },
      { keyword: "Bitcoin", rank: 2, score: 183000, traffic: "183K+", source: "Google Trends" },
      { keyword: "NVIDIA", rank: 3, score: 171000, traffic: "171K+", source: "Google Trends" },
      { keyword: "Tesla", rank: 4, score: 155000, traffic: "155K+", source: "Google Trends" },
      { keyword: "Firebase", rank: 5, score: 136000, traffic: "136K+", source: "Google Trends" },
    ],
  },
];

async function seed() {
  getAdminApp();
  const db = getFirestore();
  const batch = db.batch();

  for (const run of sampleTrendRuns) {
    for (const trend of run.items) {
      const currentRef = db.collection("trends").doc(`top-${trend.rank}`);
      const historyRef = db
        .collection("trendHistory")
        .doc(`${run.scheduledFor.replace(/[^0-9A-Za-z_-]/g, "-")}-rank-${trend.rank}`);

      batch.set(
        currentRef,
        {
          keyword: trend.keyword,
          rank: trend.rank,
          score: trend.score,
          traffic: trend.traffic,
          source: trend.source,
          scheduledFor: run.scheduledFor,
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
          scheduledFor: run.scheduledFor,
          capturedAt: FieldValue.serverTimestamp(),
        },
        { merge: true },
      );
    }
  }

  await batch.commit();
  console.log("Seeded trends and trendHistory collections.");
}

seed().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
