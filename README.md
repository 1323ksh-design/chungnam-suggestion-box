# 충남반도체마이스터고 학생 건의함

Next.js + Supabase 기반의 다중 파일 웹 애플리케이션입니다. 학생용 건의 작성/게시판, 익명 제출, 분야·상태 필터, 공감, 관리자 로그인·답변·처리 상태 기능을 포함합니다.

> 이 프로젝트는 배포 가능한 시작 코드입니다. 아직 사용자의 GitHub/Supabase/Vercel 계정에 연결되거나 온라인에 게시된 상태는 아닙니다. 학교에서 실제 운영하기 전 담당 교직원의 승인, 개인정보 처리 기준, 관리자 계정, 보안 정책을 검토해야 합니다.

## 구성

- `app/page.tsx`: 학생용 페이지
- `app/admin/page.tsx`: 관리자 로그인 및 건의 처리
- `app/globals.css`: 반응형 디자인
- `lib/supabase.ts`: Supabase 연결
- `supabase/schema.sql`: 테이블, RLS, 공감 RPC 설정
- `.env.example`: 환경 변수 예시

## 1. Supabase 프로젝트 만들기

1. https://supabase.com 에서 계정을 만들고 새 프로젝트를 생성합니다.
2. 프로젝트 대시보드의 **SQL Editor**로 이동합니다.
3. `supabase/schema.sql` 파일의 전체 내용을 복사해 SQL Editor에 붙여넣고 실행합니다.
4. **Project Settings → API** 또는 **Connect** 화면에서 Project URL과 publishable/anon key를 확인합니다. `service_role` 또는 secret key는 절대 브라우저에 넣거나 GitHub에 올리지 마세요.

## 2. GitHub에 프로젝트 올리기

1. https://github.com/new 에서 새 저장소를 만듭니다. 예: `chungnam-suggestion-box`
2. 저장소는 학교 운영 정책에 맞게 공개/비공개를 선택합니다. `.env.local`은 절대 업로드하지 마세요.
3. ZIP을 풀고 프로젝트 폴더 안의 파일들을 저장소 루트에 올립니다. GitHub 웹에서 파일 업로드를 사용하거나, 로컬에서 Git을 쓸 수 있습니다.

로컬 Git을 사용하는 경우 프로젝트 폴더에서:

```bash
npm install
npm run dev
```

브라우저에서 `http://localhost:3000`을 열어 확인합니다. GitHub에 올리려면:

```bash
git init
git add .
git commit -m "Initial school suggestion box"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/chungnam-suggestion-box.git
git push -u origin main
```

`YOUR_USERNAME`과 저장소 주소를 본인 값으로 바꾸세요.

## 3. Vercel에 배포하기

1. https://vercel.com 에서 GitHub 계정으로 가입/로그인합니다.
2. **Add New → Project**를 선택하고 방금 만든 저장소를 Import 합니다.
3. Framework가 Next.js로 감지되는지 확인합니다.
4. **Environment Variables**에 다음 두 값을 추가합니다.
   - `NEXT_PUBLIC_SUPABASE_URL` = Supabase Project URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = Supabase publishable/anon key
5. **Deploy**를 누릅니다. 빌드가 성공하면 `*.vercel.app` 주소가 발급됩니다.
6. GitHub `main` 브랜치에 변경사항을 push하면 자동으로 다시 배포됩니다.

무료 플랜의 사용 범위와 이용 약관은 변경될 수 있습니다. Vercel Hobby는 개인/비상업적 사용을 대상으로 하므로 학교가 공식 운영하는 서비스에 적합한지 배포 전 Vercel의 현재 플랜 약관을 확인하세요. 학교 공식 운영이라면 학교가 승인한 호스팅 계정/플랜을 사용해야 할 수 있습니다.

## 4. 관리자 계정 만들기

1. Supabase Dashboard → **Authentication → Users**에서 담당 교직원이 사용할 계정을 생성합니다. 학생 계정을 무분별하게 공개 가입시키지 마세요.
2. 생성된 사용자 ID(UUID)를 복사합니다.
3. SQL Editor에서 아래 SQL을 실행하되 UUID를 실제 값으로 바꿉니다.

```sql
insert into public.user_roles (user_id, role)
values ('여기에-실제-사용자-UUID', 'admin')
on conflict (user_id) do update set role = 'admin';
```

4. 배포된 사이트에서 `/admin`으로 접속해 해당 이메일과 비밀번호로 로그인합니다.
5. 관리자 권한은 `user_roles` 테이블의 `admin` 역할로 검사됩니다. 관리자를 추가할 때도 담당자 승인과 최소 권한 원칙을 따르세요.

## 5. 운영 전에 반드시 확인

- 이 게시판은 기본 설정상 건의 제목/내용/답변을 모든 방문자에게 공개합니다. 비공개 건의가 필요하면 별도 비공개 테이블/정책과 로그인 절차를 설계해야 합니다.
- 익명은 게시판에 이름을 표시하지 않는다는 의미입니다. 완전한 익명성이나 기술적 추적 불가를 보장하지 않습니다. 서버 로그, 호스팅 로그, 학교 정책을 검토하세요.
- 공개 제출 폼은 스팸을 받을 수 있습니다. 실제 개교/학교 운영 전 CAPTCHA, 요청 제한, 신고/삭제 절차를 추가하세요.
- 현재 공감 중복 방지는 브라우저의 UUID에 의존하므로 다른 기기/브라우저에서 반복 공감하는 것을 완벽하게 막지는 못합니다.
- SQL 정책은 기본적인 권한 분리를 제공합니다. 실제 운영 전 담당 개발자/학교 IT 담당자가 RLS, 공개 데이터 범위, 백업/보존 기간, 삭제 요청, 접근 로그를 점검해야 합니다.
- 학교 공식 명칭과 로고를 사용하거나 공식 사이트에서 링크할 때 학교 승인을 받으세요.

## 공식 문서

- Next.js: https://nextjs.org/docs/app
- Supabase Next.js quickstart: https://supabase.com/docs/guides/getting-started/quickstarts/nextjs
- Supabase Row Level Security: https://supabase.com/docs/guides/database/postgres/row-level-security
- Vercel Next.js deployment: https://vercel.com/docs/frameworks/nextjs
