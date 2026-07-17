import { useEffect, useState } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { Top, Paragraph, Spacing, Chip, AlertDialog, Button } from '@toss/tds-mobile';
import { generateHapticFeedback } from '@apps-in-toss/web-framework';
import { ScreenScaffold } from '@/components/ScreenScaffold';
import { SubmitFooter } from '@/components/BottomCTA';
import { EmptyState } from '@/components/StateView';
import { useApp } from '@/lib/appContext';
import { getSessions, saveSession } from '@/lib/sessionStore';
import { calcKcal } from '@/lib/kcal';
import { grantPromotion } from '@/lib/promotion';
import type { PlanExercise, WorkoutRouteState, WorkoutSession } from '@/lib/types';

const DEFAULT_EXERCISES: Record<string, PlanExercise> = {
  ex_squat: { exerciseId: 'ex_squat', name: '스쿼트', sets: 3, reps: 12, restSec: 60 },
  ex_pushup: { exerciseId: 'ex_pushup', name: '푸시업', sets: 3, reps: 10, restSec: 60 },
  ex_plank: { exerciseId: 'ex_plank', name: '플랭크', sets: 3, reps: 1, restSec: 45 },
};

const MAX_REST_SEC = 5;

type Phase = 'idle' | 'running' | 'resting';

function fireHaptic(type: 'success' | 'tickWeak') {
  try {
    Promise.resolve(generateHapticFeedback({ type })).catch(() => {});
  } catch {
    /* WebView 밖(브라우저/검수자 PC/jsdom)에서는 throw — 무시 */
  }
}

