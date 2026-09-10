export type ChatSender = "worker" | "admin"

export interface ChatMessage {
  id: string
  visitor_id: string
  sender: ChatSender
  text: string
  created_at: string
  is_read?: boolean
  isRead?: boolean
}

export interface Visitor {
  id: string
  name: string
  floor: string
  company: string
  contact_name?: string | null
  contact_company?: string | null
  contactName?: string | null
  contactCompany?: string | null
  birth?: string
  phone?: string
  status: "pending" | "onsite" | "exited" | "deleted"
  registered_at?: string
  entered_at?: string | null
  exited_at?: string | null
  deleted_at?: string | null
  registeredAt?: string
  deletedAt?: string | null
  is_from_previous_day?: boolean
  created_at?: string
  memo?: string | null
  
  // 구버전 및 카멜케이스 호환용
  enteredAt?: string | null
  exitedAt?: string | null
  isFromPreviousDay?: boolean
}
