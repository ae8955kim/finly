"use client"

import { useState } from "react"
import { toast } from "sonner"
import { RotateCcw } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import type { Visitor } from "@/lib/types"
import { supabase } from "@/lib/supabase" // 프로젝트의 Supabase 클라이언트 경로 확인

function formatDate(iso: string | null) {
  if (!iso) return "-"
  return new Date(iso).toLocaleDateString("ko-KR")
}

export function DeletedVisitorsTable({
  visitors,
  onMutate,
}: {
  visitors: Visitor[]
  onMutate: () => void
}) {
  const [pendingId, setPendingId] = useState<string | null>(null)

  async function handleRestore(id: string) {
    setPendingId(id)
    try {
      if (!id) {
        throw new Error("방문자 ID가 없습니다.")
      }

      const { error } = await supabase
        .from("visitors")
        .update({ status: "pending", deleted_at: null })
        .eq("id", id)

      if (error) {
        throw new Error(error.message || "복구에 실패했습니다.")
      }

      toast.success("복구되었습니다.")
      
      if (typeof onMutate === "function") {
        onMutate()
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "오류가 발생했습니다."
      console.error("[v0] Error restoring visitor:", { error: err, errorMessage })
      toast.error(errorMessage)
    } finally {
      setPendingId(null)
    }
  }

  if (visitors.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border py-16 text-center text-sm text-muted-foreground">
        삭제된 인원이 없습니다.
      </div>
    )
  }

  return (
    <div className="overflow-hidden rounded-xl border border-border">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50 hover:bg-muted/50">
            <TableHead>이름</TableHead>
            <TableHead>소속</TableHead>
            <TableHead>작업층</TableHead>
            <TableHead className="hidden lg:table-cell">전화번호</TableHead>
            <TableHead className="text-center">등록일</TableHead>
            <TableHead className="text-center">삭제일</TableHead>
            <TableHead className="text-right">관리</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {visitors.map((v) => {
            const busy = pendingId === v.id
            return (
              <TableRow key={v.id}>
                <TableCell className="font-medium">{v.name ?? "-"}</TableCell>
                <TableCell className="text-muted-foreground">{v.company ?? "-"}</TableCell>
                <TableCell className="text-muted-foreground">{v.floor ?? "-"}</TableCell>
                <TableCell className="hidden font-mono text-xs text-muted-foreground lg:table-cell">
                  {v.phone ?? "-"}
                </TableCell>
                <TableCell className="text-center text-sm text-muted-foreground">
                  {formatDate(v.registeredAt ?? (v as any).created_at ?? null)}
                </TableCell>
                <TableCell className="text-center text-sm text-muted-foreground">
                  {formatDate(v.deletedAt ?? (v as any).deleted_at ?? null)}
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={busy}
                    onClick={() => handleRestore(v.id)}
                  >
                    <RotateCcw className="size-4" />
                    복구
                  </Button>
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </div>
  )
}