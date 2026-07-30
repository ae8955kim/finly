# Supabase DB 설정 가이드 - 500 에러 해결

## 🔴 문제: 500 Internal Server Error

Vercel에 환경변수를 설정했는데도 계속 500 에러가 발생한다면, **Supabase 데이터베이스 테이블이 없을 가능성이 높습니다.**

---

## ✅ 해결 방법

### 1단계: Supabase 대시보드 접속

1. https://supabase.com 접속
2. 프로젝트 선택
3. 좌측 메뉴 → **SQL Editor** 클릭

### 2단계: SQL 쿼리 실행

#### Option A: 파일에서 복사 (권장)
```
프로젝트 루트 → SUPABASE_SETUP.sql 파일 열기
→ 전체 내용 복사
→ Supabase SQL Editor 붙여넣기
→ 우측 상단 "Run" 버튼 클릭
```

#### Option B: 아래 쿼리 복사 (전체 세트)

```sql
-- 1. 방문자 테이블
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

CREATE INDEX IF NOT EXISTS idx_visitors_status ON public.visitors(status);
CREATE INDEX IF NOT EXISTS idx_visitors_registered_at ON public.visitors(registered_at);

ALTER TABLE public.visitors ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "Allow reading visitors" ON public.visitors FOR SELECT USING (true);
CREATE POLICY IF NOT EXISTS "Allow inserting visitors" ON public.visitors FOR INSERT WITH CHECK (true);
CREATE POLICY IF NOT EXISTS "Allow updating visitors" ON public.visitors FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY IF NOT EXISTS "Allow deleting visitors" ON public.visitors FOR DELETE USING (true);

-- 2. 채팅 메시지 테이블
CREATE TABLE IF NOT EXISTS public.chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  visitor_id UUID NOT NULL REFERENCES public.visitors(id) ON DELETE CASCADE,
  sender TEXT NOT NULL CHECK (sender IN ('worker', 'admin')),
  text TEXT NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_chat_messages_visitor_id ON public.chat_messages(visitor_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_created_at ON public.chat_messages(created_at);

ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "Allow reading messages" ON public.chat_messages FOR SELECT USING (true);
CREATE POLICY IF NOT EXISTS "Allow inserting messages" ON public.chat_messages FOR INSERT WITH CHECK (true);

-- 3. 감사 로그 테이블
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action TEXT NOT NULL,
  table_name TEXT NOT NULL,
  record_id UUID,
  ip_address TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs(created_at);
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "Allow reading audit logs" ON public.audit_logs FOR SELECT USING (true);

-- 4. Timestamp 업데이트 함수
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_visitors_updated_at ON public.visitors;
CREATE TRIGGER update_visitors_updated_at
  BEFORE UPDATE ON public.visitors
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_chat_messages_updated_at ON public.chat_messages;
CREATE TRIGGER update_chat_messages_updated_at
  BEFORE UPDATE ON public.chat_messages
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
```

### 3단계: 실행 확인

SQL 실행 후 Supabase의 **Table Editor** 탭을 열어서 확인:
- ✅ `visitors` 테이블 확인
- ✅ `chat_messages` 테이블 확인
- ✅ `audit_logs` 테이블 확인

---

## 🔍 진단: 문제가 뭔지 확인하는 방법

### 1. Vercel 함수 로그 확인

```
1. Vercel 대시보드 → 프로젝트 선택
2. "Deployments" 탭 → 최신 배포 클릭
3. "Functions" 탭 → 함수 선택
4. "Logs" 탭에서 에러 메시지 확인
```

**나타날 수 있는 에러 메시지:**

| 에러 메시지 | 원인 | 해결 방법 |
|-----------|------|--------|
| `relation "visitors" does not exist` | 테이블이 없음 | 위 SQL 실행 |
| `undefined is not a function` | 타입 오류 | 페이지 새로고침 |
| `Supabase credentials not configured` | 환경변수 미설정 | Vercel 환경변수 확인 |
| `NEXT_PUBLIC_SUPABASE_URL` 에러 | 환경변수명 오류 | 정확한 이름으로 설정 |

### 2. 로컬 테스트

```bash
# .env.local 파일 생성
NEXT_PUBLIC_SUPABASE_URL=your_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_key

# 로컬 실행
pnpm dev

# http://localhost:3000/worker 접속
# 에러 메시지 확인 (F12 → Console)
```

### 3. Supabase 상태 확인

https://status.supabase.com에서 Supabase 서버 상태 확인

---

## ✅ 환경 변수 체크리스트

Vercel의 `Settings → Environment Variables`에서 다음 변수가 있는지 확인:

```
☐ NEXT_PUBLIC_SUPABASE_URL    (https://xxxxx.supabase.co 형태)
☐ NEXT_PUBLIC_SUPABASE_ANON_KEY  (공개키, ey...로 시작)
☐ ADMIN_PASSWORD (선택사항)
```

**Supabase에서 가져오는 방법:**

1. Supabase 대시보드 → Project Settings
2. API 섹션
3. Project URL 복사 → `NEXT_PUBLIC_SUPABASE_URL`
4. Anon Key 복사 → `NEXT_PUBLIC_SUPABASE_ANON_KEY`

---

## 🔧 에러 처리 확인

### API가 실패해도 앱은 멈추지 않음 ✅

모든 API 라우트는 try-catch로 보호됨:

```typescript
try {
  const supabase = await createClient()
  const { data, error } = await supabase.from("visitors").select("*")
  
  if (error) {
    return NextResponse.json({ error: "데이터 로드 실패" }, { status: 500 })
  }
} catch (err) {
  // 예상하지 못한 에러도 처리
  return NextResponse.json({ error: "서버 오류" }, { status: 500 })
}
```

---

## 📋 완전한 설정 체크리스트

```
DB 설정:
  ☐ visitors 테이블 생성
  ☐ chat_messages 테이블 생성
  ☐ audit_logs 테이블 생성
  ☐ 인덱스 생성
  ☐ RLS 정책 설정
  ☐ 트리거 함수 생성

Vercel 설정:
  ☐ NEXT_PUBLIC_SUPABASE_URL 환경변수 설정
  ☐ NEXT_PUBLIC_SUPABASE_ANON_KEY 환경변수 설정
  ☐ 배포 재실행 (Revert or Redeploy)

확인:
  ☐ https://v0-project-sable-rho.vercel.app/worker 접속 가능
  ☐ 공사자 등록 가능
  ☐ Vercel 함수 로그에 에러 없음
```

---

## 🆘 여전히 500 에러가 나면?

### 1. 배포 재실행

Vercel 대시보드에서:
```
Deployments → Latest Deploy → "Redeploy" or "Rollback"
```

### 2. 캐시 삭제

브라우저:
```
F12 → Application → Cache Storage → 모두 삭제
Ctrl+Shift+Delete (전체 캐시 삭제)
```

### 3. 환경 변수 다시 확인

```bash
# Vercel에 배포된 환경 변수 보기
vercel env ls
```

### 4. SQL 재실행

Supabase SQL Editor에서 위 SQL을 다시 실행

### 5. 지원 요청

문제가 계속되면 다음 정보와 함께 문의:
- Vercel 함수 로그 (전체 에러 메시지)
- Supabase 프로젝트 ID
- 환경 변수 설정 확인 (키는 제외)

---

**상태 업데이트**: DB 설정 완료 후 3-5분 기다린 후 사이트 재접속

