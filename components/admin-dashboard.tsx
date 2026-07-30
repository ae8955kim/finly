"use client"

import { useState } from "react"
import useSWR from "swr"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Building2, LogOut, RefreshCw, Search, X, ChevronDown, Download } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { StatCards } from "@/components/stat-cards"
import { VisitorTable } from "@/components/visitor-table"
import { DeletedVisitorsTable } from "@/components/deleted-visitors-table"
import type { Visitor } from "@/lib/types"

const fetcher = async (url: string) => {
  try {
    const res = await fetch(url)
    
    if (!res.ok) {
      let errorMessage = "데이터를 불러오지 못했습니다."
      
      if (res.status === 404) {
        errorMessage = "요청한 데이터를 찾을 수 없습니다."
      } else if (res.status === 400) {
        errorMessage = "잘못된 요청입니다."
      } else if (res.status >= 500) {
        errorMessage = "서버 오류가 발생했습니다."
      }
      
      try {
        const errData = await res.json()
        if (errData.error) {
          errorMessage = errData.error
        }
      } catch {
        // JSON 파싱 실패 시 기본 메시지 사용
      }
      
      console.error("[v0] API error:", { status: res.status, message: errorMessage, url })
      throw new Error(errorMessage)
    }
    
    try {
      return await res.json()
    } catch {
      console.error("[v0] JSON parsing failed:", { url })
      throw new Error("응답 데이터를 처리할 수 없습니다.")
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "네트워크 오류가 발생했습니다."
    console.error("[v0] Fetcher error:", { message, url })
    throw err
  }
}

export function AdminDashboard() {
  const router = useRouter()
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedDate, setSelectedDate] = useState<string>(
    (new Date().toISOString() ?? "").split("T")[0]
  )
  const [expandDeleted, setExpandDeleted] = useState(false)

  // Fetch all visitors (non-deleted) - includes call to mark non-exited visitors
  const { data, error, isLoading, mutate } = useSWR<{ visitors: Visitor[] }>(
    "/api/visitors?updateNonExited=true",
    fetcher,
    { 
      refreshInterval: 5000,
      shouldRetryOnError: true,
      errorRetryCount: 2,
      errorRetryInterval: 3000,
      fallbackData: { visitors: [] },
    },
  )

  // Fetch deleted visitors
  const { data: deletedData } = useSWR<{ visitors: Visitor[] }>(
    "/api/visitors?deleted=true",
    fetcher,
    { 
      refreshInterval: 5000,
      shouldRetryOnError: true,
      errorRetryCount: 2,
      errorRetryInterval: 3000,
      fallbackData: { visitors: [] },
    },
  )

  // 에러 발생 시에도 빈 배열로 처리
  const activeVisitors = (data?.visitors ?? []).filter((v) => v.status !== "deleted")
  const deletedVisitors = deletedData?.visitors ?? []
  
  // Filter active visitors by search query
  const filtered = activeVisitors.filter((v) => {
    const query = searchQuery.toLowerCase()
    return (
      (v.name ?? "").toLowerCase().includes(query) ||
      (v.phone ?? "").includes(query) ||
      (v.company ?? "").toLowerCase().includes(query)
    )
  })

  // Filter by date for current visitors
  const visitors = filtered.filter((v) => {
    const regDate = (v.registeredAt ?? "").split("T")[0]
    return regDate === selectedDate
  })

  // Export to Excel function
  function downloadExcel() {
    try {
      if (!activeVisitors || activeVisitors.length === 0) {
        toast.error("다운로드할 방문자 데이터가 없습니다.")
        return
      }

      // Get all visitors for the month
      const startDate = new Date(selectedDate)
      startDate.setDate(1)
      const endDate = new Date(startDate)
      endDate.setMonth(endDate.getMonth() + 1)
      endDate.setDate(0)

      const monthVisitors = activeVisitors.filter((v) => {
        try {
          const dateStr = v.registeredAt ?? ""
          if (!dateStr) return false
          const regDate = new Date(dateStr)
          return regDate >= startDate && regDate <= endDate
        } catch {
          console.error("[v0] Invalid date in visitor:", v.id)
          return false
        }
      })

      if (monthVisitors.length === 0) {
        toast.error("선택한 월의 방문자 데이터가 없습니다.")
        return
      }

      // Create CSV content
      const headers = ["이름", "소속", "작업층", "생년월일", "전화번호", "등록시간", "입실시간", "퇴실시간", "상태"]
      const rows = monthVisitors.map((v) => [
        v.name || "",
        v.company || "",
        v.floor || "",
        v.birth || "",
        v.phone || "",
        v.registeredAt ? new Date(v.registeredAt).toLocaleString("ko-KR") : "-",
        v.enteredAt ? new Date(v.enteredAt).toLocaleString("ko-KR") : "-",
        v.exitedAt ? new Date(v.exitedAt).toLocaleString("ko-KR") : "-",
        v.status === "pending" ? "승인 대기" : v.status === "onsite" ? "재실 중" : "퀴실",
      ])

      // Add BOM for UTF-8 encoding in Excel
      const BOM = "\uFEFF"
      const csv = BOM + [headers, ...rows].map((row) => row.map((cell) => `"${cell}"`).join(",")).join("\n")

      // Create blob and download
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
      const link = document.createElement("a")
      const url = URL.createObjectURL(blob)

      const monthYear = startDate.toLocaleString("ko-KR", { year: "numeric", month: "2-digit" }).replace(" ", "")
      link.setAttribute("href", url)
      link.setAttribute("download", `방문자현황_${monthYear}.csv`)
      link.style.visibility = "hidden"

      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)

      toast.success("엑셀 파일이 다운로드되었습니다.")
    } catch (err) {
      const message = err instanceof Error ? err.message : "다운로드에 실패했습니다."
      toast.error(message)
      console.error("[v0] Download error:", err)
    }
  }

  async function handleLogout() {
    try {
      const res = await fetch("/api/admin/login", { method: "DELETE" })
      
      if (!res.ok) {
        console.warn("[v0] Logout API returned non-ok status:", res.status)
      }
      
      toast.success("로그아웃되었습니다.")
      router.refresh()
    } catch (err) {
      console.error("[v0] Logout error:", err)
      toast.error("로그아웃 중 오류가 발생했습니다.")
    }
  }

  return (
    <main className="w-full min-h-screen bg-background">
      <div className="mx-auto w-full px-4 py-8 sm:px-6">
        <header className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex size-11 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <Building2 className="size-6" />
            </div>
            <div className="flex flex-col">
              <h1 className="text-xl font-bold tracking-tight">방문 공사자 관리</h1>
              <p className="text-sm text-muted-foreground">실시간 출입 현황 대시보드</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => mutate()}>
              <RefreshCw className="size-4" />
              새로고침
            </Button>
            <Button variant="ghost" size="sm" onClick={handleLogout}>
              <LogOut className="size-4" />
              로그아웃
            </Button>
          </div>
        </header>

        <div className="flex flex-col gap-6">
          <StatCards visitors={activeVisitors} />

          <section className="flex flex-col gap-4">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="flex flex-col gap-2">
                <label htmlFor="date" className="text-sm font-medium">
                  날짜 선택
                </label>
                <input
                  id="date"
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="rounded-lg border border-border px-3 py-2 text-sm"
                />
              </div>

              <div className="relative flex-1 md:max-w-sm">
                <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="이름, 전화번호, 회사명 검색..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 pr-10"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    aria-label="검색 초기화"
                  >
                    <X className="size-4" />
                  </button>
                )}
              </div>

              <Button variant="outline" size="sm" onClick={downloadExcel}>
                <Download className="size-4" />
                엑셀 다운로드
              </Button>
            </div>

            {error ? (
              <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
                데이��를 불러오지 못했습니다. 새로고침을 눌러 다시 시도해 주세요.
              </div>
            ) : isLoading ? (
              <div className="rounded-xl border border-border py-16 text-center text-sm text-muted-foreground">
                불러오는 중...
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <h2 className="text-base font-semibold">
                    {selectedDate === new Date().toISOString().split("T")[0] ? "오늘의 방문자" : "선택된 날짜의 방문자"}
                  </h2>
                  <span className="text-xs text-muted-foreground">
                    {searchQuery ? `검색결과: ${visitors.length}명` : `총 ${visitors.length}명`}
                  </span>
                </div>
                <VisitorTable visitors={visitors} onMutate={() => mutate()} />
              </>
            )}
          </section>

          {/* Collapsed Section: Deleted Visitors */}
          <section className="flex flex-col gap-4">
            <button
              onClick={() => setExpandDeleted(!expandDeleted)}
              className="flex items-center justify-between rounded-lg border border-border p-4 hover:bg-muted/50 transition-colors"
            >
              <h3 className="text-sm font-semibold flex items-center gap-2">
                <ChevronDown
                  className={`size-4 transition-transform ${expandDeleted ? "rotate-180" : ""}`}
                />
                삭제된 인원 목록 ({deletedVisitors.length}명)
              </h3>
            </button>

            {expandDeleted && (
              <div className="flex flex-col gap-4">
                {deletedVisitors.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-border py-16 text-center text-sm text-muted-foreground">
                    삭제된 인원이 없습니다.
                  </div>
                ) : (
                  <DeletedVisitorsTable visitors={deletedVisitors} onMutate={() => {
                    mutate()
                  }} />
                )}
              </div>
            )}
          </section>
        </div>
      </div>
    </main>
  )
}
