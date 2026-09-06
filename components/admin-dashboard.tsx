// 엑셀 다운로드 기능 (생년월일 제거 버전)
function downloadExcel() {
  try {
    if (!activeVisitors || activeVisitors.length === 0) {
      toast.error("다운로드할 방문자 데이터가 없습니다.")
      return
    }

    const targetYearMonth = selectedDate.substring(0, 7)

    const monthVisitors = activeVisitors.filter((v) => {
      const regDate = getLocalDateString(v.registeredAt || v.registered_at)
      return regDate.startsWith(targetYearMonth)
    })

    if (monthVisitors.length === 0) {
      toast.error("선택한 월의 방문자 데이터가 없습니다.")
      return
    }

    // '생년월일' 헤더 및 데이터 항목 제거
    const headers = ["이름", "소속", "작업층", "전화번호", "등록시간", "입실시간", "퇴실시간", "상태", "메모"]
    const rows = monthVisitors.map((v) => [
      v.name || "",
      v.company || "",
      v.floor || "",
      v.phone || "",
      v.registeredAt || v.registered_at ? new Date(v.registeredAt || v.registered_at!).toLocaleString("ko-KR", { timeZone: "Asia/Seoul" }) : "-",
      v.enteredAt || v.entered_at ? new Date(v.enteredAt || v.entered_at!).toLocaleString("ko-KR", { timeZone: "Asia/Seoul" }) : "-",
      v.exitedAt || v.exited_at ? new Date(v.exitedAt || v.exited_at!).toLocaleString("ko-KR", { timeZone: "Asia/Seoul" }) : "-",
      v.status === "pending" ? "승인 대기" : v.status === "onsite" ? "재실 중" : "퇴실",
      v.memo || "",
    ])

    const BOM = "\uFEFF"
    const csv = BOM + [headers, ...rows].map((row) => row.map((cell) => `"${cell}"`).join(",")).join("\n")

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
    const link = document.createElement("a")
    const url = URL.createObjectURL(blob)

    link.setAttribute("href", url)
    link.setAttribute("download", `방문자현황_${targetYearMonth}.csv`)
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