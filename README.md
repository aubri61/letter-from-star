# 고별에서 온 편지

반려묘와의 추억을 간직하는 편지 서비스.

## 기술 스택

Next.js App Router · React · TypeScript · Supabase

## 실행 방법

Node.js와 npm을 설치한 뒤 프로젝트에서 실행합니다. nvm을 사용하는 경우 아래 명령으로 Node.js 버전을 맞출 수 있습니다.

```sh
nvm install
nvm use
npm ci
cp .env.example .env.local
```

`.env.local`에 Supabase 프로젝트 정보를 입력합니다.

```dotenv
NEXT_PUBLIC_SUPABASE_URL=프로젝트_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=브라우저용_공개_키
```

새 Supabase 프로젝트에는 `supabase/migrations/`의 SQL 파일을 순서대로 적용합니다. Google 로그인을 사용하려면 Supabase에서 Google provider를 활성화하고, Redirect URLs에 아래 주소를 등록합니다.

```text
http://127.0.0.1:3000/auth/callback
```

개발 서버를 실행합니다.

```sh
npm run dev
```

브라우저에서 <http://127.0.0.1:3000>에 접속합니다.

## 검사

```sh
npm run typecheck
npm run lint
npm test
```

브라우저 테스트는 Google Chrome이 설치된 환경에서 실행합니다.

```sh
npm run test:e2e
```

## 빌드 및 실행

```sh
npm run build
npm run start
```
