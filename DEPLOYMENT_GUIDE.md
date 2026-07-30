# 방문 공사자 관리 시스템 - Supabase 배포 완료

## 프로덕션 URL

- **공사자 대시보드**: https://v0-project-sable-rho.vercel.app/worker
- **관리자 대시보드**: https://v0-project-sable-rho.vercel.app/admin

## 주요 변경사항

### 1. 데이터베이스 마이그레이션 (메모리 → Supabase)
- 모든 방문자 정보는 이제 Supabase PostgreSQL에 저장됨
- 채팅 메시지도 Supabase에 저장됨
- 자동 타임스탬프 관리 및 인덱싱 추가

### 2. Supabase 테이블 스키마

#### visitors 테이블
```sql
- id (UUID): 고유 ID
- name, floor, company, birth, phone: 방문자 정보
- status: pending/onsite/exited/deleted
- registered_at, entered_at, exited_at, deleted_at: 시간 기록
- is_from_previous_day: 전날 입실 여부
- created_at: 생성 시간
```

#### chat_messages 테이블
```sql
- id (UUID): 고유 ID
- visitor_id (FK): 방문자 ID
- sender: worker/admin
- text: 메시지 내용
- created_at: 메시지 시간
```

### 3. Row Level Security (RLS)
- 모든 테이블에 RLS 정책 적용
- 현재는 모든 관리자 요청에 대해 SELECT/INSERT/UPDATE/DELETE 허용

### 4. API 엔드포인트 변경

#### 공사자 API
- `POST /api/visitors` - 등록 정보 제출 (공개)
- `GET /api/visitors/[id]/messages` - 메시지 조회
- `POST /api/visitors/[id]/messages` - 메시지 전송

#### 관리자 API
- `GET /api/visitors?deleted=true` - 삭제된 인원 조회
- `GET /api/visitors?updateNonExited=true` - 전날 입실자 처리
- `PATCH /api/visitors/[id]` - 상태 변경 (approve/exit/delete/restore)
- `POST /api/visitors/[id]/messages` - 메시지 전송

### 5. 환경 변수 설정

Vercel 프로젝트에 다음 환경 변수가 자동으로 설정되어야 합니다:

```
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

## 기능 요약

### 공사자 기능
- ✅ 방문 등록 (이름, 소속, 층수, 생년월일, 전화번호)
- ✅ 등록 완료 후 승인 대기 상태 표시
- ✅ 승인 후 "입실 완료" 상태 유지 (세션 저장)
- ✅ 관리자와 실시간 채팅 (1초 새로고침)

### 관리자 기능
- ✅ 오늘의 방문자 목록 조회
- ✅ 날짜별 필터링
- ✅ 검색 (이름, 전화번호, 회사명)
- ✅ 방문자 상태 관리 (승인/퇴실/삭제)
- ✅ 전날 입실자 자동 처리 ("미퇴실" 표시)
- ✅ 삭제 인원 복구
- ✅ 한달치 방문자 엑셀 다운로드
- ✅ 실시간 채팅 (1초 새로고침)
- ✅ 채팅 알림 뱃지 (자동 제거)

## 배포 체크리스트

- [x] Supabase 프로젝트 생성
- [x] 테이블 및 RLS 정책 생성
- [x] @supabase/supabase-js 및 @supabase/ssr 설치
- [x] Supabase 클라이언트/서버 파일 추가
- [x] 모든 API 라우트를 Supabase 연동으로 변경
- [x] 타입 시스템 통합
- [x] 로컬 테스트 완료
- [x] Vercel 배포 완료

## 주의사항

1. **첫 배포 이후**
   - 관리자 페이지 접속 시 초기 비밀번호 설정 필요
   - 공사자 대시보드에서 정보 등록 후 확인

2. **데이터 보존**
   - Supabase 데이터베이스는 영구 저장됨
   - 이전 메모리 저장소의 데이터는 마이그레이션되지 않음

3. **성능**
   - 실시간 채팅: 1초 새로고침
   - 메시지 API 응답: <100ms (예상)
   - 방문자 조회: <200ms (예상)

## 문제 해결

### "등록 정보를 찾을 수 없습니다" 오류
- 공사자가 먼저 등록 정보를 제출했는지 확인
- Supabase 데이터베이스 연결 확인
- 브라우저 콘솔에서 에러 메시지 확인

### 메시지가 전송되지 않음
- 방문자 ID가 올바른지 확인
- Supabase 네트워크 연결 확인
- 메시지 길이가 500자 이하인지 확인

### 관리자 로그인 실패
- 비밀번호 재확인
- 쿠키 활성화 확인
- 브라우저 캐시 초기화

---

**마지막 업데이트**: 2026-07-30
**배포 상태**: ✅ Production
**데이터베이스**: Supabase PostgreSQL
