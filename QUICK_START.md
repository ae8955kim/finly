# 빠른 시작 가이드

## 배포된 시스템 접근

### 1. 공사자 대시보드
```
URL: https://v0-project-sable-rho.vercel.app/worker
기능: 방문 등록, 승인 대기, 채팅
```

**사용 흐름:**
1. 방문자 정보 입력
2. 개인정보 수집 동의 (필수)
3. 방문 등록 완료
4. 승인 대기 (관리자 승인 대기 화면)
5. 승인 후 입실 상태 표시
6. 관리자와 실시간 채팅

### 2. 관리자 대시보드
```
URL: https://v0-project-sable-rho.vercel.app/admin
기능: 방문자 관리, 승인/종료, 채팅, 엑셀 다운로드
```

**로그인:**
- 초기 비밀번호: (설정 필요)
- 환경 변수에서 `ADMIN_PASSWORD` 설정

**관리 기능:**
- ✅ 방문자 승인 (입실 처리)
- ✅ 퇴실 처리
- ✅ 목록에서 삭제
- ✅ 삭제된 인원 복구
- ✅ 한달치 데이터 엑셀 다운로드
- ✅ 실시간 채팅

---

## 환경 변수 설정 (Vercel)

1. Vercel 대시보드 접속
2. `v0-project` 프로젝트 선택
3. `Settings` → `Environment Variables` 클릭
4. 다음 변수 추가:

```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
ADMIN_PASSWORD=your_secure_password
```

### Supabase 정보 얻기
1. Supabase 대시보드 접속
2. 프로젝트 선택
3. `Settings` → `API` 클릭
4. `Project URL` 복사 → `NEXT_PUBLIC_SUPABASE_URL`
5. `anon` 키 복사 → `NEXT_PUBLIC_SUPABASE_ANON_KEY`

---

## 회사 계정으로 이전하기 (간단함)

**이전 절차:**
1. 새 회사 Supabase 계정 생성
2. 동일한 스키마(visitors, chat_messages 테이블) 생성
3. Vercel 환경 변수 업데이트:
   - `NEXT_PUBLIC_SUPABASE_URL` = 새 URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = 새 키
4. 배포 자동 완료 (코드 수정 불필요)

**주의:** 이전 Supabase 계정의 데이터는 보존 필요시 백업 필수

---

## 주요 기능

### 1. 개인정보 동의
- ✅ 공사자가 처음 등록 시 개인정보 수집 동의 필수
- ✅ 모달에서 약관 확인 가능
- ✅ 동의 전 등록 불가능

### 2. 실시간 채팅
- ✅ 공사자 ↔ 관리자 1:1 채팅
- ✅ 1초 주기 실시간 업데이트
- ✅ 새 메시지 알림 뱃지 표시

### 3. 출입 관리
- ✅ 미승인 → 승인 (입실)
- ✅ 입실 → 퇴실
- ✅ 목록 삭제 (감시에서 제외)

### 4. 전날 입실자 관리
- ✅ 하루 이상 입실한 공사자 자동 처리
- ✅ 입실 시간: "전 날 입실" 표시
- ✅ 퇴실 시간: "미퇴실" 표시
- ✅ 다음날 새로고침 시 자동 반영

### 5. 데이터 분석
- ✅ 한달치 방문자 데이터 엑셀 다운로드
- ✅ CSV 형식 (Excel에서 한글 정상 표시)
- ✅ 오늘 방문자 수, 현재 잔류자, 퇴실 완료 통계

---

## 보안 기능

### 1. 접근 제어
- ✅ 관리자 인증 (비밀번호 기반)
- ✅ 공사자는 본인 정보만 조회 가능

### 2. 데이터 보호
- ✅ 모든 데이터 암호화 저장 (Supabase)
- ✅ HTTPS 암호화 전송 (Vercel)
- ✅ RLS 정책으로 DB 레이어 보안

### 3. 감사 로그
- ✅ 모든 데이터 접근 이력 기록
- ✅ 법적 분쟁 시 증거자료 사용 가능

---

## 트러블슈팅

### 문제: 관리자 로그인 실패
**해결:**
1. 비밀번호 정확한지 확인
2. Vercel 환경 변수 설정 확인
3. 브라우저 쿠키 삭제 후 재시도

### 문제: 공사자 등록 불가
**해결:**
1. 개인정보 동의 체크 확인
2. 필수 입력 항목 확인
3. 브라우저 개발자 도구 (F12) 콘솔 확인

### 문제: 채팅 메시지 안 보임
**해결:**
1. 새로고침 (F5) 실행
2. 인터넷 연결 확인
3. Supabase 상태 확인 (supabase.com/status)

---

## 연락처

**기술 지원:**
- Vercel 지원: https://vercel.com/help
- Supabase 지원: https://supabase.com/support
- 프로젝트 소유자: [이메일 또는 연락처]

---

**최종 업데이트**: 2024년 12월
**버전**: 1.0.0
**상태**: 프로덕션 운영 중
