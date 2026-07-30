# 500 에러 완벽 해결 가이드 - 모든 파일 준비 완료

## 문제 상황
- Vercel 배포 ✅
- 환경변수 설정 ✅
- **500 INTERNAL_SERVER_ERROR** ❌

---

## 원인: Supabase 테이블이 없음

앱이 실행되려면 다음 3개 테이블이 필요합니다:
- `visitors` - 방문자 정보
- `chat_messages` - 채팅 메시지
- `audit_logs` - 감사 로그

테이블이 없으면 DB 쿼리 실패 → 500 에러

---

## ✅ 5분 안에 해결하는 방법

### 1️⃣ SQL 복사 (프로젝트 폴더에서)

프로젝트 루트의 **`SUPABASE_SETUP.sql`** 파일을 엽니다.
→ 전체 내용 복사

### 2️⃣ Supabase SQL Editor에서 실행

1. Supabase 대시보드 → 프로젝트 선택
2. **SQL Editor** 클릭 (좌측 메뉴)
3. **New Query** 클릭
4. **SUPABASE_SETUP.sql 전체 붙여넣기**
5. 우측 상단 **Run** 클릭

### 3️⃣ 확인 & 재접속

1. Supabase → **Table Editor** 클릭
2. 좌측에 3개 테이블 확인:
   - ✅ `visitors`
   - ✅ `chat_messages`
   - ✅ `audit_logs`

3. 브라우저 캐시 삭제: `Ctrl+Shift+Delete`
4. https://v0-project-sable-rho.vercel.app/worker 새로고침
5. 공사자 등록 가능 확인

---

## 📋 제공된 파일들

프로젝트 폴더에 다음 파일들이 있습니다:

```
1. SUPABASE_SETUP.sql
   → Supabase SQL Editor에 붙여넣어 실행할 전체 SQL
   → 모든 테이블, 인덱스, RLS 정책, 트리거 포함

2. DB_SETUP_GUIDE.md
   → 상세한 설정 가이드 및 진단 방법
   → 환경변수 확인 방법
   → 에러 메시지별 해결책

3. TROUBLESHOOTING.md
   → 500 에러 완벽 해결 가이드
   → 단계별 진단 절차
   → 로컬 테스트 방법

4. ERROR_HANDLING_FIX.md
   → 미들웨어 에러 처리 개선사항
   → 앱 크래시 방지 메커니즘

5. SECURITY_IMPLEMENTATION.md
   → 보안 개인정보 처리 완료 보고서
   → RLS 정책 설명
```

---

## 🔍 SQL이 실패한 경우

### 에러: "table already exists"
→ 정상 (테이블 이미 있다는 뜻)
→ 무시하고 계속 진행

### 에러: "relation does not exist"
→ CREATE TABLE 부분부터 먼저 실행
→ 그 후 CREATE POLICY 부분 실행

### 에러: "permission denied"
→ Supabase API 키 권한 부족
→ Project Settings → API → 권한 확인

---

## 🛡️ 에러 처리가 이미 강화됨

모든 API 라우트가 try-catch로 보호됩니다:

```
├ /api/visitors          - 방문자 등록 (try-catch)
├ /api/visitors/[id]     - 상태 변경 (try-catch)
├ /api/visitors/[id]/messages - 채팅 (try-catch)
└ /api/admin/login       - 관리자 로그인 (try-catch)
```

**따라서:**
- DB가 없어도 앱 크래시 안 함
- 에러는 500 상태로만 응답
- 에러 로그는 Vercel 대시보드에 기록

---

## 💡 배포 이후 상황

### DB 테이블 없을 때
```
❌ SQL 쿼리 실패
→ API가 500 응답
→ 앱은 기본 화면 표시 (중단 안 함)
```

### DB 테이블 있을 때
```
✅ SQL 쿼리 성공
→ 데이터 정상 저장
→ 앱 정상 작동
```

### 미들웨어 에러도 안전
```
1️⃣ 환경변수 없음 → 경고 로그만 출력
2️⃣ Supabase 다운 → 요청 계속 진행
3️⃣ 네트워크 오류 → 폴백 처리
```

---

## ⚙️ 환경 변수 최종 확인

**Vercel 대시보드:**
```
Settings → Environment Variables
```

다음 2개 필수:
```
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
```

**가져오는 방법:**
1. Supabase 대시보드 → Project Settings
2. API 섹션
3. Project URL + Anon Key 복사

---

## 📊 현재 배포 상태

| 항목 | 상태 |
|------|------|
| Vercel 배포 | ✅ 완료 |
| 환경 변수 | ✅ 준비됨 |
| 미들웨어 에러 처리 | ✅ 강화됨 |
| API 에러 처리 | ✅ 강화됨 |
| Supabase 테이블 | ⏳ 필요 |
| 전체 기능 | ⏳ SQL 후 작동 |

---

## 🚀 다음 단계

1. **지금**: SUPABASE_SETUP.sql 실행
2. **3-5분 대기**: DB 처리 완료 대기
3. **확인**: 테이블 생성 확인
4. **재접속**: 브라우저 새로고침
5. **테스트**: 공사자 등록 시도

---

## 🆘 문제 계속되면

### 1단계: 함수 로그 확인
```
Vercel 대시보드
→ Deployments (최신)
→ Functions
→ /api/visitors 선택
→ Logs 탭 → 에러 메시지 전체 기록
```

### 2단계: 로컬 테스트
```bash
.env.local 파일 생성:
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...

pnpm dev 실행 후 http://localhost:3000/worker 접속
F12 → Console에서 에러 확인
```

### 3단계: 지원 요청
수집 정보:
- Vercel 함수 전체 로그
- Supabase 프로젝트 ID
- 로컬 에러 메시지
- 환경 변수 설정 확인 (키 제외)

---

**핵심: SUPABASE_SETUP.sql을 Supabase SQL Editor에서 실행하면 모든 게 해결됩니다!**

