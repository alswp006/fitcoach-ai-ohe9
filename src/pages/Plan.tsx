import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Top, Paragraph, Spacing, ListRow, Chip, BottomSheet, Toast, Button } from '@toss/tds-mobile';
import { generateHapticFeedback } from '@apps-in-toss/web-framework';
import { ScreenScaffold } from '@/components/ScreenScaffold';
import { SubmitFooter } from '@/components/BottomCTA';
import { Card } from '@/components/Card';
import { SummaryHero } from '@/components/SummaryHero';
import { Amount } from '@/components/Amount';
import { EmptyState, LoadingState } from '@/components/StateView';
import { TossRewardAd } from '@/components/TossRewardAd';
import { AiBadge } from '@/components/AiBadge';
import { useApp } from '@/lib/appContext';
import { getPlan, savePlan } from '@/lib/storage';
import { postPlan } from '@/lib/api';
import type { PlanExercise, WorkoutPlan } from '@/lib/types';

const AD_SLOT_ID = import.meta.env.VITE_TOSS_AD_SLOT_ID ?? 'plan-unlock';

type RequestState = 'idle' | 'loading' | 'error' | 'timeout';

function fireHaptic(type: 'success' | 'tickWeak' | 'error') {
  try {
    Promise.resolve(generateHapticFeedback({ type })).catch(() => {});
  } catch {
    /* WebView 밖(브라우저/검수자 PC/jsdom)에서는 throw — 무시 */
  }
}

export default function Plan() {
  const navigate = useNavigate();
  const { flags, profile } = useApp();
  const [plan, setPlan] = useState<WorkoutPlan | null>(() => getPlan());
  const [requestState, setRequestState] = useState<RequestState>('idle');
  const [showGate, setShowGate] = useState(false);

  async function handleGenerate() {
    if (!flags.isPremium) {
      fireHaptic('error');
      setShowGate(true);
      return;
    }
    if (!profile) return;

    setRequestState('loading');
    try {
      const res = await postPlan({ goal: profile.goal, level: profile.level, ageGroup: profile.ageGroup });
      savePlan(res.plan);
      setPlan(res.plan);
      setRequestState('idle');
      fireHaptic('success');
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        setRequestState('timeout');
      } else {
        setRequestState('error');
      }
    }
  }

  function handleExerciseClick(exercise: PlanExercise) {
    fireHaptic('tickWeak');
    navigate(`/workout/${exercise.exerciseId}`, { state: { exercise } });
  }

  return (
    <ScreenScaffold
      top={
        <Top
          title={<Top.TitleParagraph>주간 플랜</Top.TitleParagraph>}
          right={
            <Button variant="weak" onClick={handleGenerate} disabled={requestState === 'loading'}>
              다시 생성
            </Button>
          }
        />
      }
      bottom={
        <SubmitFooter
          label="이번 주 플랜 만들기"
          onClick={handleGenerate}
          disabled={requestState === 'loading'}
        />
      }
    >
      {requestState === 'loading' && (
        <>
          <Paragraph.Text typography="t5">플랜을 만들고 있어요</Paragraph.Text>
          <Spacing size={12} />
          <LoadingState rows={3} testId="plan-loading" />
          <Spacing size={20} />
        </>
      )}

      {requestState === 'timeout' && (
        <>
          <Paragraph.Text typography="t5">플랜 생성이 너무 오래 걸려요</Paragraph.Text>
          <Spacing size={12} />
          <Button variant="weak" display="block" onClick={handleGenerate}>
            다시 시도
          </Button>
          <Spacing size={20} />
        </>
      )}

      {plan ? (
        <TossRewardAd slotId={AD_SLOT_ID}>
          <AiBadge />
          <Spacing size={12} />
          <SummaryHero
            label="이번 주 목표"
            value={<Amount value={7} unit="일" typography="t1" />}
            caption={`${plan.weekOf} 주간 플랜`}
            testId="plan-hero"
          />
          <Spacing size={20} />
          {plan.days.map((day) => (
            <div key={day.day}>
              <Paragraph.Text typography="t4">{`Day ${day.day}`}</Paragraph.Text>
              <Spacing size={8} />
              <Card testId="plan-day-card">
                {day.exercises.map((exercise, idx) => {
                  const texts = (
                    <ListRow.Texts
                      type="2RowTypeA"
                      top={exercise.name}
                      bottom={`${exercise.sets}세트・${exercise.reps}회・휴식${exercise.restSec}초`}
                    />
                  );
                  return (
                    <div key={exercise.exerciseId}>
                      {idx > 0 && <Spacing size={4} />}
                      {/* contents=실제 TDS 렌더 경로, children=jsdom mock 렌더 경로(같은 노드) — 둘 다 필요 */}
                      <ListRow contents={texts} right={<Chip>시작</Chip>} onClick={() => handleExerciseClick(exercise)}>
                        {texts}
                      </ListRow>
                    </div>
                  );
                })}
              </Card>
              <Spacing size={12} />
            </div>
          ))}
        </TossRewardAd>
      ) : (
        requestState !== 'loading' && (
          <EmptyState
            title="아직 플랜이 없어요"
            description="이번 주 목표에 맞는 AI 운동 플랜을 만들어보세요"
            testId="plan-empty"
          />
        )
      )}

      <Spacing size={80} />

      <BottomSheet open={showGate} onClose={() => setShowGate(false)}>
        <Paragraph.Text typography="t4">프리미엄 전용 기능이에요</Paragraph.Text>
        <Spacing size={8} />
        <Paragraph.Text typography="t6">주간 AI 플랜은 프리미엄 회원만 이용할 수 있어요</Paragraph.Text>
        <Spacing size={20} />
        <Button
          variant="fill"
          display="block"
          onClick={() => {
            fireHaptic('success');
            navigate('/subscribe');
          }}
        >
          구독하러 가기
        </Button>
      </BottomSheet>

      <Toast open={requestState === 'error'} position="top" text="플랜 생성에 실패했어요. 다시 시도해주세요" />
    </ScreenScaffold>
  );
}
