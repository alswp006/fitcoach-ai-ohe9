import { useState, type ChangeEvent } from 'react';
import {
  Top,
  Button,
  TextField,
  ListRow,
  Chip,
  BottomSheet,
  Toast,
  Spacing,
  Asset,
  IconButton,
  Paragraph,
} from '@toss/tds-mobile';
import { generateHapticFeedback, setClipboardText } from '@apps-in-toss/web-framework';
import { ScreenScaffold } from '@/components/ScreenScaffold';
import { Card } from '@/components/Card';
import { EmptyState } from '@/components/StateView';
import { getChallenges, saveChallenges } from '@/lib/storage';
import type { Challenge } from '@/lib/types';

const MAX_CHALLENGES = 20;
const INVITE_CODE_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

function generateInviteCode(): string {
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += INVITE_CODE_CHARS[Math.floor(Math.random() * INVITE_CODE_CHARS.length)];
  }
  return code;
}

function fireHaptic(type: 'success' | 'tickWeak') {
  try {
    Promise.resolve(generateHapticFeedback({ type })).catch(() => {});
  } catch {
    /* WebView 밖(브라우저/검수자 PC/jsdom)에서는 throw — 무시 */
  }
}

function validateTitle(value: string): string | null {
  const trimmed = value.trim();
  return trimmed.length < 1 || trimmed.length > 20 ? '제목은 1~20자로 입력해주세요' : null;
}

function validateTarget(value: string): string | null {
  const n = Number(value);
  return !value || Number.isNaN(n) || n < 1 || n > 30
    ? '목표 횟수는 1~30회 사이로 입력해주세요'
    : null;
}

function validateWeeks(value: string): string | null {
  const n = Number(value);
  return !value || Number.isNaN(n) || n < 1 || n > 52 ? '기간은 1~52주 사이로 입력해주세요' : null;
}

export default function ChallengePage() {
  const [challenges, setChallenges] = useState<Challenge[]>(() => getChallenges());
  const [formOpen, setFormOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [target, setTarget] = useState('');
  const [weeks, setWeeks] = useState('');
  const [touched, setTouched] = useState({ title: false, target: false, weeks: false });
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const atCap = challenges.length >= MAX_CHALLENGES;
  const titleError = validateTitle(title);
  const targetError = validateTarget(target);
  const weeksError = validateWeeks(weeks);

  function openForm() {
    if (atCap) return;
    fireHaptic('tickWeak');
    setFormOpen(true);
  }

  function closeForm() {
    setFormOpen(false);
    setTitle('');
    setTarget('');
    setWeeks('');
    setTouched({ title: false, target: false, weeks: false });
  }

  function handleSubmit() {
    setTouched({ title: true, target: true, weeks: true });
    if (titleError || targetError || weeksError) return;

    const now = Date.now();
    const next: Challenge = {
      challengeId: `chal_${now}`,
      title: title.trim(),
      targetSessions: Number(target),
      startAt: now,
      endAt: now + Number(weeks) * WEEK_MS,
      myProgress: 0,
      inviteCode: generateInviteCode(),
    };

    const updated = [...challenges, next];
    saveChallenges(updated);
    setChallenges(updated);
    fireHaptic('success');
    setToastMessage('챌린지를 만들었어요');
    closeForm();
  }

  function handleCopyInvite(code: string) {
    try {
      Promise.resolve(setClipboardText(code)).catch(() => {});
    } catch {
      /* WebView 밖(브라우저/검수자 PC/jsdom)에서는 throw — 무시 */
    }
    fireHaptic('tickWeak');
    setToastMessage('초대코드를 복사했어요');
  }

  return (
    <ScreenScaffold top={<Top title={<Top.TitleParagraph>챌린지</Top.TitleParagraph>} />}>
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <Button variant="weak" onClick={openForm} disabled={atCap}>
          챌린지 만들기
        </Button>
      </div>

      <Spacing size={16} />

      {challenges.length === 0 ? (
        <EmptyState
          icon={<Asset.ContentIcon name="iconStarRegular" alt="챌린지 없음" />}
          title="첫 챌린지를 만들어보세요"
          description="친구와 함께 목표를 달성해보세요"
          testId="challenge-empty"
        />
      ) : (
        <Card testId="challenge-list-card">
          {challenges.map((challenge, idx) => {
            const texts = (
              <ListRow.Texts
                type="2RowTypeA"
                top={challenge.title}
                bottom={
                  <span data-testid="challenge-progress">
                    {`${challenge.myProgress}/${challenge.targetSessions}회`}
                  </span>
                }
              />
            );
            const rightSlot = (
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <Chip onClick={() => handleCopyInvite(challenge.inviteCode)}>
                  {challenge.inviteCode}
                </Chip>
                <IconButton
                  aria-label="초대코드 복사"
                  name="iconCopyRegular"
                  onClick={() => handleCopyInvite(challenge.inviteCode)}
                />
              </div>
            );
            return (
              <div key={challenge.challengeId} data-testid="challenge-row">
                {idx > 0 && <Spacing size={4} />}
                {/* contents/right=실제 TDS 렌더 경로, children=jsdom mock 렌더 경로(같은 노드) — 둘 다 필요 */}
                <ListRow contents={texts} right={rightSlot}>
                  {texts}
                  {rightSlot}
                </ListRow>
              </div>
            );
          })}
        </Card>
      )}

      <Spacing size={80} />

      <BottomSheet open={formOpen} onDimmerClick={closeForm}>
        <Paragraph.Text typography="t4">챌린지 만들기</Paragraph.Text>
        <Spacing size={16} />
        <TextField
          variant="box"
          label="제목"
          placeholder="예: 매일 스쿼트"
          data-testid="challenge-form-title"
          value={title}
          onChange={(e: ChangeEvent<HTMLInputElement>) => setTitle(e.target.value)}
          onBlur={() => setTouched((t) => ({ ...t, title: true }))}
          hasError={touched.title && !!titleError}
          help={touched.title ? (titleError ?? undefined) : undefined}
        />
        <Spacing size={12} />
        <TextField
          variant="box"
          label="목표 횟수"
          placeholder="예: 10"
          inputMode="numeric"
          data-testid="challenge-form-target"
          value={target}
          onChange={(e: ChangeEvent<HTMLInputElement>) => setTarget(e.target.value)}
          onBlur={() => setTouched((t) => ({ ...t, target: true }))}
          hasError={touched.target && !!targetError}
          help={touched.target ? (targetError ?? undefined) : undefined}
        />
        <Spacing size={12} />
        <TextField
          variant="box"
          label="기간(주)"
          placeholder="예: 4"
          inputMode="numeric"
          data-testid="challenge-form-weeks"
          value={weeks}
          onChange={(e: ChangeEvent<HTMLInputElement>) => setWeeks(e.target.value)}
          onBlur={() => setTouched((t) => ({ ...t, weeks: true }))}
          hasError={touched.weeks && !!weeksError}
          help={touched.weeks ? (weeksError ?? undefined) : undefined}
        />
        <Spacing size={24} />
        <Button variant="fill" display="block" onClick={handleSubmit}>
          만들기
        </Button>
        <Spacing size={20} />
      </BottomSheet>

      <Toast open={!!toastMessage} position="top" text={toastMessage ?? ''} />
    </ScreenScaffold>
  );
}
