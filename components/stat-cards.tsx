import { Users, UserCheck, UserMinus } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import type { Visitor } from "@/lib/types"

export function StatCards({ visitors }: { visitors: Visitor[] }) {
  const total = visitors.length
  const onsite = visitors.filter((v) => v.status === "onsite").length
  const exited = visitors.filter((v) => v.status === "exited").length

  const stats = [
    {
      label: "오늘 방문자",
      value: total,
      icon: Users,
      accent: "bg-primary/10 text-primary",
    },
    {
      label: "현재 잔류자",
      value: onsite,
      icon: UserCheck,
      accent: "bg-chart-2/15 text-chart-2",
    },
    {
      label: "퇴실 완료",
      value: exited,
      icon: UserMinus,
      accent: "bg-muted text-muted-foreground",
    },
  ]

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      {stats.map((s) => (
        <Card key={s.label}>
          <CardContent className="flex items-center gap-4">
            <div className={`flex size-12 shrink-0 items-center justify-center rounded-xl ${s.accent}`}>
              <s.icon className="size-6" />
            </div>
            <div className="flex flex-col">
              <span className="text-sm text-muted-foreground">{s.label}</span>
              <span className="text-3xl font-bold tabular-nums tracking-tight">{s.value}</span>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
