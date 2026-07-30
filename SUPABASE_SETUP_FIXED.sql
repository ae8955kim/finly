-- ============================================================================
-- Supabase 테이블 생성 SQL (수정 버전)
-- ============================================================================
-- 이 SQL을 Supabase SQL Editor에서 실행하세요
-- 에러가 나면 한 섹션씩 나누어서 실행하세요

-- ============================================================================
-- 1. 방문자 정보 테이블 생성
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

-- ============================================================================
-- 2. 채팅 메시지 테이블 생성
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  visitor_id UUID NOT NULL REFERENCES public.visitors(id) ON DELETE CASCADE,
  sender TEXT NOT NULL CHECK (sender IN ('worker', 'admin')),
  text TEXT NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- ============================================================================
-- 3. 감사 로그 테이블 생성
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action TEXT NOT NULL,
  table_name TEXT NOT NULL,
  record_id UUID,
  ip_address TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- ============================================================================
-- 4. 인덱스 생성
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_visitors_status ON public.visitors(status);
CREATE INDEX IF NOT EXISTS idx_visitors_registered_at ON public.visitors(registered_at);
CREATE INDEX IF NOT EXISTS idx_visitors_entered_at ON public.visitors(entered_at);
CREATE INDEX IF NOT EXISTS idx_visitors_phone ON public.visitors(phone);
CREATE INDEX IF NOT EXISTS idx_chat_messages_visitor_id ON public.chat_messages(visitor_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_created_at ON public.chat_messages(created_at);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_audit_logs_table_name ON public.audit_logs(table_name);

-- ============================================================================
-- 5. RLS (Row Level Security) 활성화
-- ============================================================================
ALTER TABLE public.visitors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 6. RLS 정책 생성 (기존 정책 삭제 후 재생성)
-- ============================================================================

-- Visitors 테이블 정책
DROP POLICY IF EXISTS "Allow reading visitors" ON public.visitors;
CREATE POLICY "Allow reading visitors" ON public.visitors FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow inserting visitors" ON public.visitors;
CREATE POLICY "Allow inserting visitors" ON public.visitors FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Allow updating visitors" ON public.visitors;
CREATE POLICY "Allow updating visitors" ON public.visitors FOR UPDATE USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow deleting visitors" ON public.visitors;
CREATE POLICY "Allow deleting visitors" ON public.visitors FOR DELETE USING (true);

-- Chat messages 테이블 정책
DROP POLICY IF EXISTS "Allow reading messages" ON public.chat_messages;
CREATE POLICY "Allow reading messages" ON public.chat_messages FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow inserting messages" ON public.chat_messages;
CREATE POLICY "Allow inserting messages" ON public.chat_messages FOR INSERT WITH CHECK (true);

-- Audit logs 테이블 정책
DROP POLICY IF EXISTS "Allow reading audit logs" ON public.audit_logs;
CREATE POLICY "Allow reading audit logs" ON public.audit_logs FOR SELECT USING (true);

-- ============================================================================
-- 7. Timestamp 업데이트 함수 및 트리거
-- ============================================================================
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

-- ============================================================================
-- 완료!
-- ============================================================================
-- 위 SQL이 모두 실행되면 모든 테이블이 생성됩니다.
-- Supabase Table Editor에서 다음 3개 테이블 확인:
-- 1. visitors
-- 2. chat_messages
-- 3. audit_logs
