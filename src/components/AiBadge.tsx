import { Paragraph } from '@toss/tds-mobile';

/**
 * 생성형 AI 결과 라벨 — 고지 의무("AI가 생성한 결과입니다" 상시 표시).
 * TDS에 전용 배지 컴포넌트가 없어 커스텀 컨테이너로 구현(Paragraph.Text만 TDS).
 * Pre-built (재구현 금지): AI 결과 화면(플랜/리포트 등)에 이 컴포넌트를 그대로 배치.
 */
export function AiBadge() {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: '4px 8px',
        borderRadius: 8,
        backgroundColor: 'var(--tds-color-grey50)',
      }}
    >
      <Paragraph.Text typography="st13">AI가 생성한 결과입니다</Paragraph.Text>
    </span>
  );
}
