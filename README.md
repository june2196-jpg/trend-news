# Trend Pulse Dashboard

Cloudflare에 바로 게시할 수 있도록 `index.html` 중심의 정적 대시보드로 재구성한 프로젝트입니다.

## 현재 구조

- `index.html`: 진입 파일
- `style.css`: 전체 레이아웃과 반응형 스타일
- `main.js`: 정적 데이터, 카드 렌더링, SVG 차트 렌더링

브라우저에서 별도 빌드 없이 바로 열 수 있고, Cloudflare Pages 또는 정적 자산 배포 방식으로 바로 올릴 수 있습니다.

## 로컬 확인

가장 단순한 방법은 `index.html`을 브라우저로 여는 것입니다.

정적 서버로 확인하려면 예를 들어 아래처럼 실행하면 됩니다.

```bash
npx serve .
```

## 데이터 수정

화면에 보이는 랭킹과 차트 데이터는 `main.js`의 `trendDataset` 객체에서 관리합니다.

- `trends`: 현재 상위 5개 키워드
- `history`: 상위 3개 키워드의 시간축 이력

실데이터로 바꾸려면 이 객체만 교체하면 됩니다.

## Cloudflare 배포

### Cloudflare Pages

빌드 명령 없이 루트 디렉터리를 그대로 배포하면 됩니다.

- Build command: 비움
- Build output directory: `/`

### Wrangler 자산 배포

현재 `wrangler.jsonc`는 루트 디렉터리를 정적 자산 디렉터리로 사용하도록 맞춰져 있습니다.

배포 예시:

```bash
npx wrangler deploy
```

## 참고

기존 Next.js, Firebase, Functions 관련 소스는 저장소에 남아 있지만, 현재 화면 실행에는 사용되지 않습니다.
실제 게시 기준 파일은 `index.html`, `style.css`, `main.js`입니다.
