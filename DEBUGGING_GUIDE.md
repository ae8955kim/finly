# Supabase 디버깅 가이드

## 현재 배포 (재배포 완료)

**URL**: https://v0-project-sable-rho.vercel.app
**상태**: 배포 완료

---

## 환경변수 확인 (개선됨)

### lib/supabase/client.ts

이제 다음과 같이 명확한 에러 로깅이 됩니다:

```javascript
if (!url || !key) {
  const missingVars = []
  if (!url) missingVars.push('NEXT_PUBLIC_SUPABASE_URL')
  if (!key) missingVars.push('NEXT_PUBLIC_SUPABASE_ANON_KEY')
  
  console.error('[v0] Missing Supabase environment variables:', {
    missing: missingVars,
    urlExists: !!url,
    keyExists: !!key,
    environment: process.env.NODE_ENV,
  })
}
```

**결과**: 브라우저 콘솔에서 어떤 환경변수가 없는지 정확히 알 수 있음

### lib/supabase/server.ts

서버에서도 동일하게 명확한 에러 로깅:

```javascript
console.error('[v0] Missing Supabase environment variables (server):', {
  missing: missingVars,
  urlExists: !!url,
  keyExists: !!key,
  environment: process.env.NODE_ENV,
})
```

---

## Visitors 테이블 조회 에러 로깅 (개선됨)

### GET /api/visitors

이제 데이터 조회의 모든 단계가 로깅됩니다:

**1단계: 클라이언트 생성**
```
[v0] GET /api/visitors - Starting data fetch
[v0] Supabase client created successfully
```

**2단계: 쿼리 실행**
```
[v0] Query parameters: { deleted: false, updateNonExited: true }
[v0] Executing query to fetch visitors
```

**3단계: 성공**
```
[v0] Successfully fetched visitors: { count: 5, hasData: true }
```

**3단계 (실패): 에러 발생**
```
[v0] Supabase select error - visitors table query failed: {
  message: "relation \"public.visitors\" does not exist",
  code: "42P01",
  details: "...",
  hint: "..."
}
```

---

## 에러 메시지 해석

### "relation \"public.visitors\" does not exist"

**의미**: Supabase에 visitors 테이블이 없음
**해결**: SUPABASE_FINAL_SCHEMA.sql 실행

### "Missing Supabase environment variables"

**의미**: 환경변수 미설정
**해결**: 
1. Vercel 대시보드 → Settings → Environment Variables
2. NEXT_PUBLIC_SUPABASE_URL 추가
3. NEXT_PUBLIC_SUPABASE_ANON_KEY 추가

### "Failed to create Supabase client"

**의미**: 클라이언트 생성 실패 (환경변수 문제)
**해결**: 환경변수 값이 정확한지 확인

---

## 로그 확인 방법

### 브라우저 콘솔 (F12)

```
F12 → Console 탭
공사자/관리자 페이지에 접속하면 아래와 같은 로그가 보임:

[v0] Supabase client created successfully {
  urlLength: 42,
  keyLength: 150,
  environment: "production"
}
```

### Vercel 함수 로그

```
Vercel 대시보드
→ v0-project
→ Deployments (latest)
→ Functions
→ /api/visitors
→ Logs 탭

실시간 로그 확인 가능
```

---

## 데이터 흐름 추적

### 공사자 등록 (POST /api/visitors)

1. 공사자가 정보 입력 → [방문 등록하기] 클릭
2. POST /api/visitors 호출
3. 콘솔:
   ```
   [v0] Supabase insert error (없으면 성공)
   ```
4. 응답: 
   ```
   { visitor: {...} } (성공)
   또는
   { error: "방문자 등록에 실패했습니다." } (실패)
   ```

### 관리자 대시보드 로드 (GET /api/visitors)

1. 관리자 대시보드 접속
2. GET /api/visitors 호출
3. 콘솔:
   ```
   [v0] GET /api/visitors - Starting data fetch
   [v0] Supabase client created successfully
   [v0] Query parameters: { deleted: false, updateNonExited: true }
   [v0] Executing query to fetch visitors
   [v0] Successfully fetched visitors: { count: X, hasData: true }
   ```

---

## 트러블슈팅

### 상황 1: 브라우저 콘솔에 에러 없는데 데이터 안 보임

**확인 사항**:
1. Vercel 함수 로그에서 `[v0]` 로그 확인
2. "relation does not exist" 에러 있는지 확인
3. 있으면 → SUPABASE_FINAL_SCHEMA.sql 실행

### 상황 2: "Missing Supabase environment variables" 에러

**확인 사항**:
1. Vercel 환경변수 설정 확인
2. NEXT_PUBLIC_SUPABASE_URL 값 확인
3. NEXT_PUBLIC_SUPABASE_ANON_KEY 값 확인
4. 배포 재실행 (Redeploy)

### 상황 3: 네트워크 오류

**확인 사항**:
1. Vercel 함수 로그에서 네트워크 에러 메시지 확인
2. Supabase 상태 확인: https://status.supabase.com
3. 잠시 기다린 후 재시도

---

## 코드 위치

### 환경변수 검증
- `lib/supabase/client.ts` - 클라이언트 생성
- `lib/supabase/server.ts` - 서버 클라이언트 생성

### 데이터 조회 에러 로깅
- `app/api/visitors/route.ts` - GET 메서드

### 모든 API 라우트
```
app/api/visitors/route.ts
app/api/visitors/[id]/route.ts
app/api/visitors/[id]/messages/route.ts
```

---

## 개선된 로깅 내용

### 추가된 정보

1. **환경변수 상태**
   - urlExists: 환경변수 존재 여부
   - keyExists: 환경변수 존재 여부
   - missing: 누락된 변수 목록

2. **데이터 조회 진행 상황**
   - 클라이언트 생성 성공/실패
   - 쿼리 실행 단계
   - 데이터 조회 결과 (개수)

3. **에러 정보**
   - 에러 메시지
   - 에러 코드
   - 에러 세부사항
   - 스택 트레이스

---

## 빠른 체크리스트

```
환경변수 확인:
  [ ] NEXT_PUBLIC_SUPABASE_URL 설정됨
  [ ] NEXT_PUBLIC_SUPABASE_ANON_KEY 설정됨
  [ ] Vercel에 배포됨

DB 테이블 확인:
  [ ] visitors 테이블 생성됨
  [ ] chat_messages 테이블 생성됨
  [ ] audit_logs 테이블 생성됨

로그 확인:
  [ ] 브라우저 콘솔에서 [v0] 로그 확인
  [ ] Vercel 함수 로그에서 [v0] 로그 확인
  [ ] 에러 메시지 없음

동작 확인:
  [ ] 공사자 페이지 로드됨
  [ ] 공사자 등록 가능
  [ ] 관리자 페이지 로드됨
  [ ] 관리자가 데이터 볼 수 있음
```

