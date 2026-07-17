import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Top, Spacing, ListRow, Chip, Toast } from '@toss/tds-mobile';
import { ScreenScaffold } from '@/components/ScreenScaffold';
import { Card } from '@/components/Card';
import { Amount } from '@/components/Amount';
import { TossPurchase, type TossPurchaseResult } from '@/components/TossPurchase';
import { useApp } from '@/lib/appContext';

const IAP_SKU = import.meta.env.VITE_TOSS_IAP_SKU ?? 'fitcoach-premium-monthly';

const BENEFITS = [
  { title: '전체 운동 라이브러리', description: '무료 3종 외 전체 운동 이용' },
  { title: '실시간 자세 교정', description: '카메라 기반 실시간 코칭' },
  { title: 'AI 개인화 플랜', description: '목표 맞춤 주간 운동 플랜' },
];

export default function Subscribe() {
  const navigate = useNavigate();
  const { flags, setPremium } = useApp();
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  function handlePurchased(_result: TossPurchaseResult) {
    setPremium(true);
    setToastMessage('프리미엄이 활성화됐어요');
    navigate('/plan');
  }

  function handleError() {
    setToastMessage('결제가 취소됐어요');
  }

  return (
    <ScreenScaffold top={<Top title={<Top.TitleParagraph>프리미엄 구독</Top.TitleParagraph>} />}>
      {flags.isPremium && (
        <>
          <Chip>이용 중</Chip>
          <Spacing size={16} />
        </>
      )}

      <Card testId="subscribe-benefits-card">
        <Amount value={12900} unit="원/월" typography="t3" />
        <Spacing size={16} />
        {BENEFITS.map((benefit, idx) => {
          const texts = (
            <ListRow.Texts type="2RowTypeA" top={benefit.title} bottom={benefit.description} />
          );
          return (
            <div key={benefit.title}>
              {idx > 0 && <Spacing size={4} />}
              <ListRow contents={texts}>{texts}</ListRow>
            </div>
          );
        })}
      </Card>

      <Spacing size={24} />

      {!flags.isPremium && (
        <TossPurchase
          sku={IAP_SKU}
          processProductGrant={async () => true}
          onPurchased={handlePurchased}
          onError={handleError}
        >
          프리미엄 구독하기
        </TossPurchase>
      )}

      <Spacing size={80} />

      <Toast open={!!toastMessage} position="top" text={toastMessage ?? ''} />
    </ScreenScaffold>
  );
}
