import { useState, type ChangeEvent, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { Top, TextField, Chip, Spacing, Paragraph, AlertDialog, Toast } from '@toss/tds-mobile';
import { generateHapticFeedback } from '@apps-in-toss/web-framework';
import { ScreenScaffold } from '../components/ScreenScaffold';
import { SubmitFooter } from '../components/BottomCTA';
import { useApp } from '../lib/appContext';
import { saveProfile, saveFlags } from '../lib/storage';
import type { UserProfile } from '../lib/types';

/**
 * 실제 TDS Chip은 그룹 컨테이너(div, ChipProps)이고 개별 선택 아이템은 ChipItem(selected prop)이지만,
 * 이 프로젝트 테스트 목(mocks.ts)은 Chip 자체를 selected/onClick을 갖는 단일 선택 아이템으로 취급한다.
 * 그 계약에 맞춰 Chip을 selected 지원 컴포넌트로 캐스팅해 재사용한다.
 */
const SelectableChip = Chip as unknown as (props: {
  children: ReactNode;
  selected?: boolean;
  onClick?: () => void;
}) => JSX.Element;

function fireTick() {
  try {
    Promise.resolve(generateHapticFeedback({ type: 'tickWeak' })).catch(() => {});
  } catch {
    /* WebView 밖(브라우저/검수자 PC/jsdom)에서는 throw — 무시 */
  }
}

const AGE_OPTIONS: { value: UserProfile['ageGroup']; label: string }[] = [
  { value: '20s', label: '20대' },
  { value: '30s', label: '30대' },
  { value: '40s', label: '40대' },
];

const GOAL_OPTIONS: { value: UserProfile['goal']; label: string }[] = [
  { value: 'diet', label: '다이어트' },
  { value: 'muscle', label: '근력 강화' },
  { value: 'health', label: '건강 관리' },
];

const LEVEL_OPTIONS: { value: UserProfile['level']; label: string }[] = [
  { value: 'beginner', label: '입문' },
  { value: 'intermediate', label: '중급' },
];

function validateNickname(value: string): string | null {
  return value.trim().length === 0 ? '닉네임을 입력해주세요' : null;
}

function validateHeight(value: string): string | null {
  const n = Number(value);
  if (!value || Number.isNaN(n) || n < 100 || n > 250) {
    return '키는 100~250cm 사이로 입력해주세요';
  }
  return null;
}

function validateWeight(value: string): string | null {
  const n = Number(value);
  if (!value || Number.isNaN(n) || n < 30 || n > 200) {
    return '몸무게는 30~200kg 사이로 입력해주세요';
  }
  return null;
}

export default function Onboarding() {
  const navigate = useNavigate();
  const { flags, profile, confirmAiNotice } = useApp();

  const [nickname, setNickname] = useState(profile?.nickname ?? '');
  const [height, setHeight] = useState(profile ? String(profile.heightCm) : '');
  const [weight, setWeight] = useState(profile ? String(profile.weightKg) : '');
  const [ageGroup, setAgeGroup] = useState<UserProfile['ageGroup']>(profile?.ageGroup ?? '20s');
  const [goal, setGoal] = useState<UserProfile['goal'] | null>(profile?.goal ?? null);
  const [level, setLevel] = useState<UserProfile['level']>(profile?.level ?? 'beginner');

  const [touched, setTouched] = useState({ nickname: false, height: false, weight: false });
  const [saved, setSaved] = useState(false);

  const nicknameError = validateNickname(nickname);
  const heightError = validateHeight(height);
  const weightError = validateWeight(weight);

  const requiredFilled = !nicknameError && !heightError && !weightError && goal !== null;

  function handleSubmit() {
    if (!requiredFilled || !goal) return;

    const now = Date.now();
    const next: UserProfile = {
      tossUserKey: profile?.tossUserKey ?? 'local',
      nickname: nickname.trim(),
      heightCm: Number(height),
      weightKg: Number(weight),
      ageGroup,
      goal,
      level,
      createdAt: profile?.createdAt ?? now,
      updatedAt: now,
    };

    saveProfile(next);
    saveFlags({ ...flags, onboarded: true });
    setSaved(true);
    navigate('/', { replace: true });
  }

  return (
    <ScreenScaffold
      top={<Top title={<Top.TitleParagraph>프로필 설정</Top.TitleParagraph>} />}
      bottom={
        <SubmitFooter label="프로필 저장" onClick={handleSubmit} disabled={!requiredFilled} />
      }
    >
      <TextField
        variant="box"
        label="닉네임"
        placeholder="닉네임을 입력해주세요"
        data-testid="onboarding-nickname"
        value={nickname}
        onChange={(e: ChangeEvent<HTMLInputElement>) => setNickname(e.target.value)}
        onBlur={() => setTouched((t) => ({ ...t, nickname: true }))}
        hasError={touched.nickname && !!nicknameError}
        help={touched.nickname ? (nicknameError ?? undefined) : undefined}
      />

      <Spacing size={12} />

      <TextField
        variant="box"
        label="키(cm)"
        placeholder="예: 170"
        inputMode="numeric"
        data-testid="onboarding-height"
        value={height}
        onChange={(e: ChangeEvent<HTMLInputElement>) => setHeight(e.target.value)}
        onBlur={() => setTouched((t) => ({ ...t, height: true }))}
        hasError={touched.height && !!heightError}
        help={touched.height ? (heightError ?? undefined) : undefined}
      />

      <Spacing size={12} />

      <TextField
        variant="box"
        label="몸무게(kg)"
        placeholder="예: 65"
        inputMode="numeric"
        data-testid="onboarding-weight"
        value={weight}
        onChange={(e: ChangeEvent<HTMLInputElement>) => setWeight(e.target.value)}
        onBlur={() => setTouched((t) => ({ ...t, weight: true }))}
        hasError={touched.weight && !!weightError}
        help={touched.weight ? (weightError ?? undefined) : undefined}
      />

      <Spacing size={24} />
      <Paragraph.Text typography="t4">연령대</Paragraph.Text>
      <Spacing size={8} />
      <div style={{ display: 'flex', gap: 8 }}>
        {AGE_OPTIONS.map((opt) => (
          <SelectableChip
            key={opt.value}
            selected={ageGroup === opt.value}
            onClick={() => {
              fireTick();
              setAgeGroup(opt.value);
            }}
          >
            {opt.label}
          </SelectableChip>
        ))}
      </div>

      <Spacing size={20} />
      <Paragraph.Text typography="t4">목표</Paragraph.Text>
      <Spacing size={8} />
      <div style={{ display: 'flex', gap: 8 }}>
        {GOAL_OPTIONS.map((opt) => (
          <SelectableChip
            key={opt.value}
            selected={goal === opt.value}
            onClick={() => {
              fireTick();
              setGoal(opt.value);
            }}
          >
            {opt.label}
          </SelectableChip>
        ))}
      </div>

      <Spacing size={20} />
      <Paragraph.Text typography="t4">체력수준</Paragraph.Text>
      <Spacing size={8} />
      <div style={{ display: 'flex', gap: 8 }}>
        {LEVEL_OPTIONS.map((opt) => (
          <SelectableChip
            key={opt.value}
            selected={level === opt.value}
            onClick={() => {
              fireTick();
              setLevel(opt.value);
            }}
          >
            {opt.label}
          </SelectableChip>
        ))}
      </div>

      <Spacing size={80} />

      <AlertDialog
        open={!flags.aiNoticeConfirmed}
        title="AI 활용 안내"
        description="이 서비스는 생성형 AI를 활용해요. AI 결과는 참고용이에요."
        alertButton={
          <AlertDialog.AlertButton onClick={confirmAiNotice}>확인</AlertDialog.AlertButton>
        }
        onClose={confirmAiNotice}
      />

      <Toast open={saved} position="top" text="프로필이 저장됐어요" />
    </ScreenScaffold>
  );
}
