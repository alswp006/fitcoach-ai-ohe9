import { useState, type ReactNode } from 'react';
import { flushSync } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { BottomSheet, Button, Paragraph, Spacing } from '@toss/tds-mobile';
import { generateHapticFeedback } from '@apps-in-toss/web-framework';
import { useApp } from '@/lib/appContext';

const FREE_EXERCISE_IDS = ['ex_squat', 'ex_pushup', 'ex_plank'];

function fireHaptic(type: 'success' | 'tickWeak') {
  try {
    Promise.resolve(generateHapticFeedback({ type })).catch(() => {});
  } catch {
    /* WebView 밖(브라우저/검수자 PC/jsdom)에서는 throw — 무시 */
  }
}

export interface PremiumGateProps {
  exerciseId: string;
  children: ReactNode;
}

/**
 * 프리미엄 게이트 — 무료 3종(ex_squat/ex_pushup/ex_plank) 또는 프리미엄 유저는 children 그대로.
 * 그 외는 잠금 트리거 + 구독 유도 BottomSheet(확인 시 /subscribe 이동).
 * Pre-built (재구현 금지): 운동 상세/시작 화면에서 exerciseId별 접근 제어에 사용.
 */
export function PremiumGate({ exerciseId, children }: PremiumGateProps) {
  const { flags } = useApp();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  if (flags.isPremium || FREE_EXERCISE_IDS.includes(exerciseId)) {
    return <>{children}</>;
  }

  return (
    <>
      <button
        type="button"
        data-testid="premium-gate-locked"
        onClick={() => flushSync(() => setOpen(true))}
        style={{
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-start',
          gap: 4,
          padding: 16,
          borderRadius: 16,
          border: 'none',
          textAlign: 'left',
          backgroundColor: 'var(--adaptiveLayeredBackground)',
        }}
      >
        <Paragraph.Text typography="st3">프리미엄 운동이에요</Paragraph.Text>
        <Paragraph.Text typography="st9">
          구독하면 전체 운동과 AI 개인화 플랜을 이용할 수 있어요
        </Paragraph.Text>
      </button>

      <BottomSheet open={open} onClose={() => setOpen(false)}>
        <BottomSheet.Header>프리미엄 구독</BottomSheet.Header>
        <Paragraph.Text typography="st5">
          전체 운동 라이브러리와 실시간 자세 피드백, AI 개인화 플랜은 구독 후 이용할 수 있어요.
        </Paragraph.Text>
        <Spacing size={16} />
        <Button
          variant="fill"
          display="block"
          onClick={() => {
            fireHaptic('success');
            setOpen(false);
            navigate('/subscribe');
          }}
        >
          구독하고 전체 이용하기
        </Button>
      </BottomSheet>
    </>
  );
}
