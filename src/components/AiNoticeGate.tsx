import { AlertDialog } from '@toss/tds-mobile';
import { useApp } from '@/lib/appContext';

/**
 * 생성형 AI 고지 의무 — 최초 진입 시(flags.aiNoticeConfirmed=false) 1회 AlertDialog.
 * 확인/닫기 모두 confirmAiNotice()를 호출해 flags를 영구 저장한다(재노출 방지할 다른 수단이 없음).
 * Pre-built (재구현 금지): AI 결과물을 노출하는 페이지 최상위에 그대로 배치.
 */
export function AiNoticeGate() {
  const { flags, confirmAiNotice } = useApp();

  return (
    <AlertDialog
      open={!flags.aiNoticeConfirmed}
      title="AI 활용 안내"
      description="이 서비스는 생성형 AI를 활용해요. AI 결과는 참고용이에요."
      alertButton={
        <AlertDialog.AlertButton onClick={confirmAiNotice}>확인</AlertDialog.AlertButton>
      }
      onClose={confirmAiNotice}
    />
  );
}
