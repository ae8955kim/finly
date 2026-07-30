import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * UTC 타임스탬프를 로컬 타임존의 날짜 문자열(YYYY-MM-DD)로 변환
 * DB에서는 UTC로 저장되지만, 사용자 로컬 시간으로 표시하기 위함
 */
export function getLocalDateString(isoString: string | null | undefined): string {
  if (!isoString) return ""
  try {
    const date = new Date(isoString)
    // 로컬 타임존으로 변환하여 YYYY-MM-DD 형식 반환
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  } catch {
    return ""
  }
}

/**
 * 현재 로컬 시간의 날짜 문자열(YYYY-MM-DD) 반환
 */
export function getTodayString(): string {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}
