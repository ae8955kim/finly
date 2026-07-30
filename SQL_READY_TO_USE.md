# Supabase SQL - 즉시 실행 가능

## 한 줄 요약

프로젝트 폴더의 `SUPABASE_FINAL_SCHEMA.sql` 파일을 열어서 전체 내용을 복사하고 Supabase SQL Editor에 붙여넣고 Run 클릭하면 모든 테이블이 생성됩니다.

---

## 현재 코드에서 사용하는 데이터 필드

### Visitors 테이블 (14개 컬럼)

**사용자 입력 필드 (5개):**
- name - 방문자 이름
- floor - 작업층
- company - 소속
- birth - 생년월일 (YYYY-MM-DD)
- phone - 전화번호

**시스템 관리 필드 (9개):**
- id - UUID (자동 생성)
- status - 상태 (pending/onsite/exited/deleted)
- registered_at - 등록 시간
- entered_at - 입실 시간
- exited_at - 퇴실 시간
- deleted_at - 삭제 시간
- is_from_previous_day - 전날 입실 여부
- created_at - 생성 시간
- updated_at - 수정 시간

### Chat_messages 테이블 (6개 컬럼)

- id - UUID
- visitor_id - 방문자 ID (외래키)
- sender - 'worker' 또는 'admin'
- text - 메시지 내용
- created_at - 생성 시간
- updated_at - 수정 시간

### Audit_logs 테이블 (6개 컬럼)

- id - UUID
- action - 작업 종류
- table_name - 테이블명
- record_id - 대상 레코드 ID
- ip_address - IP 주소
- created_at - 생성 시간

---

## SQL 파일 위치

프로젝트 루트/SUPABASE_FINAL_SCHEMA.sql

---

## 실행 방법 (3단계)

1. 프로젝트 폴더 → SUPABASE_FINAL_SCHEMA.sql 열기
2. 전체 내용 복사 (Ctrl+A → Ctrl+C)
3. Supabase 대시보드 → SQL Editor → New Query → 붙여넣기 → Run

---

## 실행 후 확인

Supabase Table Editor에서 확인:
- visitors (14개 컬럼)
- chat_messages (6개 컬럼)  
- audit_logs (6개 컬럼)