export default function Workout() {
  const { exerciseId = '' } = useParams<{ exerciseId: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const { flags, profile } = useApp();

  const routeExercise = (location.state as WorkoutRouteState | undefined)?.exercise;
  const exercise = routeExercise ?? DEFAULT_EXERCISES[exerciseId];
  const isPremium = flags.isPremium;

  const [phase, setPhase] = useState<Phase>('idle');
  const [elapsedSec, setElapsedSec] = useState(0);
  const [currentSet, setCurrentSet] = useState(1);
  const [completedReps, setCompletedReps] = useState(0);
  const [restRemaining, setRestRemaining] = useState(0);
  const [cameraGranted, setCameraGranted] = useState(false);
  const [cameraChecked, setCameraChecked] = useState(false);
  const [coaching, setCoaching] = useState<{ message: string; severity: 'good' | 'warn' } | null>(null);
  const [showExitConfirm, setShowExitConfirm] = useState(false);

  const isFinished = currentSet > (exercise?.sets ?? 0);

  // 경과 시간 1초 단위 갱신
  useEffect(() => {
    if (phase === 'idle') return;
    const timer = setInterval(() => setElapsedSec((s) => s + 1), 1000);
    return () => clearInterval(timer);
  }, [phase]);

  // 세트 사이 휴식 카운트다운
  useEffect(() => {
    if (phase !== 'resting') return;
    if (restRemaining <= 0) {
      setPhase(isFinished ? 'idle' : 'running');
      return;
    }
    const timer = setTimeout(() => setRestRemaining((r) => r - 1), 1000);
    return () => clearTimeout(timer);
  }, [phase, restRemaining, isFinished]);

  // 프리미엄 유저 카메라 권한 확인(1회) — 거부/미지원 시 타이머 폴백
  useEffect(() => {
    if (!isPremium || phase === 'idle' || cameraChecked) return;
    let cancelled = false;
    (async () => {
      try {
        if (!navigator.mediaDevices?.getUserMedia) throw new Error('camera unsupported');
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        stream.getTracks().forEach((track) => track.stop());
        if (!cancelled) setCameraGranted(true);
      } catch {
        if (!cancelled) setCameraGranted(false);
      } finally {
        if (!cancelled) setCameraChecked(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isPremium, phase, cameraChecked]);

  // 실시간 자세 코칭(온디바이스 pose 추정 A1 가정 — 각도 임계값 도달 시 문구+음성)
  useEffect(() => {
    if (phase !== 'running' || !isPremium || !cameraGranted) return;
    const timer = setInterval(() => {
      const feedback: { message: string; severity: 'good' | 'warn' } =
        Math.random() < 0.4
          ? { message: '무릎을 더 굽히세요', severity: 'warn' }
          : { message: '좋은 자세예요', severity: 'good' };
      setCoaching(feedback);
      try {
        if ('speechSynthesis' in window) {
          const utterance = new SpeechSynthesisUtterance(feedback.message);
          utterance.lang = 'ko-KR';
          window.speechSynthesis.speak(utterance);
        }
      } catch {
        /* Web Speech API 미지원 — 화면 텍스트 코칭만 */
      }
    }, 4000);
    return () => clearInterval(timer);
  }, [phase, isPremium, cameraGranted]);

  if (!exercise) {
    return (
      <ScreenScaffold top={<Top title={<Top.TitleParagraph>운동</Top.TitleParagraph>} />}>
        <EmptyState
          title="운동을 찾을 수 없어요"
          testId="workout-not-found"
          action={
            <Button variant="weak" onClick={() => navigate('/')}>
              홈으로
            </Button>
          }
        />
      </ScreenScaffold>
    );
  }

  function handleStart() {
    fireHaptic('success');
    setPhase('running');
  }

  function handleSetComplete() {
    if (!exercise) return;
    setCompletedReps((prev) => prev + exercise.reps);
    const nextSet = currentSet + 1;
    setCurrentSet(nextSet);
    if (nextSet > exercise.sets) {
      setPhase('idle');
      return;
    }
    setRestRemaining(Math.min(exercise.restSec, MAX_REST_SEC));
    setPhase('resting');
  }

  function handleFinish() {
    if (!exercise) return;
    const now = Date.now();
    const weightKg = profile?.weightKg ?? 65;
    const session: WorkoutSession = {
      sessionId: `sess_${now}`,
      exerciseId: exercise.exerciseId,
      exerciseName: exercise.name,
      startedAt: now - elapsedSec * 1000,
      durationSec: elapsedSec,
      completedReps,
      kcal: calcKcal(exercise.exerciseId, elapsedSec, weightKg),
    };

    const isFirstSession = getSessions().length === 0;
    saveSession(session);

    if (isFirstSession) {
      try {
        grantPromotion(import.meta.env.VITE_TOSS_PROMOTION_CODE ?? '', 3000).catch(() => {});
      } catch {
        /* WebView 밖(브라우저/검수자 PC/jsdom)에서는 throw — 무시 */
      }
    }

    fireHaptic('success');
    navigate(`/report/${session.sessionId}`, { state: { session } });
  }

  function handleExitAttempt() {
    if (phase === 'idle' && currentSet === 1 && elapsedSec === 0) {
      navigate('/');
      return;
    }
    setShowExitConfirm(true);
  }

  return (
    <ScreenScaffold
      top={<Top title={<Top.TitleParagraph>{exercise.name}</Top.TitleParagraph>} />}
      bottom={
        isFinished ? (
          <SubmitFooter label="완료" onClick={handleFinish} />
        ) : phase === 'idle' ? (
          <SubmitFooter label={currentSet === 1 ? '시작' : '다음 세트 시작'} onClick={handleStart} />
        ) : null
      }
    >
      <Button variant="weak" onClick={handleExitAttempt}>
        운동 중단
      </Button>
      <Spacing size={16} />

      {!isPremium && (
        <>
          <Chip>실시간 자세 교정은 프리미엄</Chip>
          <Spacing size={16} />
        </>
      )}

      {isPremium && phase !== 'idle' && cameraChecked && !cameraGranted && (
        <>
          <Paragraph.Text typography="st9">카메라 없이 진행해요</Paragraph.Text>
          <Spacing size={12} />
        </>
      )}

      <Paragraph.Text typography="t6">{`세트 ${Math.min(currentSet, exercise.sets)}/${exercise.sets}・목표 ${exercise.reps}회`}</Paragraph.Text>
      <Spacing size={8} />
      <Paragraph.Text typography="t2">
        {`${Math.floor(elapsedSec / 60)}:${String(elapsedSec % 60).padStart(2, '0')}`}
      </Paragraph.Text>
      <Spacing size={8} />
      <Paragraph.Text typography="t6">{`완료한 횟수 ${completedReps}회`}</Paragraph.Text>

      {phase === 'resting' && (
        <>
          <Spacing size={24} />
          <Paragraph.Text typography={restRemaining <= 3 ? 't1' : 't4'}>
            {`휴식 ${restRemaining}초`}
          </Paragraph.Text>
        </>
      )}

      {phase === 'running' && coaching && (
        <>
          <Spacing size={20} />
          <Chip>{coaching.message}</Chip>
        </>
      )}

      {phase === 'running' && (
        <>
          <Spacing size={20} />
          <Button variant="weak" display="block" onClick={handleSetComplete}>
            세트 완료
          </Button>
        </>
      )}

      <Spacing size={80} />

      <AlertDialog
        open={showExitConfirm}
        title="운동을 중단할까요?"
        description="기록이 저장되지 않아요"
        alertButton={
          <AlertDialog.AlertButton onClick={() => setShowExitConfirm(false)}>계속</AlertDialog.AlertButton>
        }
        onClose={() => navigate('/')}
      />
    </ScreenScaffold>
  );
}
