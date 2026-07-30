-- ============================================================================
-- Supabase 최종 테이블 스키마 (코드 기준)
-- ============================================================================
-- 이 SQL을 Supabase SQL Editor에 붙여넣고 Run 버튼 클릭하면 완료

-- ============================================================================
-- 1. VISITORS 테이블 - 방문자 정보
-- ============================================================================
-- 사용자 입력 필드: name, floor, company, birth, phone
-- 시스템 필드: status, registered_at, entered_at, exited_at, deleted_at, is_from_previous_day

CREATE TABLE IF NOT EXISTS public.visitors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- 사용자 입력 필드
  name TEXT NOT NULL,
  floor TEXT NOT NULL,
  company TEXT NOT NULL,
  birth TEXT NOT NULL,
  phone TEXT NOT NULL,
  
  -- 상태 및 타임스탬프
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'onsite', 'exited', 'deleted')),
  registered_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  entered_at TIMESTAMP WITH TIME ZONE,
  exited_at TIMESTAMP WITH TIME ZONE,
  deleted_at TIMESTAMP WITH TIME ZONE,
  is_from_previous_day BOOLEAN DEFAULT false,
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- ============================================================================
-- 2. CHAT_MESSAGES 테이블 - 양방향 채팅
-- ============================================================================
-- visitor_id로 visitors 테이블과 관계 연결
-- sender: 'worker' (공사자) 또는 'admin' (관리자)

CREATE TABLE IF NOT EXISTS public.chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  visitor_id UUID NOT NULL REFERENCES public.visitors(id) ON DELETE CASCADE,
  sender TEXT NOT NULL CHECK (sender IN ('worker', 'admin')),
  text TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- ============================================================================
-- 3. AUDIT_LOGS 테이블 - 감시 로그
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
-- 인덱스 생성 (성능 최적화)
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_visitors_status ON public.visitors(status);
CREATE INDEX IF NOT EXISTS idx_visitors_registered_at ON public.visitors(registered_at DESC);
CREATE INDEX IF NOT EXISTS idx_visitors_entered_at ON public.visitors(entered_at DESC);
CREATE INDEX IF NOT EXISTS idx_visitors_phone ON public.visitors(phone);
CREATE INDEX IF NOT EXISTS idx_chat_messages_visitor_id ON public.chat_messages(visitor_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_created_at ON public.chat_messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs(created_at DESC);

-- ============================================================================
-- RLS (Row Level Security) 활성화
-- ============================================================================
ALTER TABLE public.visitors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- RLS 정책 설정 (모든 접근 허용 - API 레이어에서 인증 처리)
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
-- Timestamp 자동 업데이트 함수 및 트리거
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
-- 완료
-- ============================================================================
-- 모든 테이블이 생성되었습니다.
-- Supabase Table Editor에서 다음 확인:
-- 1. visitors (10개 컬럼)
-- 2. chat_messages (5개 컬럼)
-- 3. audit_logs (5개 컬럼)
