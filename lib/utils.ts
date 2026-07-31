import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * UTC 타임스탬프 또는 Date 객체를 한국 표준시(KST) 기준 날짜 문자열(YYYY-MM-DD)로 변환
 */
export function getLocalDateString(isoString: string | Date | null | undefined): string {
  if (!isoString) return ""
  try {
    const date = typeof isoString === "string" ? new Date(isoString) : isoString
    
    // 유효하지 않은 Date 객체 체크
    if (isNaN(date.getTime())) return ""

    // 서버/클라이언트 환경 모두에서 한국 시간(Asia/Seoul) 기준 YYYY-MM-DD 추출
    const formatter = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Seoul",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    })
    return formatter.format(date) // "YYYY-MM-DD"
  } catch {
    return ""
  }
}

/**
 * 현재 한국 시간(KST) 기준 오늘 날짜 문자열(YYYY-MM-DD) 반환
 */
export function getTodayString(): string {
  return getLocalDateString(new Date())
}