# Trend Pulse Dashboard

Google Trends와 Google News RSS를 Cloudflare Worker에서 직접 수집하고, 목록 페이지와 상세 페이지를 서버 렌더링하는 SEO 중심 구조입니다.

## 현재 구조

- `worker.js`: Google Trends/Google News 수집, SSR HTML 생성, `robots.txt`, `sitemap.xml`, `ads.txt` 응답
- `style.css`: 목록/상세 페이지 공통 스타일
- `index.html`, `main.js`: 보조 정적 자산

핵심 페이지는 Worker가 직접 HTML을 반환합니다.

## URL 구조

- `/` 또는 `/?geo=KR`: 메인 트렌드 목록
- `/trend/<slug>?geo=KR`: 트렌드 상세 뉴스 페이지
- `/robots.txt`
- `/sitemap.xml`
- `/ads.txt`

상세 페이지는 실제 URL로 내려가므로 검색엔진이 바로 크롤링할 수 있습니다.

## SEO 반영 사항

- 서버 렌더링 HTML
- `title`, `meta description`, `canonical`
- Open Graph / Twitter 메타
- JSON-LD 구조화 데이터
- `robots.txt`
- `sitemap.xml`

## 애드센스 관련

제공된 AdSense 계정 `ca-pub-4898037749323009` 기준으로 전역 레이아웃에 애드센스 스크립트를 넣었고, `/ads.txt`도 같은 publisher ID로 응답하도록 맞췄습니다.

예시 형식:

```txt
google.com, pub-4898037749323009, DIRECT, f08c47fec0942fa0
```

## Cloudflare 배포

현재 `wrangler.jsonc`는 `worker.js`를 진입점으로 사용합니다.

배포:

```bash
npx wrangler deploy
```

## 참고

Google Trends와 Google News RSS 응답 형식이 바뀌면 `worker.js`의 RSS 파서도 함께 조정해야 합니다.
