"use client";

import { useEffect, useState } from "react";
import {
  collection,
  limit,
  onSnapshot,
  orderBy,
  query,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

function toDate(value) {
  if (!value) {
    return null;
  }

  if (typeof value.toDate === "function") {
    return value.toDate();
  }

  if (value instanceof Date) {
    return value;
  }

  if (typeof value === "string") {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  return null;
}

function formatDate(date) {
  if (!date) {
    return "";
  }

  return new Intl.DateTimeFormat("ko-KR", {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function useRealtimeTrendMetrics() {
  const [trends, setTrends] = useState([]);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);

  useEffect(() => {
    if (!db) {
      setLoading(false);
      setError(new Error("Firebase config is missing"));
      return undefined;
    }

    let hasCurrentLoaded = false;
    let hasHistoryLoaded = false;
    const finishLoading = () => {
      if (hasCurrentLoaded && hasHistoryLoaded) {
        setLoading(false);
      }
    };

    const currentTrendsQuery = query(
      collection(db, "trends"),
      orderBy("rank", "asc"),
      limit(5),
    );
    const historyQuery = query(
      collection(db, "trendHistory"),
      orderBy("scheduledFor", "desc"),
      limit(40),
    );

    const unsubscribeCurrent = onSnapshot(
      currentTrendsQuery,
      (snapshot) => {
        const nextTrends = snapshot.docs.map((doc) => {
          const data = doc.data();
          const scheduledFor = toDate(data.scheduledFor);

          return {
            id: doc.id,
            keyword: data.keyword || doc.id,
            rank: Number(data.rank || 0),
            score: Number(data.score || 0),
            traffic: data.traffic || null,
            source: data.source || "Firestore",
            scheduledFor,
            scheduledForLabel: formatDate(scheduledFor),
          };
        });

        setTrends(nextTrends);
        setLastUpdated(nextTrends[0]?.scheduledFor ?? new Date());
        setError(null);
        hasCurrentLoaded = true;
        finishLoading();
      },
      (snapshotError) => {
        setError(snapshotError);
        setLoading(false);
      },
    );

    const unsubscribeHistory = onSnapshot(
      historyQuery,
      (snapshot) => {
        const nextHistory = snapshot.docs
          .map((doc) => {
            const data = doc.data();
            const scheduledFor = toDate(data.scheduledFor);

            return {
              id: doc.id,
              keyword: data.keyword || doc.id,
              rank: Number(data.rank || 0),
              score: Number(data.score || 0),
              traffic: data.traffic || null,
              source: data.source || "Firestore",
              scheduledFor,
              scheduledForLabel: formatDate(scheduledFor),
            };
          })
          .filter((item) => item.scheduledFor)
          .reverse();

        setHistory(nextHistory);
        setError(null);
        hasHistoryLoaded = true;
        finishLoading();
      },
      (snapshotError) => {
        setError(snapshotError);
        setLoading(false);
      },
    );

    return () => {
      unsubscribeCurrent();
      unsubscribeHistory();
    };
  }, []);

  return {
    trends,
    history,
    loading,
    error,
    lastUpdated,
  };
}
