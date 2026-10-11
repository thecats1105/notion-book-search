# Notion Book Search (노션 도서 검색 및 서재 등록 위젯)

> 노션(Notion) 독서 기록 페이지에 임베드하여 책을 검색하고, 고화질 표지와 함께 서재 데이터베이스에 원클릭으로 자동 저장하는 위젯입니다. Astro, React, Tailwind CSS, Biome, Cloudflare Pages로 구축되었습니다.

---

## 개요

노션으로 독서 서재를 가꿀 때 알라딘, 예스24 등에서 일일이 표지 이미지를 찾아 복사하고 책 정보(저자, 출판사, 출간일, ISBN 등)를 입력하는 것은 매우 번거롭습니다.

**Notion Book Search**는 노션 페이지의 `/embed` 블록에 깔끔하게 들어가는 책 검색 및 등록 위젯을 제공합니다.
국내 도서(카카오/다음)와 해외 도서(Google Books)를 동시에 검색하며, **카카오 고화질 원본 표지 추출 로직**을 통해 갤러리 뷰에 최적화된 고해상도 표지를 노션 페이지 커버로 즉시 등록합니다. 또한 ISBN을 통한 실시간 중복 검사로 이미 등록된 도서인지 사전에 경고합니다.

### 주요 기능

- **통합 도서 검색**: **카카오 책 검색 API**(국내 도서 강점)와 **Google Books API**(원서 및 글로벌 도서 커버리지)를 병렬 조회 및 결합.
- **고해상도 표지 원본 추출**:
  - 카카오 CDN의 기본 저화질 썸네일(`https://search1.kakaocdn.net/thumb/...`)에서 `fname` 쿼리 파라미터를 자동 디코딩하여 압축되지 않은 고화질 원본 표지 이미지를 추출합니다.
  - Google Books 표지도 왜곡 요소(`edge=curl`)를 제거하고 HTTPS로 변환하여 선명한 커버를 제공합니다.
- **보안과 프라이버시 (URL Hash 전략)**:
  - 사용자별 API 키(Kakao, Google, Notion 토큰)와 DB ID는 URL의 **Hash Fragment**(`#config=...`)에 실립니다.
  - 브라우저 특성상 URL Hash는 웹 서버로 전송되지 않으므로 Cloudflare 서버 로그, HTTP Referer, 방문 기록 등에 개인 키가 노출되지 않는 완전한 무상태(Zero-knowledge) 구조입니다.
- **노션 데이터베이스 스키마 자동 감지 및 매핑**:
  - URL 생성기에서 노션 토큰과 DB ID를 넣고 버튼 한 번만 누르면, 데이터베이스의 속성 목록을 불러와 제목, 저자, 출판사, 출간일, ISBN 필드를 드롭다운으로 쉽게 매핑할 수 있습니다.
- **ISBN 기반 중복 도서 검증**:
  - 책을 선택하여 상세 모달을 열면 노션 DB를 실시간 조회하여 이미 서재에 등록된 책인지 경고 뱃지와 함께 노션 링크를 띄워줍니다.
- **반응형 & 다크 모드 지원**:
  - 노션의 좁은 1열 레이아웃(300px)부터 넓은 전체 너비 페이지까지 유연하게 적응합니다.
  - 시스템 테마 자동 반영 및 수동 다크/라이트 모드 전환 토글을 제공합니다.
- **트렌디한 웹 스택**:
  - Astro (SSR mode with `@astrojs/cloudflare`)
  - React 19 + Tailwind CSS + Lucide Icons
  - Biome 포맷터 & 린터 적용
  - Bun 런타임 및 패키지 매니저
  - 절대경로 import (`@/*` -> `src/*`)

---

## 기술 스택

