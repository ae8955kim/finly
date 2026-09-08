"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"

export function PrivacyConsentModal({
  open,
  onAgree,
}: {
  open: boolean
  onAgree: () => void
}) {
  const [agreed, setAgreed] = useState(false)

  return (
    <Dialog open={open}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto flex flex-col">
        <DialogHeader>
          <DialogTitle>개인정보 수집 및 이용 동의</DialogTitle>
          <DialogDescription>
            방문 등록을 위해 다음 내용을 확인하고 동의해주세요.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto">
          <div className="space-y-6 text-sm text-foreground pr-4">
            {/* 이용 목적 */}
            <section>
              <h3 className="font-semibold mb-2">1. 수집 목적</h3>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                <li>사옥 출입 관리 및 보안</li>
                <li>방문자 현황 파악 및 통보</li>
                <li>비상상황 시 연락처 확보</li>
              </ul>
            </section>

            {/* 수집 항목 */}
            <section>
              <h3 className="font-semibold mb-2">2. 수집 항목</h3>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                <li>이름</li>
                <li>소속 (회사/부서명)</li>
                <li>전화번호</li>
                <li>작업층</li>
              </ul>
            </section>

            {/* 보유 기간 */}
            <section>
              <h3 className="font-semibold mb-2">3. 보유 및 이용 기간</h3>
              <div className="space-y-1 text-muted-foreground"><p>• <strong>기본 보유기간</strong>: 출입 당일 종료 시</p><p>• <strong>법정 보유기간 및 자동 삭제</strong>: 관련 법령 및 방침에 따라 공사 종료 후 3개월까지만 보유하며, 보유 기간 경과 후 자동으로 완전 삭제됩니다.</p></div>
            </section>

            {/* 권리 */}
            <section>
              <h3 className="font-semibold mb-2">4. 귀하의 권리</h3>
              <p className="text-muted-foreground">
                언제든지 개인정보의 열람, 정정, 삭제를 요청할 수 있습니다.
                요청 시 관리자에게 연락하시면 지체 없이 조치하겠습니다.
              </p>
            </section>

            {/* 거부 안내 */}
            <section>
              <h3 className="font-semibold mb-2">5. 동의 거부</h3>
              <p className="text-muted-foreground">
                개인정보 수집에 동의하지 않을 수 있습니다.
                다만, 동의하지 않을 경우 방문 등록이 불가능합니다.
              </p>
            </section>

            {/* 책임자 */}
            <section>
              <h3 className="font-semibold mb-2">6. 개인정보 담당자</h3>
              <p className="text-muted-foreground">
                개인정보 보호 및 고충처리 관련 문의사항은 02-2255-4111 혹은 시스템 내 '관리자 문의하기' 기능을 통해 문의해 주시기 바랍니다.
              </p>
            </section>
          </div>
        </div>

        <div className="flex items-center gap-3 pt-4 border-t">
          <Checkbox
            id="privacy-agree"
            checked={agreed}
            onCheckedChange={(checked) => setAgreed(checked as boolean)}
          />
          <label
            htmlFor="privacy-agree"
            className="text-sm font-medium cursor-pointer flex-1"
          >
            [필수] 개인정보 수집 및 이용에 동의합니다
          </label>
        </div>

        <Button
          onClick={onAgree}
          disabled={!agreed}
          className="w-full"
          size="lg"
        >
          동의하고 진행
        </Button>
      </DialogContent>
    </Dialog>
  )
}
