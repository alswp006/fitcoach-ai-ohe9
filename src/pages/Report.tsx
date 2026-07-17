import { useState } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { Top, Paragraph, Spacing, ListRow, Chip, Toast, Button } from '@toss/tds-mobile';
import { ScreenScaffold } from '@/components/ScreenScaffold';
import { Card } from '@/components/Card';
import { SummaryHero } from '@/components/SummaryHero';
import { CountUp } from '@/components/CountUp';
import { MiniBar } from '@/components/MiniBar';
import { EmptyState, LoadingState } from '@/components/StateView';
import { TossRewardAd } from '@/components/TossRewardAd';
import { AdSlot } from '@/components/AdSlot';
import { AiBadge } from '@/components/AiBadge';
import { getSessionById, updateSession } from '@/lib/sessionStore';
import { postReport } from '@/lib/api';
import { useApp } from '@/lib/appContext';
import type { ReportRouteState, WorkoutSession } from '@/lib/types';

const AD_SLOT_ID = import.meta.env.VITE_TOSS_AD_SLOT_ID ?? 'report-unlock';
const AD_GROUP_ID = import.meta.env.VITE_TOSS_AD_GROUP_ID ?? 'report-banner';

type RequestState = 'idle' | 'loading' | 'error';

export default function Report() {
  const { sessionId = '' } = useParams<{ sessionId: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const { profile } = useApp();

  const routeSession = (location.state as ReportRouteState | undefined)?.session;
  const [session, setSession] = useState<WorkoutSession | null>(
    () => routeSession ?? getSessionById(sessionId),
  );
  const [requestState, setRequestState] = useState<RequestState>('idle');

  if (!session) {
    return (
      <ScreenScaffold top={<Top title={<Top.TitleParagraph>운동 리포트</Top.TitleParagraph>} />}>
        <EmptyState
          title="세션을 찾을 수 없어요"
          testId="report-not-found"
          action={
            <Button variant="weak" onClick={() => navigate('/')}>
              홈으로
            </Button>
          }
        />
      </ScreenScaffold>
    );
  }

  async function handleAnalyze() {
    if (!session) return;
    setRequestState('loading');
    try {
      const { report } = await postReport({
        exerciseId: session.exerciseId,
        completedReps: session.completedReps,
        durationSec: session.durationSec,
        weightKg: profile?.weightKg ?? 65,
      });
      const updated = updateSession(session.sessionId, {
        aiReport: {
          isAiGenerated: true,
          scoreAvg: report.scoreAvg,
          feedback: report.feedback,
          muscleActivation: report.muscleActivation,
        },
      });
      setSession(updated ?? session);
      setRequestState('idle');
    } catch {
      setRequestState('error');
    }
  }

  const durationMin = Math.round(session.durationSec / 60);

  return (
    <ScreenScaffold top={<Top title={<Top.TitleParagraph>운동 리포트</Top.TitleParagraph>} />}>
      <Paragraph.Text typography="t4">{session.exerciseName}</Paragraph.Text>
      <Spacing size={4} />
      <Paragraph.Text typography="st9">
        {`${session.completedReps}회・${durationMin}분・${session.kcal}kcal`}
      </Paragraph.Text>
      <Spacing size={20} />

      {session.aiReport ? (
        <TossRewardAd slotId={AD_SLOT_ID}>
          <AiBadge />
          <Spacing size={12} />
          <Card testId="report-score-card">
            <SummaryHero
              label="자세 점수"
              value={<CountUp value={session.aiReport.scoreAvg} unit="점" typography="t1" />}
              caption="AI가 분석한 이번 세션 자세 점수예요"
            />
          </Card>
          <Spacing size={12} />
          <Card testId="report-muscle-card">
            <Paragraph.Text typography="t5">근육 활성도</Paragraph.Text>
            <Spacing size={12} />
            {session.aiReport.muscleActivation.map((m) => (
              <div key={m.muscle}>
                <Paragraph.Text typography="st9">{`${m.muscle} ${m.percent}%`}</Paragraph.Text>
                <Spacing size={4} />
                <MiniBar ratio={m.percent / 100} />
                <Spacing size={12} />
              </div>
            ))}
          </Card>
          <Spacing size={12} />
          <Paragraph.Text typography="t5">피드백</Paragraph.Text>
          <Spacing size={8} />
          {session.aiReport.feedback.map((f, idx) => {
            const texts = (
              <ListRow.Texts
                type="2RowTypeA"
                top={f.jointLabel}
                bottom={f.message}
              />
            );
            return (
              <div key={idx}>
                {idx > 0 && <Spacing size={4} />}
                <ListRow
                  contents={texts}
                  right={<Chip>{f.severity === 'warn' ? '교정 필요' : '좋아요'}</Chip>}
                >
                  {texts}
                </ListRow>
              </div>
            );
          })}
          <Spacing size={20} />
          <AdSlot adGroupId={AD_GROUP_ID} />
        </TossRewardAd>
      ) : (
        <>
          {requestState === 'loading' && (
            <>
              <Paragraph.Text typography="t5">AI가 자세를 분석하고 있어요</Paragraph.Text>
              <Spacing size={12} />
              <LoadingState rows={3} testId="report-loading" />
              <Spacing size={20} />
            </>
          )}
          {requestState !== 'loading' && (
            <Button variant="fill" display="block" onClick={handleAnalyze}>
              AI 분석 보기
            </Button>
          )}
        </>
      )}

      <Spacing size={80} />

      <Toast open={requestState === 'error'} position="top" text="분석에 실패했어요" />
    </ScreenScaffold>
  );
}
