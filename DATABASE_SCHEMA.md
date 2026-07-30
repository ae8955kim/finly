# Supabase 데이터베이스 스키마 (현재 코드 기준)

## 📊 Visitors 테이블

### 테이블명
`public.visitors`

### 모든 필드 및 데이터 타입

| 필드명 | 데이터 타입 | 필수 | 기본값 | 설명 |
|--------|-----------|------|--------|------|
| **id** | UUID | Yes | gen_random_uuid() | 고유 ID (자동 생성) |
| **name** | TEXT | Yes | - | 방문자 이름 (사용자 입력) |
| **floor** | TEXT | Yes | - | 작업층 (사용자 입력) |
| **company** | TEXT | Yes | - | 소속 회사 (사용자 입력) |
| **birth** | TEXT | Yes | - | 생년월일 YYYY-MM-DD (사용자 입력) |
| **phone** | TEXT | Yes | - | 전화번호 (사용자 입력) |
| **status** | TEXT | Yes | 'pending' | 상태: pending, onsite, exited, deleted |
| **registered_at** | TIMESTAMP TZ | Yes | now() | 방문 등록 시간 |
| **entered_at** | TIMESTAMP TZ | No | NULL | 입실 시간 |
| **exited_at** | TIMESTAMP TZ | No | NULL | 퇴실 시간 |
| **deleted_at** | TIMESTAMP TZ | No | NULL | 목록 삭제 시간 |
| **is_from_previous_day** | BOOLEAN | No | false | 전날 입실 여부 |
| **created_at** | TIMESTAMP TZ | Yes | now() | 레코드 생성 시간 |
| **updated_at** | TIMESTAMP TZ | No | now() | 레코드 수정 시간 |

### Status 상태 값

| 값 | 의미 | 전환 가능한 상태 |
|----|------|-----------------|
| **pending** | 승인 대기 | → onsite (승인) |
| **onsite** | 입실 (건설장 내) | → exited (퇴실) / → deleted (삭제) |
| **exited** | 퇴실 (건설장 퇴출) | - |
| **deleted** | 삭제 (목록에서 제외) | - |

### 데이터 흐름

```
1. 공사자 등록 (POST /api/visitors)
   → name, floor, company, birth, phone 입력
   → status = 'pending' (자동)
   → registered_at = 현재시간 (자동)

2. 관리자 승인 (PATCH /api/visitors/[id])
   → status = 'onsite'
   → entered_at = 현재시간

3. 퇴실 처리 (PATCH /api/visitors/[id])
   → status = 'exited'
   → exited_at = 현재시간

4. 목록 삭제 (PATCH /api/visitors/[id])
   → status = 'deleted'
   → deleted_at = 현재시간
```

---

## 💬 Chat_messages 테이블

### 테이블명
`public.chat_messages`

### 모든 필드 및 데이터 타입

| 필드명 | 데이터 타입 | 필수 | 기본값 | 설명 |
|--------|-----------|------|--------|------|
| **id** | UUID | Yes | gen_random_uuid() | 메시지 고유 ID |
| **visitor_id** | UUID | Yes | - | 참조: visitors(id) |
| **sender** | TEXT | Yes | - | 발신자: 'worker' 또는 'admin' |
| **text** | TEXT | Yes | - | 메시지 내용 (최대 500자) |
| **created_at** | TIMESTAMP TZ | Yes | now() | 메시지 생성 시간 |
| **updated_at** | TIMESTAMP TZ | No | now() | 메시지 수정 시간 |

### Sender 값

- `'worker'` - 공사자가 보낸 메시지
- `'admin'` - 관리자가 보낸 메시지

### 외래키 관계

- `visitor_id` → `visitors.id` (ON DELETE CASCADE)
- 방문자가 삭제되면 해당 메시지도 자동 삭제

---

## 📝 Audit_logs 테이블

### 테이블명
`public.audit_logs`

### 모든 필드 및 데이터 타입

| 필드명 | 데이터 타입 | 필수 | 기본값 | 설명 |
|--------|-----------|------|--------|------|
| **id** | UUID | Yes | gen_random_uuid() | 로그 고유 ID |
| **action** | TEXT | Yes | - | 작업: SELECT, INSERT, UPDATE, DELETE |
| **table_name** | TEXT | Yes | - | 대상 테이블명 |
| **record_id** | UUID | No | NULL | 대상 레코드 ID |
| **ip_address** | TEXT | No | NULL | 접근 IP 주소 |
| **created_at** | TIMESTAMP TZ | Yes | now() | 로그 생성 시간 |

---

## 🔑 인덱스

생성되는 인덱스:

```sql
idx_visitors_status                    -- 상태별 조회 성능
idx_visitors_registered_at             -- 등록 시간 정렬
idx_visitors_entered_at                -- 입실 시간 정렬
idx_visitors_phone                     -- 전화번호 검색
idx_chat_messages_visitor_id           -- 방문자별 메시지 조회
idx_chat_messages_created_at           -- 메시지 시간 정렬
idx_audit_logs_created_at              -- 로그 시간 정렬
```

---

## 🔒 RLS (Row Level Security) 정책

모든 테이블에 RLS 활성화:

**Visitors 테이블**
- SELECT: 모두 허용
- INSERT: 모두 허용 (API 인증 처리)
- UPDATE: 모두 허용 (API 인증 처리)
- DELETE: 모두 허용 (API 인증 처리)

**Chat_messages 테이블**
- SELECT: 모두 허용
- INSERT: 모두 허용 (API 인증 처리)

**Audit_logs 테이블**
- SELECT: 모두 허용

---

## 📌 SQL 실행

### 준비된 SQL 파일

**SUPABASE_FINAL_SCHEMA.sql** - 모든 테이블과 정책 포함

### 실행 방법

1. Supabase 대시보드 접속
2. SQL Editor → New Query
3. SUPABASE_FINAL_SCHEMA.sql 전체 복사
4. 붙여넣기 → Run

### 확인

SQL 실행 후 Table Editor에서:
- visitors (14개 컬럼)
- chat_messages (6개 컬럼)
- audit_logs (6개 컬럼)

---

## 📊 데이터 예시

### Visitors 테이블 예시

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "name": "홍길동",
  "floor": "5층",
  "company": "한국건설",
  "birth": "1990-05-15",
  "phone": "010-1234-5678",
  "status": "onsite",
  "registered_at": "2024-12-19T10:30:00Z",
  "entered_at": "2024-12-19T10:45:00Z",
  "exited_at": null,
  "deleted_at": null,
  "is_from_previous_day": false,
  "created_at": "2024-12-19T10:30:00Z",
  "updated_at": "2024-12-19T10:45:00Z"
}
```

### Chat_messages 테이블 예시

```json
{
  "id": "660e8400-e29b-41d4-a716-446655440000",
  "visitor_id": "550e8400-e29b-41d4-a716-446655440000",
  "sender": "worker",
  "text": "안녕하세요, 5층에서 작업 중입니다.",
  "created_at": "2024-12-19T10:50:00Z",
  "updated_at": "2024-12-19T10:50:00Z"
}
```

