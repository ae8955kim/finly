-- ============================================================================
-- Supabase 테이블 생성 SQL 쿼리
-- ============================================================================
-- 이 SQL을 Supabase SQL Editor에서 실행하세요
-- 위치: Supabase 대시보드 → SQL Editor → "New Query" → 아래 코드 붙여넣기 → Run

-- ============================================================================
-- 1. 방문자 정보 테이블
-- ============================================================================
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

-- 테이블 설명 추가
COMMENT ON TABLE public.visitors IS '방문자 출입 관리 테이블';
COMMENT ON COLUMN public.visitors.id IS '고유 ID (UUID)';
COMMENT ON COLUMN public.visitors.name IS '방문자 이름';
COMMENT ON COLUMN public.visitors.floor IS '작업층 (예: 5층, 지하 2층)';
COMMENT ON COLUMN public.visitors.company IS '소속 회사명';
COMMENT ON COLUMN public.visitors.birth IS '생년월일 (YYYY-MM-DD)';
COMMENT ON COLUMN public.visitors.phone IS '전화번호';
COMMENT ON COLUMN public.visitors.status IS '상태 (pending: 승인대기, onsite: 입실, exited: 퇴실, deleted: 삭제)';
COMMENT ON COLUMN public.visitors.registered_at IS '등록 시간';
COMMENT ON COLUMN public.visitors.entered_at IS '입실 시간';
COMMENT ON COLUMN public.visitors.exited_at IS '퇴실 시간';
COMMENT ON COLUMN public.visitors.deleted_at IS '삭제 시간';
COMMENT ON COLUMN public.visitors.is_from_previous_day IS '전날 입실 여부';

-- 인덱스 생성 (쿼리 성능 향상)
CREATE INDEX IF NOT EXISTS idx_visitors_status ON public.visitors(status);
CREATE INDEX IF NOT EXISTS idx_visitors_registered_at ON public.visitors(registered_at);
CREATE INDEX IF NOT EXISTS idx_visitors_entered_at ON public.visitors(entered_at);
CREATE INDEX IF NOT EXISTS idx_visitors_phone ON public.visitors(phone);

-- RLS (Row Level Security) 활성화
ALTER TABLE public.visitors ENABLE ROW LEVEL SECURITY;

-- RLS 정책: 모든 읽기 허용 (API 레이어에서 인증 처리)
CREATE POLICY IF NOT EXISTS "Allow reading visitors" ON public.visitors 
  FOR SELECT USING (true);

-- RLS 정책: 모든 삽입 허용 (API 레이어에서 검증)
CREATE POLICY IF NOT EXISTS "Allow inserting visitors" ON public.visitors 
  FOR INSERT WITH CHECK (true);

-- RLS 정책: 모든 업데이트 허용 (API 레이어에서 인증 처리)
CREATE POLICY IF NOT EXISTS "Allow updating visitors" ON public.visitors 
  FOR UPDATE USING (true) WITH CHECK (true);

-- RLS 정책: 모든 삭제 허용 (API 레이어에서 인증 처리)
CREATE POLICY IF NOT EXISTS "Allow deleting visitors" ON public.visitors 
  FOR DELETE USING (true);

-- ============================================================================
-- 2. 채팅 메시지 테이블
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  visitor_id UUID NOT NULL REFERENCES public.visitors(id) ON DELETE CASCADE,
  sender TEXT NOT NULL CHECK (sender IN ('worker', 'admin')),
  text TEXT NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 테이블 설명 추가
COMMENT ON TABLE public.chat_messages IS '양방향 채팅 메시지 저장';
COMMENT ON COLUMN public.chat_messages.id IS '메시지 고유 ID';
COMMENT ON COLUMN public.chat_messages.visitor_id IS '방문자 ID (외래키)';
COMMENT ON COLUMN public.chat_messages.sender IS '발신자 (worker: 공사자, admin: 관리자)';
COMMENT ON COLUMN public.chat_messages.text IS '메시지 내용';
COMMENT ON COLUMN public.chat_messages.created_at IS '메시지 생성 시간';

-- 인덱스 생성 (성능 향상)
CREATE INDEX IF NOT EXISTS idx_chat_messages_visitor_id ON public.chat_messages(visitor_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_created_at ON public.chat_messages(created_at);

-- RLS 활성화
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

-- RLS 정책: 모든 읽기 허용
CREATE POLICY IF NOT EXISTS "Allow reading messages" ON public.chat_messages 
  FOR SELECT USING (true);

-- RLS 정책: 모든 삽입 허용
CREATE POLICY IF NOT EXISTS "Allow inserting messages" ON public.chat_messages 
  FOR INSERT WITH CHECK (true);

-- ============================================================================
-- 3. 감사 로그 테이블 (데이터 접근 이력)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action TEXT NOT NULL,
  table_name TEXT NOT NULL,
  record_id UUID,
  ip_address TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 테이블 설명 추가
COMMENT ON TABLE public.audit_logs IS '데이터 접근 이력 추적';
COMMENT ON COLUMN public.audit_logs.action IS '수행된 작업 (SELECT, INSERT, UPDATE, DELETE)';
COMMENT ON COLUMN public.audit_logs.table_name IS '대상 테이블명';
COMMENT ON COLUMN public.audit_logs.record_id IS '대상 레코드 ID';
COMMENT ON COLUMN public.audit_logs.ip_address IS '접근 IP 주소';

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_audit_logs_table_name ON public.audit_logs(table_name);

-- RLS 활성화
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- RLS 정책: 감사 로그 읽기 허용
CREATE POLICY IF NOT EXISTS "Allow reading audit logs" ON public.audit_logs 
  FOR SELECT USING (true);

-- ============================================================================
-- 4. 트리거 함수: 자동 timestamp 업데이트
-- ============================================================================
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Visitors 테이블에 트리거 생성
DROP TRIGGER IF EXISTS update_visitors_updated_at ON public.visitors;
CREATE TRIGGER update_visitors_updated_at
  BEFORE UPDATE ON public.visitors
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Chat messages 테이블에 트리거 생성
DROP TRIGGER IF EXISTS update_chat_messages_updated_at ON public.chat_messages;
CREATE TRIGGER update_chat_messages_updated_at
  BEFORE UPDATE ON public.chat_messages
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================================
-- 5. 검증 쿼리 (생성 확인용)
-- ============================================================================
-- 생성된 테이블 확인
SELECT 
  table_name,
  (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema='public' AND information_schema.columns.table_name=t.table_name) as column_count
FROM information_schema.tables t
WHERE table_schema='public' AND table_type='BASE TABLE'
ORDER BY table_name;

-- 생성된 인덱스 확인
SELECT indexname, tablename FROM pg_indexes WHERE schemaname = 'public' ORDER BY tablename, indexname;

-- ============================================================================
-- 완료 메시지
-- ============================================================================
-- 위 SQL이 모두 실행되면 다음 메시지가 표시됩니다:
-- ✅ 모든 테이블 생성 완료
-- ✅ RLS 정책 설정 완료
-- ✅ 인덱스 생성 완료
-- ✅ 트리거 생성 완료

