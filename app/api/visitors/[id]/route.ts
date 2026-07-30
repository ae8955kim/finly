import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// Transform snake_case from Supabase to camelCase for frontend
function transformVisitor(v: any) {
  return {
    id: v.id,
    name: v.name,
    floor: v.floor,
    company: v.company,
    birth: v.birth,
    phone: v.phone,
    status: v.status,
    registeredAt: v.registered_at,
    enteredAt: v.entered_at,
    exitedAt: v.exited_at,
    deletedAt: v.deleted_at,
    isFromPreviousDay: v.is_from_previous_day,
  }
}

// GET /api/visitors/[id] - Fetch visitor by ID
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const id = params.id

    if (!id) {
      return NextResponse.json({ error: 'ID가 제공되지 않았습니다.' }, { status: 400 })
    }

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

// PATCH /api/visitors/[id] - Update visitor status (approve/exit/delete/restore)
export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const id = params.id

    if (!id) {
      return NextResponse.json({ error: 'ID가 제공되지 않았습니다.' }, { status: 400 })
    }

    const body = await request.json()
    const { action } = body

    if (!action || !['approve', 'exit', 'delete', 'restore'].includes(action)) {
      return NextResponse.json({ error: '유효하지 않은 동작입니다.' }, { status: 400 })
    }

    const supabase = await createClient()

    let updateData: Record<string, any> = {}
    const now = new Date().toISOString()

    if (action === 'approve') {
      updateData = {
        status: 'pending',
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
        errorDetails: error.details,
        errorCode: error.code,
      })
      return NextResponse.json({ success: false, error: `업데이트 실패: ${error.message}` }, { status: 400 })
    }

    if (!data) {
      console.error('[v0] No data returned after update:', { id, action })
      return NextResponse.json({ success: false, error: '방문자를 찾을 수 없습니다.' }, { status: 404 })
    }

    return NextResponse.json({ success: true, data: transformVisitor(data) }, { status: 200 })
  } catch (err) {
    console.error('[v0] PATCH /api/visitors/[id] error:', err)
    return NextResponse.json({ error: '상태 변경에 실패했습니다.' }, { status: 500 })
  }
}

// DELETE /api/visitors/[id] - Delete visitor (hard delete from database)
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const id = params.id

    if (!id) {
      return NextResponse.json({ error: 'ID가 제공되지 않았습니다.' }, { status: 400 })
    }

    const supabase = await createClient()

    console.log('[v0] DELETE attempting to delete visitor:', { id })

    const { error } = await supabase
      .from('visitors')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('[v0] Supabase Delete Error:', {
        id,
        errorMessage: error.message,
        errorDetails: error.details,
        errorCode: error.code,
      })
      return NextResponse.json({ success: false, error: `삭제 실패: ${error.message}` }, { status: 400 })
    }

    return NextResponse.json({ success: true, data: { id, message: '방문자가 삭제되었습니다.' } }, { status: 200 })
  } catch (err) {
    console.error('[v0] DELETE /api/visitors/[id] error:', err)
    return NextResponse.json({ success: false, error: '방문자 삭제에 실패했습니다.' }, { status: 500 })
  }
}
