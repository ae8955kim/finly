import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

// Worker: Register new visitor (public)
export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null)
    if (!body) {
      return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 })
    }

    const { name, floor, company, phone } = body
    const fields = { name, floor, company, phone }

    for (const [key, value] of Object.entries(fields)) {
      if (typeof value !== "string" || value.trim() === "") {
        return NextResponse.json({ error: `모든 항목을 입력해주세요. (${key})` }, { status: 400 })
      }
    }

    const supabase = await createClient()
    const { data, error } = await supabase
      .from("visitors")
      .insert([
        {
          name,
          floor,
          company,
          phone,
          status: "pending",
          registered_at: new Date().toISOString(),
        },
      ])
      .select()
      .single()

    if (error) {
      console.error("[v0] Supabase insert error:", {
        message: error.message,
        code: error.code,
        details: error.details,
      })
      return NextResponse.json({ error: "방문자 등록에 실패했습니다." }, { status: 500 })
    }

    return NextResponse.json({ visitor: data }, { status: 201 })
  } catch (err) {
    if (err instanceof Error) {
      console.error("[v0] Error registering visitor:", {
        message: err.message,
        name: err.name,
        stack: err.stack?.split('\n').slice(0, 2).join('\n'),
      })
    } else {
      console.error("[v0] Error registering visitor (unknown error):", err)
    }
    return NextResponse.json({ error: "방문자 등록에 실패했습니다." }, { status: 500 })
  }
}

// Admin: Get visitors list
export async function GET(request: Request) {
  try {
    console.log("[v0] GET /api/visitors - Starting data fetch")
    
    const supabase = await createClient()
    console.log("[v0] Supabase client created successfully")
    
    const url = new URL(request.url)
    const deleted = url.searchParams.get("deleted") === "true"
    const updateNonExited = url.searchParams.get("updateNonExited") === "true"
    console.log("[v0] Query parameters:", { deleted, updateNonExited })

    // Mark visitors from previous days as "미퇴실"
    if (updateNonExited) {
      console.log("[v0] Updating non-exited visitors from previous days")
      const now = new Date()
      const today = (now.toISOString() ?? "").split("T")[0] || ""

      // Get all onsite visitors
      const { data: onsiteVisitors, error: fetchError } = await supabase
        .from("visitors")
        .select("*")
        .eq("status", "onsite")

      if (fetchError) {
        console.error("[v0] Error fetching onsite visitors for update:", {
          message: fetchError.message,
          code: fetchError.code,
        })
      } else {
        console.log("[v0] Fetched onsite visitors count:", onsiteVisitors?.length || 0)
      }

      if (onsiteVisitors) {
        for (const visitor of onsiteVisitors) {
          const enteredAtStr = visitor.entered_at ?? ""
          if (enteredAtStr) {
            const enteredDate = (enteredAtStr ?? "").split("T")[0] || ""
            if (enteredDate && today && enteredDate < today) {
              // Update to mark as non-exited from previous day
              await supabase
                .from("visitors")
                .update({
                  exited_at: `${enteredDate}T23:59:59Z`,
                  is_from_previous_day: true,
                })
                .eq("id", visitor.id)
            }
          }
        }
      }
    }

    let query = supabase.from("visitors").select("*")

    if (deleted) {
      query = query.eq("status", "deleted").order("deleted_at", { ascending: false })
    } else {
      query = query
        .neq("status", "deleted")
        .order("registered_at", { ascending: false })
    }

    console.log("[v0] Executing query to fetch visitors")
    const { data, error } = await query

    if (error) {
      console.error("[v0] Supabase select error - visitors table query failed:", {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint,
      })
      return NextResponse.json({ error: "데이터를 불러오지 못했습니다." }, { status: 500 })
    }

    console.log("[v0] Successfully fetched visitors:", {
      count: data?.length || 0,
      hasData: !!data,
    })

    // Transform Supabase data with full fields (including memo & snake_case/camelCase compatibility)
    const transformedVisitors = (data || []).map((v: any) => ({
      id: String(v.id),
      name: v.name,
      floor: v.floor,
      company: v.company,
      birth: v.birth,
      phone: v.phone,
      status: v.status,
      memo: v.memo || "", // 👈 메모 필드 추가!
      
      // camelCase 호환용
      registeredAt: v.registered_at,
      enteredAt: v.entered_at,
      exitedAt: v.exited_at,
      deletedAt: v.deleted_at,
      isFromPreviousDay: v.is_from_previous_day,

      // snake_case 호환용
      registered_at: v.registered_at,
      entered_at: v.entered_at,
      exited_at: v.exited_at,
      deleted_at: v.deleted_at,
      is_from_previous_day: v.is_from_previous_day,
      created_at: v.created_at,
    }))

    return NextResponse.json({ visitors: transformedVisitors })
  } catch (err) {
    if (err instanceof Error) {
      console.error("[v0] Error fetching visitors (exception):", {
        message: err.message,
        name: err.name,
        stack: err.stack?.split('\n').slice(0, 3).join('\n'),
      })
    } else {
      console.error("[v0] Error fetching visitors (unknown error):", err)
    }
    return NextResponse.json({ error: "데이터를 불러오지 못했습니다." }, { status: 500 })
  }
}
