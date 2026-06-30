# ResumeSelf

Framer, Notion, Figma/PPT의 장점을 조합한 웹 기반 이력서·포트폴리오 제작 서비스입니다.

사용자는 Supabase OAuth로 로그인하고 프로젝트를 생성한 뒤, Next.js App Router의 Dynamic Route(`/[slug]`)를 통해 자신만의 공개 URL을 발급받습니다.

## Tech Stack

- Next.js App Router
- TypeScript
- TailwindCSS
- Supabase Auth, PostgreSQL, Storage
- Zustand
- Tiptap
- dnd-kit
- react-resizable
- html2pdf.js

## Getting Started

```bash
npm install
npm run dev
```

현재 개발 서버는 3001 포트로 실행할 수 있습니다.

```bash
npm run dev -- --port 3001
```

## Environment

`.env.example`을 기준으로 Supabase 값을 설정합니다.

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
PREMIUM_EMAIL_WHITELIST=
```

## Supabase

초기 테이블과 RLS 정책은 `supabase/schema.sql`에 있습니다.

현재 구현된 기반:

- Supabase OAuth 클라이언트/서버 연결
- Google/Github OAuth 버튼
- Dashboard 프로젝트 목록 시작 화면
- `/[slug]` 공개 URL 렌더링
- `/editor/[projectId]` 에디터 레이아웃
- Insert Panel, Canvas, Property Panel
- Zustand 기반 Editor 상태
- dnd-kit 기반 Canvas 드래그 시작점
- 10초 Debounce Auto Save UI 상태
- PDF Export 버튼 연결

## Implementation Order

1. 프로젝트 초기 세팅
2. Supabase 연결
3. OAuth 로그인
4. Dashboard
5. Database 설계
6. Dynamic Route(`/[slug]`)
7. Editor UI
8. Drag & Drop
9. Rich Text Editor
10. Image 기능
11. Video 기능
12. Navigation (Router / Scroll)
13. Responsive
14. Auto Save
15. Preview
16. PDF Export
17. URL 공유
18. 최적화 및 리팩토링

