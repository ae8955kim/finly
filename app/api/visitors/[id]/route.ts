import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// DB의 snake_case 데이터를 프론트엔드용 camelCase 데이터로 변환
function transformVisitor(v: any) {
  if (!v) return null
  return {
    id: String(v.id),
    name: v.name,
    floor: v.floor,
    company: v.company,
    birth: v.birth,
    phone: v.phone,
    status: v.status,
    memo: v.memo ?? '', // 메모 필드
    registeredAt: v.registered_at,
    enteredAt: v.entered_at,
    exitedAt: v.exited_at,
    deletedAt: v.deleted_at,
    isFromPreviousDay: v.is_from_previous_day,
  }
}

// 1. GET /api/visitors/[id] - 특정 방문자 정보 조회
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const supabase = await createClient()
    const { data, error } = await supabase
      .from('visitors')
      .select('*')
      .eq('id', id)
      .single()

    if (error || !data) {
      console.error('[v0] Error fetching visitor:', { id, error: error?.message })
      return NextResponse.json({ error: '방문자를 찾을 수 없습니다.' }, { status: 404 })
    }

    return NextResponse.json({ success: true, data: transformVisitor(data) }, { status: 200 })
  } catch (err) {
    console.error('[v0] GET /api/visitors/[id] error:', err)
    return NextResponse.json({ error: '방문자 조회에 실패했습니다.' }, { status: 500 })
  }
}

// 2. PATCH /api/visitors/[id] - 방문자 상태 변경 및 메모 추가
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { action, memo } = body

    if (!action || !['approve', 'exit', 'delete', 'restore', 'memo'].includes(action)) {
      return NextResponse.json({ error: '유효하지 않은 동작입니다.' }, { status: 400 })
    }

    const supabase = await createClient()

    let updateData: Record<string, any> = {}
    const now = new Date().toISOString()

    if (action === 'approve') {
      updateData = {
        status: 'onsite',
        entered_at: now,
      }
    } else if (action === 'exit') {
      updateData = {
        status: 'exited',
        exited_at: now,
      }
    } else if (action === 'delete') {
      updateData = {
        status: 'deleted',
        deleted_at: now,
      }
    } else if (action === 'restore') {
      updateData = {
        status: 'exited',
        deleted_at: null,
      }
    } else if (action === 'memo') {
      // 전달받은 memo가 null/undefined가 아니면 문자열로 저장
      updateData = {
        memo: memo !== undefined && memo !== null ? String(memo) : '',
      }
    }

    console.log('[v0] PATCH Update Data:', { id, action, updateData })

    const { data, error } = await supabase
      .from('visitors')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('[v0] Supabase Update Error:', {
        id,
        action,
        updateData,
        errorMessage: error.message,
      })
      return NextResponse.json({ success: false, error: `업데이트 실패: ${error.message}` }, { status: 400 })
    }

    if (!data) {
      return NextResponse.json({ success: false, error: '방문자를 찾을 수 없습니다.' }, { status: 404 })
    }

    return NextResponse.json({ success: true, data: transformVisitor(data) }, { status: 200 })
  } catch (err) {
    console.error('[v0] PATCH /api/visitors/[id] error:', err)
    return NextResponse.json({ error: '상태 변경에 실패했습니다.' }, { status: 500 })
  }
}

// 3. DELETE /api/visitors/[id] - 방문자 영구 삭제
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const supabase = await createClient()

    const { error } = await supabase
      .from('visitors')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('[v0] Supabase Delete Error:', { id, errorMessage: error.message })
      return NextResponse.json({ success: false, error: `삭제 실패: ${error.message}` }, { status: 400 })
    }

    return NextResponse.json({ success: true, data: { id, message: '방문자가 삭제되었습니다.' } }, { status: 200 })
  } catch (err) {
    console.error('[v0] DELETE /api/visitors/[id] error:', err)
    return NextResponse.json({ success: false, error: '방문자 삭제에 실패했습니다.' }, { status: 500 })
  }
}