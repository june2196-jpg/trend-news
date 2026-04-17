# Trend Pulse Dashboard

Next.js, Firebase Firestore, Cloudflare Workers 배포 구성을 사용해 실시간 트렌드 지표를 보여주는 대시보드입니다.

## 포함된 내용

- Next.js `app` 라우터 기반 페이지 구조
- Firebase 초기화 모듈
- Firestore `trends` 실시간 구독 로직
- Firestore `trendHistory` 이력 구독 로직
- Firebase Cloud Functions 기반 1시간 주기 트렌드 수집 스케줄러
- Recharts 기반 시간축 Line Chart
- Tailwind CSS 카드형 반응형 UI
- Firestore 샘플 데이터 시드 스크립트
- Cloudflare Workers/OpenNext 배포 설정

## 시작 방법

```bash
npm install
cp .env.local.example .env.local
npm run dev
```

`/` 경로에서 대시보드를 확인할 수 있습니다.

## Firestore 문서 예시

컬렉션: `trends`

```json
{
  "keyword": "OpenAI",
  "rank": 1,
  "score": 214000,
  "traffic": "214K+",
  "source": "Google Trends",
  "scheduledFor": "2026-04-17T06:00:00.000Z",
  "updatedAt": "Firestore Timestamp"
}
```

## 핵심 실시간 로직

`lib/use-realtime-trend-metrics.js`에서 아래 흐름으로 데이터를 구독합니다.

- `collection(db, "trends")`
- `orderBy("rank", "asc")`
- `limit(5)`
- `collection(db, "trendHistory")`
- `orderBy("scheduledFor", "desc")`
- `limit(40)`
- `onSnapshot(...)`

문서가 추가되거나 수정되면 카드와 Line Chart가 즉시 갱신됩니다.

## 샘플 데이터 넣기

`.env.local`에 아래 관리자 인증 정보를 추가한 뒤 실행합니다.

```bash
npm run seed:firestore
```

필요한 환경 변수:

- `FIREBASE_ADMIN_PROJECT_ID`
- `FIREBASE_ADMIN_CLIENT_EMAIL`
- `FIREBASE_ADMIN_PRIVATE_KEY`

이 스크립트는 `trends`와 `trendHistory` 컬렉션에 샘플 문서를 업서트합니다.

## 추가된 시각화

`components/trend-sparkline.js`가 Recharts `LineChart`를 사용해 최근 시점별 키워드 점수 변화를 렌더링합니다.

## 스케줄러 함수 배포

`functions/index.js`에는 매 정각마다 실행되는 `syncTrendingKeywords` 함수가 포함되어 있습니다.

- 1순위: Google Trends 일간 RSS에서 미국 기준 인기 검색어 5개 수집
- fallback: Google Trends 실패 시 NewsAPI `top-headlines` 데이터에서 키워드 5개 추출
- 저장 위치: Firestore `trends/top-1` ~ `trends/top-5`
- 추가 저장: 같은 시점 데이터를 `trendHistory`에도 남겨 시간축 차트를 구성

함수 의존성 설치:

```bash
cd functions
npm install
```

선택 사항: NewsAPI fallback까지 사용하려면 `functions/.env`에 키를 둡니다.

```bash
echo "NEWS_API_KEY=your_key_here" >> functions/.env
```

배포:

```bash
firebase deploy --only functions:syncTrendingKeywords
```

저장 문서 예시:

```json
{
  "keyword": "OpenAI",
  "rank": 1,
  "score": 200000,
  "traffic": "200K+",
  "source": "Google Trends",
  "scheduledFor": "2026-04-17T10:00:00.000Z",
  "updatedAt": "Firestore Timestamp"
}
```

## Cloudflare Workers 배포

Cloudflare 공식 문서 기준으로 현재 Next.js는 OpenNext 어댑터를 통해 Workers에 배포합니다.

로컬 미리보기:

```bash
cp .dev.vars.example .dev.vars
npm run preview
```

배포 전 준비:

```bash
npm run cf-typegen
```

배포:

```bash
npm run deploy
```

추가된 Cloudflare 관련 파일:

- `open-next.config.ts`
- `wrangler.jsonc`
- `.dev.vars.example`

Cloudflare에서 필요한 공개 환경 변수:

- `NEXT_PUBLIC_FIREBASE_API_KEY`
- `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
- `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
- `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
- `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
- `NEXT_PUBLIC_FIREBASE_APP_ID`
