"use client"

import { useRef, useState } from "react"
import { Check, ChevronDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"

export const FLOOR_OPTIONS = [
  ...Array.from({ length: 8 }, (_, index) => `지하 ${8 - index}층`),
  ...[1, 2, 3, 5, 6, 7, 8, 9, 10, 11, 12].map((floor) => `${floor}층`),
  ...Array.from({ length: 29 }, (_, index) => `${index + 14}층`),
  "P1층",
  "P2층",
]

function parseFloors(value: string) { return value.split(",").map((item) => item.trim()).filter(Boolean) }

export function FloorPicker({ value, onChange, label = "작업층 확인" }: { value: string; onChange: (value: string) => void; label?: string }) {
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState<string[]>(parseFloors(value))
  const dragging = useRef(false)
  function toggle(floor: string) { setDraft((current) => current.includes(floor) ? current.filter((item) => item !== floor) : [...current, floor]) }
  return <>
    <Button type="button" variant="outline" onClick={() => { setDraft(parseFloors(value)); setOpen(true) }} className="w-full justify-between"><span className="truncate text-left">{value || label}</span><ChevronDown className="size-4 shrink-0" /></Button>
    <Dialog open={open} onOpenChange={setOpen}><DialogContent className="max-h-[85vh] max-w-lg overflow-y-auto"><DialogHeader><DialogTitle>{label}</DialogTitle></DialogHeader><p className="text-sm text-muted-foreground">층을 누르거나 손가락으로 드래그해 여러 층을 선택하세요.</p><div className="grid grid-cols-4 gap-2 select-none touch-none" onPointerUp={() => { dragging.current = false }} onPointerCancel={() => { dragging.current = false }}>{FLOOR_OPTIONS.map((floor) => { const selected = draft.includes(floor); return <button key={floor} type="button" onPointerDown={() => { dragging.current = true; toggle(floor) }} onPointerEnter={() => { if (dragging.current && !draft.includes(floor)) toggle(floor) }} className={`min-h-11 rounded-lg border px-1 text-sm font-semibold transition-colors ${selected ? "border-primary bg-primary text-primary-foreground" : "border-border bg-background hover:bg-muted"}`}><span className="flex items-center justify-center gap-1">{selected && <Check className="size-3.5" />}{floor}</span></button> })}</div><DialogFooter><Button type="button" onClick={() => { onChange(draft.join(", ")); setOpen(false) }}>선택 완료 ({draft.length})</Button></DialogFooter></DialogContent></Dialog>
  </>
}

export function FloorBadges({ value }: { value: string }) { return <div className="flex flex-wrap gap-1">{parseFloors(value).map((floor) => <span key={floor} className="rounded-md bg-primary/15 px-2 py-1 text-xs font-semibold text-primary">{floor}</span>)}</div> }
