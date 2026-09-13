# 홀로서기 상담관리

React 19 + TypeScript + Vite 기반 상담관리 프런트엔드입니다.
Tailwind CSS 4와 shadcn/ui(Button, Input, Dialog), 고운돋움 폰트를 설정했습니다.
기존 서비스의 원본 화면 없이, 요청한 사이드바와 헤더 배치를 바탕으로 구성한 디자인입니다.

## 실행

```sh
npm install
npm run dev
```

브라우저에서 http://localhost:5173 에 접속합니다. Windows PowerShell에서 실행 정책 오류가 나면 `npm.cmd run dev`를 사용하세요.

```sh
npm run typecheck
npm run build
npm run preview
```

브라우저 테스트: `npx playwright test` (Microsoft Edge 설치 필요). 상담 등록·수정·저장 유지와 모바일 메뉴·닉네임 변경을 검증합니다.

## 환경 변수

`.env.local`을 생성해 두었습니다. 새 환경에서는 `.env.example`을 복사하세요.

- `VITE_APP_NAME`: 애플리케이션 이름
- `VITE_ADMIN_NICKNAME`: 기본 관리자 닉네임. 화면에서 저장한 닉네임이 우선합니다.
- `VITE_API_BASE_URL`: 별도 API 연결용 예약 값. Supabase에서는 사용하지 않습니다.
- `VITE_SUPABASE_URL`: Supabase 프로젝트 URL (현재 빈 값)
- `VITE_SUPABASE_PUBLISHABLE_KEY`: Supabase Publishable key 또는 기존 anon key (현재 빈 값)

Supabase 활성화 절차와 테이블 SQL은 [Supabase 연결 안내](supabase/README.md)를 참고하세요.

환경 변수 변경 후 개발 서버를 재시작하세요. `VITE_` 변수는 브라우저에 공개되므로 비밀키를 넣지 마세요. `.env.local`은 Git에서 제외됩니다.

## 구현 범위

- 반응형 사이드바, 상단 알림 및 프로필 메뉴
- 상담 통계, 등록·수정·검색·상태 필터, 날짜별 일정
- 닉네임 설정 및 상담 기록의 localStorage 저장
- 예시 학생 상담 데이터

Supabase 환경 변수를 입력하면 실명·이메일·비밀번호 회원가입을 먼저 표시합니다. 가입 후 관리자가 `profiles.is_teacher`를 true로 승인해야 상담 기능을 사용할 수 있습니다. 테이블 SQL 001과 승인 정책 SQL 002를 순서대로 적용해야 합니다. RLS는 승인된 계정의 본인 기록 접근만 허용합니다. 두 값이 비어 있으면 기존 예시 모드를 사용합니다. 실제 알림 발송과 독립적인 학생 등록은 아직 구현하지 않았습니다.

## 구조

- `src/App.tsx`: 상담관리 화면과 상호작용
- `src/data.ts`: 상담 타입, 초기 데이터, 로컬 저장 읽기
- `src/components/ui/`: shadcn/ui 컴포넌트
- `src/index.css`: Tailwind 설정 및 브랜드 테마
- `src/lib/utils.ts`: 클래스 병합 유틸리티
- `components.json`: shadcn CLI 설정

컴포넌트 추가: `npx shadcn@latest add card`
설정 참고: https://ui.shadcn.com/docs/installation/vite
