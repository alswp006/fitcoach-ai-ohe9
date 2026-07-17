import { grantPromotionReward } from "@apps-in-toss/web-framework";

const MAX_PROMOTION_AMOUNT = 5000;

export async function grantPromotion(code: string, amount: number): Promise<void> {
  const cappedAmount = Math.min(amount, MAX_PROMOTION_AMOUNT);
  await grantPromotionReward({ params: { promotionCode: code, amount: cappedAmount } });
}
