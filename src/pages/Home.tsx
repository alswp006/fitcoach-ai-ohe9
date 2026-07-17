import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Top, Paragraph, Spacing, ListRow, Button, Asset } from '@toss/tds-mobile';
import { ScreenScaffold } from '@/components/ScreenScaffold';
import { SummaryHero } from '@/components/SummaryHero';
import { Card } from '@/components/Card';
import { CountUp } from '@/components/CountUp';
import { Amount } from '@/components/Amount';
import { Sparkline } from '@/components/Sparkline';
import { EmptyState } from '@/components/StateView';
import { AdSlot } from '@/components/AdSlot';
import { FloatingTabBar } from '@/components/FloatingTabBar';
import { getSessions } from '@/lib/sessionStore';

const AD_GROUP_ID = import.meta.env.VITE_TOSS_AD_GROUP_ID ?? 'home-banner';
const PAGE_SIZE = 20;
const DAY_MS = 24 * 60 * 60 * 1000;

const TAB_ITEMS = [
  { label: '홈', path: '/' },
  { label: '플랜', path: '/plan' },
  { label: '챌린지', path: '/challenge' },
  { label: '구독', path: '/subscribe' },
];

function last7DayCounts(sessions: { startedAt: number }[]): number[] {
  const now = Date.now();
  const counts = Array.from({ length: 7 }, () => 0);
  for (const session of sessions) {
    const daysAgo = Math.floor((now - session.startedAt) / DAY_MS);
    if (daysAgo >= 0 && daysAgo < 7) {
      counts[6 - daysAgo] += 1;
    }
  }
  return counts;
}

export default function Home() {
  const navigate = useNavigate();
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const sessions = getSessions();
  const now = Date.now();
  const weeklyCount = sessions.filter((s) => now - s.startedAt < 7 * DAY_MS).length;
  const totalKcal = sessions.reduce((sum, s) => sum + s.kcal, 0);
  const visibleSessions = sessions.slice(0, visibleCount);

  return (
    <ScreenScaffold
      top={<Top title={<Top.TitleParagraph>FitCoach AI</Top.TitleParagraph>} />}
      bottom={<FloatingTabBar items={TAB_ITEMS} />}
    >
      <SummaryHero
        label="이번 주 운동"
        value={<CountUp value={weeklyCount} unit="회" typography="t1" testId="weekly-summary-count" />}
        caption={<Amount value={totalKcal} unit="kcal 누적" typography="t6" />}
        action={
          <Button variant="fill" display="block" onClick={() => navigate('/workout/ex_squat')}>
            운동 시작
          </Button>
        }
        testId="weekly-summary-hero"
      />

      <Spacing size={20} />

      <Card testId="weekly-trend">
        <Paragraph.Text typography="t6">최근 7일 추이</Paragraph.Text>
        <Spacing size={8} />
        <Sparkline data={last7DayCounts(sessions)} testId="weekly-trend-sparkline" />
      </Card>

      <Spacing size={20} />
      <AdSlot adGroupId={AD_GROUP_ID} />
      <Spacing size={20} />

      {sessions.length === 0 ? (
        <EmptyState
          icon={<Asset.ContentIcon name="icon-star-mono" alt="세션 없음" />}
          title="첫 운동을 시작해보세요"
          description="오늘의 운동을 기록하고 리포트를 받아보세요"
          action={
            <Button variant="weak" onClick={() => navigate('/workout/ex_squat')}>
              운동 시작
            </Button>
          }
          testId="home-empty"
        />
      ) : (
        <>
          <Card testId="recent-sessions-card">
            {visibleSessions.map((session, idx) => {
              const texts = (
                <ListRow.Texts
                  type="2RowTypeA"
                  top={session.exerciseName}
                  bottom={`${session.completedReps}회・${session.kcal}kcal`}
                />
              );
              return (
                <div key={session.sessionId}>
                  {idx > 0 && <Spacing size={4} />}
                  <ListRow contents={texts} onClick={() => navigate(`/report/${session.sessionId}`)}>
                    {texts}
                  </ListRow>
                </div>
              );
            })}
          </Card>
          {sessions.length > visibleCount && (
            <>
              <Spacing size={12} />
              <Button variant="weak" display="block" onClick={() => setVisibleCount((c) => c + PAGE_SIZE)}>
                더 보기
              </Button>
            </>
          )}
        </>
      )}

      <Spacing size={24} />
    </ScreenScaffold>
  );
}
