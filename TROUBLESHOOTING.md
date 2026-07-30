# 500 에러 해결 완벽 가이드

## 현재 상황
- ✅ Vercel 배포: 완료
- ✅ 환경 변수 설정: 완료
- ❌ 500 에러: 발생 중

## 원인 분석

### 가장 흔한 원인: **Supabase 테이블 없음**

앱은 다음 3개 테이블을 필요로 합니다:
- `visitors` (방문자 정보)
- `chat_messages` (채팅)
- `audit_logs` (감사 로그)

테이블이 없으면 SQL 쿼리 실행 시 에러 발생 → 500 응답

---

## 🔧 즉시 해결 방법 (5분)

### 1단계: Supabase SQL 실행

**위치:**
1. Supabase 대시보드 접속 (https://supabase.com)
2. 프로젝트 선택
3. 좌측 → **SQL Editor**
4. **New Query** 클릭

**실행할 SQL:**

프로젝트 폴더의 `SUPABASE_SETUP.sql` 파일 전체 복사 후 붙여넣기

또는 아래 최소 SQL 실행:

```sql
-- 이 SQL을 Supabase SQL Editor에 붙여넣고 Run 클릭
CREATE TABLE IF NOT EXISTS public.visitors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  floor TEXT NOT NULL,
  company TEXT NOT NULL,
  birth TEXT NOT NULL,
  phone TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pending', 'onsite', 'exited', 'deleted')) DEFAULT 'pending',
  registered_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  entered_at TIMESTAMP WITH TIME ZONE,
  exited_at TIMESTAMP WITH TIME ZONE,
  deleted_at TIMESTAMP WITH TIME ZONE,
  is_from_previous_day BOOLEAN DEFAULT false,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  visitor_id UUID NOT NULL REFERENCES public.visitors(id) ON DELETE CASCADE,
  sender TEXT NOT NULL CHECK (sender IN ('worker', 'admin')),
  text TEXT NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action TEXT NOT NULL,
  table_name TEXT NOT NULL,
  record_id UUID,
  ip_address TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.visitors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "Allow reading visitors" ON public.visitors FOR SELECT USING (true);
CREATE POLICY IF NOT EXISTS "Allow inserting visitors" ON public.visitors FOR INSERT WITH CHECK (true);
CREATE POLICY IF NOT EXISTS "Allow updating visitors" ON public.visitors FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY IF NOT EXISTS "Allow deleting visitors" ON public.visitors FOR DELETE USING (true);

CREATE POLICY IF NOT EXISTS "Allow reading messages" ON public.chat_messages FOR SELECT USING (true);
CREATE POLICY IF NOT EXISTS "Allow inserting messages" ON public.chat_messages FOR INSERT WITH CHECK (true);

CREATE POLICY IF NOT EXISTS "Allow reading audit logs" ON public.audit_logs FOR SELECT USING (true);
```

### 2단계: 확인

SQL 실행 완료 후:
1. Supabase → **Table Editor** 탭
2. 좌측에 `visitors`, `chat_messages`, `audit_logs` 테이블 확인

### 3단계: 사이트 재접속

1. 브라우저 캐시 삭제: `Ctrl+Shift+Delete`
2. https://v0-project-sable-rho.vercel.app/worker 새로고침
3. 공사자 등록 가능한지 확인

---

## 🔍 여전히 500 에러가 나면?

### 진단 단계 1: 환경 변수 확인

Vercel 대시보드에서:
```
Settings → Environment Variables
```

다음 2개 변수가 있는지 확인:
- ☑ `NEXT_PUBLIC_SUPABASE_URL`
- ☑ `NEXT_PUBLIC_SUPABASE_ANON_KEY`

**값이 없다면:**
1. Supabase 대시보드 → Project Settings → API
2. Project URL 복사 → NEXT_PUBLIC_SUPABASE_URL
3. Anon Key 복사 → NEXT_PUBLIC_SUPABASE_ANON_KEY
4. Vercel 환경 변수에 다시 입력

### 진단 단계 2: 함수 로그 확인

Vercel에서 실제 에러 메시지 보기:

```
1. Vercel 대시보드 접속
2. v0-project 선택
3. Deployments (최신)
4. Functions 탭
5. /api/visitors 등 함수 선택
6. Logs 탭 → 에러 메시지 확인
```

**나타날 수 있는 메시지:**

#### ❌ "relation 'public.visitors' does not exist"
→ **테이블 생성 필요** (위의 SQL 실행)

#### ❌ "connect ECONNREFUSED"
→ **네트워크 오류** (Supabase 상태 확인: status.supabase.com)

#### ❌ "permission denied"
→ **API 키 권한 부족** (Supabase에서 Anon Key 확인)

#### ❌ "Missing Supabase credentials"
→ **환경 변수 미설정** (위의 환경 변수 확인)

### 진단 단계 3: 로컬 테스트

```bash
# 로컬에서 테스트하기
1. 프로젝트 폴더에 .env.local 파일 생성
2. 다음 내용 작성:
NEXT_PUBLIC_SUPABASE_URL=your_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_key
ADMIN_PASSWORD=test

3. pnpm dev 실행
4. http://localhost:3000/worker 열기
5. 에러 확인 (F12 → Console)
```

---

## 🛡️ 에러 처리가 강화됨

모든 API 엔드포인트는 **try-catch로 보호**됩니다:

```typescript
// 이런 식으로 모든 API 라우트가 보호됨
async function POST(request) {
  try {
    // DB 작업
    const data = await supabase...
    return response
  } catch (error) {
    // 에러 발생해도 500 상태로만 응답 (앱 크래시 안 함)
    return NextResponse.json({ error: "..." }, { status: 500 })
  }
}
```

따라서 **DB가 없어도 앱은 유지됨** (에러 메시지만 표시)

---

## 💡 체크리스트

```
DB 설정:
  ☐ Supabase SQL Editor에서 SQL 실행
  ☐ visitors 테이블 생성됨
  ☐ chat_messages 테이블 생성됨
  ☐ audit_logs 테이블 생성됨

Vercel 설정:
  ☐ NEXT_PUBLIC_SUPABASE_URL 설정
  ☐ NEXT_PUBLIC_SUPABASE_ANON_KEY 설정
  ☐ 환경 변수 저장 후 배포 완료

테스트:
  ☐ https://v0-project-sable-rho.vercel.app/worker 접속 가능
  ☐ 개인정보 동의 모달 표시
  ☐ 공사자 등록 가능
  ☐ Vercel 로그에 에러 없음
```

---

## 🆘 최종 지원

위 모든 단계를 완료했는데도 500 에러가 계속 나면:

### 정보 수집

1. **Vercel 함수 로그** 전체 복사
2. **Supabase 프로젝트 ID** (Project Settings)
3. **환경 변수 설정 확인** (키 제외)
4. **로컬 에러 메시지** (F12 Console)

### 연락

- Vercel 지원: https://vercel.com/help
- Supabase 지원: https://supabase.com/support
- 프로젝트 담당자

---

**마지막 팁:** SQL 실행 후 3-5분 대기 후 재접속하세요. 데이터베이스가 처리하는 데 시간이 걸릴 수 있습니다.