| 구분 | 기술 |
|---|---|
| **런타임 & 패키지 매니저** | [Bun](https://bun.sh/) |
| **프레임워크** | [Astro](https://astro.build/) + [React](https://react.dev/) |
| **호스팅** | [Cloudflare Pages](https://pages.cloudflare.com/) (`@astrojs/cloudflare`) |
| **스타일링** | [Tailwind CSS v4](https://tailwindcss.com/) |
| **코드 린트/포맷** | [Biome](https://biomejs.dev/) |
| **외부 API** | 카카오 책 검색 API, Google Books API, Notion API |

---

## 아키텍처 및 보안 구조

```
+------------------+         #config=<encoded>         +--------------------+
|    노션 페이지    | --------------------------------> |  임베드 위젯 클라이언트 |
|  (/embed 블록)   |                                   |  (브라우저 Hash 파싱) |
+------------------+                                   +--------------------+
                                                                  |
                                                HTTPS API 프록시 요청 | (Headers/Body)
                                                                  v
                                                       +--------------------+
                                                       |  Cloudflare Pages  |
                                                       |     SSR 프록시     |
                                                       +--------------------+
                                                          |        |       |
                                         +----------------+        |       +----------------+
                                         v                         v                        v
                                  [ 카카오 책 검색 ]         [ Google Books ]           [ Notion API ]
```

1. **URL Hash 저장**: 위젯 URL 생성 시 모든 설정은 URL-safe Base64로 인코딩되어 `#config=...` 해시 형태로 생성됩니다. 브라우저는 서버로 해시를 보내지 않습니다.
2. **무상태 Cloudflare Pages 프록시**: 브라우저의 CORS 제한을 우회하기 위해 `/api/search`, `/api/notion/schema`, `/api/notion/check`, `/api/notion/save` 프록시 엔드포인트를 거쳐 각 API로 안전하게 중계됩니다. 서버에는 어떤 키도 영구 저장되지 않습니다.

---

## 로컬 개발 및 실행

### 사전 요구사항

- [Bun](https://bun.sh/) 설치 (`v1.1+` 권장)

### 설치

```bash
# 저장소 복제
git clone https://github.com/thecats1105/notion-book-search.git
cd notion-book-search

# 패키지 설치
bun install
```

### 개발 서버 실행

```bash
bun run dev
```

브라우저에서 [http://localhost:4321](http://localhost:4321)로 접속합니다.

### 명령어 목록

- `bun run dev`: Astro 로컬 개발 서버 실행
- `bun run build`: Cloudflare Pages용 프로덕션 빌드
- `bun run preview`: 빌드 결과물 로컬 미리보기
- `bun run deploy`: 빌드 후 Wrangler를 통해 Cloudflare Pages로 즉시 배포
- `bun test`: 유닛 테스트 실행 (도서 썸네일 변환, 인코딩/디코딩, 노션 ID 파싱)
- `bun run check`: Biome 코드 검사 (린트 및 포맷)
- `bun run format`: Biome 자동 포맷팅

---

## Cloudflare Pages 배포 가이드

### 방법 1: GitHub 연동 (권장)

1. 본 레포지토리를 GitHub에 푸시합니다.
2. [Cloudflare 대시보드](https://dash.cloudflare.com/)에 로그인한 뒤 **Workers & Pages** > **Create application** > **Pages** > **Connect to Git**을 선택합니다.
3. 레포지토리를 지정하고 빌드 설정을 입력합니다:
   - **Framework preset**: None (또는 Astro)
   - **Build command**: `bun run build`
   - **Build output directory**: `dist`
   - **Compatibility flag**: `nodejs_compat`
4. **Save and Deploy**를 누르면 자동으로 전 세계 엣지 네트워크에 배포됩니다.

### 방법 2: Wrangler CLI 배포

```bash
bun run build
bunx wrangler pages deploy dist
```

---

## 사용 방법

### 1. 임베드 URL 생성

1. 배포된 웹사이트 주소(`https://<your-domain>.pages.dev/`)에 접속합니다.
2. **Step 1: 노션 연동 설정**:
   - **Notion 내부 통합 시크릿 토큰**(`secret_...`)을 입력합니다. ([노션 통합 생성 페이지](https://www.notion.so/profile/integrations))
   - 연동할 서재 **데이터 소스 ID (또는 데이터베이스 ID/URL)**(또는 노션 DB 전체 URL)를 입력합니다.
   - **연결 테스트 및 속성 불러오기** 버튼을 누릅니다. (노션 DB의 "..." &rarr; "연결" 메뉴에서 생성한 통합을 먼저 초대해야 합니다)
3. **Step 2: 데이터베이스 컬럼 매핑**:
   - 제목, 저자, 출판사, 출간일, ISBN 컬럼을 각각 매핑합니다.
4. **Step 3: 책 검색 API 키 등록**:
   - **카카오 REST API 키**: [카카오 개발자 콘솔](https://developers.kakao.com/console/app)에서 발급받아 입력 후 [테스트] 버튼을 누릅니다.
   - **Google Books API 키**: [Google Cloud 콘솔](https://console.cloud.google.com/apis/credentials)에서 발급받아 입력합니다. (선택 사항)
5. **Step 4: 환경설정**:
   - 기본 테마(자동, 라이트, 다크)와 기본 검색 탭을 선택합니다.
6. **Step 5: 임베드 URL 복사**:
   - 생성된 URL을 복사합니다.

### 2. 노션 페이지에 임베드 위젯 추가

1. 노션 독서 기록 페이지에서 빈 줄에 `/embed`(임베드)를 입력하고 엔터를 칩니다.
2. 복사한 URL을 붙여넣고 **링크 임베드** 버튼을 클릭합니다.
3. 위젯의 크기(너비 및 높이)를 서재 디자인에 맞게 드래그하여 조정합니다.
4. 책 제목이나 저자를 검색하고, 카드를 눌러 고화질 표지를 확인한 뒤 **Add to Notion** 버튼을 누르면 서재에 즉시 등록됩니다!

---

## 라이선스

MIT License. 상세 내용은 [LICENSE](LICENSE) 파일을 참조하세요.

