import { Building2 } from "lucide-react"
import { WorkerApp } from "@/components/worker-app"

export default function WorkerDashboard() {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col px-4 py-8">
      <header className="mb-8 flex flex-col items-center gap-3 text-center">
        <div className="flex size-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
          <Building2 className="size-7" />
        </div>
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-bold tracking-tight text-balance">사옥 방문 등록</h1>
          <p className="text-sm text-muted-foreground leading-relaxed text-pretty">
            공사 작업을 위해 방문하신 분은 아래 정보를 입력해 주세요.
          </p>
        </div>
      </header>

      <WorkerApp />
    </main>
  )
}
