// 서버 메모리 기반 방문 공사자 저장소 (데모용)
// 실제 배포 시에는 데이터베이스로 교체해야 합니다.

export type VisitorStatus = "pending" | "onsite" | "exited" | "deleted"

export interface Visitor {
  id: string
  name: string
  floor: string
  company: string
  birth: string // YYYY-MM-DD
  phone: string
  status: VisitorStatus
  registeredAt: string // ISO 등록 시각
  enteredAt: string | null // 승인(입실) 시각
  exitedAt: string | null // 퇴실 시각
  deletedAt?: string | null // 삭제된 시각
  isFromPreviousDay?: boolean // 전날 입실인지 여부
}

export type ChatSender = "worker" | "admin"

export interface ChatMessage {
  id: string
  visitorId: string
  sender: ChatSender
  text: string
  at: string // ISO 전송 시각
}

// Next.js dev 환경의 HMR로 모듈이 재평가되어도 데이터가 유지되도록 globalThis에 보관
const globalForStore = globalThis as unknown as {
  __visitorStore?: Visitor[]
  __chatStore?: ChatMessage[]
}

const store: Visitor[] = globalForStore.__visitorStore ?? []
globalForStore.__visitorStore = store

const chatStore: ChatMessage[] = globalForStore.__chatStore ?? []
globalForStore.__chatStore = chatStore

function makeId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}

export function listVisitors(): Visitor[] {
  // 최신 등록순 정렬
  return [...store].sort((a, b) => b.registeredAt.localeCompare(a.registeredAt))
}

export function getVisitor(id: string): Visitor | null {
  return store.find((v) => v.id === id) ?? null
}

export function addVisitor(input: {
  name: string
  floor: string
  company: string
  birth: string
  phone: string
}): Visitor {
  const visitor: Visitor = {
    id: makeId(),
    name: input.name.trim(),
    floor: input.floor.trim(),
    company: input.company.trim(),
    birth: input.birth.trim(),
    phone: input.phone.trim(),
    status: "pending",
    registeredAt: new Date().toISOString(),
    enteredAt: null,
    exitedAt: null,
  }
  store.push(visitor)
  return visitor
}

export function updateVisitorStatus(id: string, action: "approve" | "exit"): Visitor | null {
  const visitor = store.find((v) => v.id === id)
  if (!visitor) return null

  const now = new Date().toISOString()
  if (action === "approve" && visitor.status === "pending") {
    visitor.status = "onsite"
    visitor.enteredAt = now
  } else if (action === "exit" && (visitor.status === "onsite" || visitor.status === "pending")) {
    visitor.status = "exited"
    visitor.exitedAt = now
  }
  return visitor
}

export function listMessages(visitorId: string): ChatMessage[] {
  return chatStore
    .filter((m) => m.visitorId === visitorId)
    .sort((a, b) => a.at.localeCompare(b.at))
}

export function addMessage(visitorId: string, sender: ChatSender, text: string): ChatMessage {
  const message: ChatMessage = {
    id: makeId(),
    visitorId,
    sender,
    text: text.trim(),
    at: new Date().toISOString(),
  }
  chatStore.push(message)
  return message
}

export function deleteVisitor(id: string): Visitor | null {
  const visitor = store.find((v) => v.id === id)
  if (!visitor) return null
  visitor.status = "deleted"
  visitor.deletedAt = new Date().toISOString()
  return visitor
}

export function restoreVisitor(id: string): Visitor | null {
  const visitor = store.find((v) => v.id === id)
  if (!visitor || visitor.status !== "deleted") return null
  visitor.status = "exited"
  visitor.deletedAt = null
  return visitor
}

export function listDeletedVisitors(): Visitor[] {
  return [...store]
    .filter((v) => v.status === "deleted")
    .sort((a, b) => (b.deletedAt || "").localeCompare(a.deletedAt || ""))
}

export function updateNonExitedVisitors(): void {
  const now = new Date()
  const today = now.toISOString().split("T")[0]

  store.forEach((v) => {
    // 입실했지만 퇴실하지 않은 방문자
    if (v.status === "onsite" && v.enteredAt) {
      const enteredDate = v.enteredAt.split("T")[0]
      
      // 입실 날짜가 오늘보다 이전이면 (전날 입실)
      if (enteredDate < today) {
        v.exitedAt = `${enteredDate}T23:59:59Z` // 입실 날짜 자정에 "미퇴실" 표시
        v.isFromPreviousDay = true
      }
    }
  })
}
