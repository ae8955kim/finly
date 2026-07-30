export type ChatSender = "worker" | "admin"

export interface ChatMessage {
  id: string
  visitor_id: string
  sender: ChatSender
  text: string
  created_at: string
}

export interface Visitor {
  id: string
  name: string
  floor: string
  company: string
  birth: string
  phone: string
  status: "pending" | "onsite" | "exited" | "deleted"
  registered_at: string
  entered_at: string | null
  exited_at: string | null
  deleted_at: string | null
  is_from_previous_day: boolean
  created_at: string
}
