# TASK — FitCoach AI

> 규칙: 각 Task는 1회 코딩 세션(10분 이내). 완료 후에도 앱은 항상 컴파일 가능해야 함. 데이터 레이어 우선 → 페이지 → 통합.

---

## Epic 1. TypeScript 타입 & 인터페이스

> **Risk** — Complexity: Low / 위험: 페이지 간 `location.state` 타입 불일치로 런타임 데이터 누락 / 완화: 최상단에서 `RouteState` 계약을 먼저 확정해 모든 페이지가 동일 타입을 import.

### Task 1.1 — 전체 엔티티 타입 + RouteState 정의
- **Description**: SPEC의 5개 모델(`UserProfile`, `WorkoutPlan`/`PlanExercise`, `WorkoutSession`/`FormFeedback`, `Challenge`, `AppFlags`)과 API req/res 타입, 그리고 페이지 간 이동 계약 `RouteState`를 순수 타입으로 정의. 런타임 코드 없음.
- **DoD**:
  - `src/lib/types.ts`에 5개 인터페이스가 SPEC 필드/유니온과 100% 일치.
  - `PlanApiRequest`/`PlanApiResponse`, `ReportApiRequest`/`ReportApiResponse`, `ApiError = { error: string }` export.
  - `RouteState` 타입 export:
    ```ts
    export type RouteState = {
      "/workout/:exerciseId": { exercise: PlanExercise } | undefined;
      "/report/:sessionId": { session: WorkoutSession } | undefined;
    };
    ```
  - `tsc --noEmit` 통과, 다른 파일 미참조여도 컴파일.
- **Covers**: (기반 타입 — 직접 AC 없음, 전 Task 의존)
- **Files**: `src/lib/types.ts`
- **Depends on**: none

---

## Epic 2. 데이터 레이어 (storage / state / api)

> **Risk** — Complexity: Medium / 위험: 세션 배열 무제한 증가 시 localStorage 5MB 초과·`QuotaExceededError`; JSON 손상 시 앱 크래시; API 무한대기 / 완화: Task 2.2에서 FIFO 100 상한·quota 재시도, 2.1에서 safe-parse, 2.4에서 10초 타임아웃을 페이지보다 먼저 구현.

### Task 2.1 — 기본 storage 헬퍼 (profile/plan/flags/challenges)
- **Description**: `fitcoach.profile|plan|flags|challenges` 4개 키에 대한 get/set 헬퍼와 손상값 방어 파서 구현. 세션은 2.2에서 별도 처리.
- **DoD**:
  - `getProfile/saveProfile`, `getPlan/savePlan`, `getFlags/saveFlags`, `getChallenges/saveChallenges` 구현.
  - 공용 `safeParse<T>(raw, fallback)`: `JSON.parse` 실패 시 `try/catch`로 fallback 반환, `console.error` 미호출.
  - 키 부재 시 getter가 기본값 반환(`profile/plan → null`, `flags → 기본 플래그`, `challenges → []`).
  - `getPlan()`이 손상 문자열 `"{broken"`에 대해 `null` 반환(수동 확인).
- **Covers**: [F1-AC1, F1-AC4, F1-AC6]
- **Files**: `src/lib/storage.ts`
- **Depends on**: Task 1.1

### Task 2.2 — 세션 storage (FIFO 100 + quota 재시도 + 챌린지 자동증가)
- **Description**: `fitcoach.sessions` 배열의 저장/조회. 신규 세션은 배열 맨 앞 추가, 100개 상한 FIFO, quota 초과 방어, 저장 시 진행 중 챌린지 `myProgress` 자동 증가.
- **DoD**:
  - `getSessions(): WorkoutSession[]`, `getSessionById(id)`, `saveSession(s): boolean`.
  - 5개 있을 때 저장 → 길이 6, 맨 앞에 신규.
  - 100개 상한: 신규 저장 시 가장 오래된 1개 제거해 길이 100 유지.
  - `setItem`이 `QuotaExceededError` 던지면 오래된 10개 제거 후 재시도, 재시도도 실패 시 `false` 반환.
  - `saveSession` 성공 시 `startAt<=now<=endAt`인 챌린지들의 `myProgress`를 `targetSessions`까지 +1 후 저장.
- **Covers**: [F1-AC2, F1-AC3, F1-AC5, F7-AC2]
- **Files**: `src/lib/sessionStore.ts`
- **Depends on**: Task 2.1

### Task 2.3 — 앱 상태 관리 (AppContext)
- **Description**: `flags`/`profile`를 React Context로 노출하고 localStorage와 동기화하는 경량 store. 프리미엄 여부·온보딩 여부·AI 고지 확인을 앱 전역에서 반응형으로 사용.
- **DoD**:
  - `AppProvider` + `useApp()` 훅 제공: `{ flags, profile, setPremium(bool), confirmAiNotice(), refreshProfile() }`.
  - 마운트 시 storage에서 초기값 로드, 변경 시 setter가 storage 저장 + state 갱신.
  - `setPremium(true)` 호출 시 `flags.isPremium=true`, `premiumSince=now` 저장.
  - 어떤 페이지도 아직 안 붙어도 컴파일/렌더 가능(App에 Provider만 래핑).
- **Covers**: (상태 인프라 — F3/F4/F6/F8 게이팅에 사용)
- **Files**: `src/lib/appContext.tsx`
- **Depends on**: Task 2.1

### Task 2.4 — API 클라이언트 + kcal 유틸 + 프로모션 헬퍼
- **Description**: 외부 Railway AI 서버 호출 클라이언트(10초 타임아웃), MET 기반 kcal 근사 계산, 프로모션 리워드 한도 검증 헬퍼.
- **DoD**:
  - `postPlan(req): Promise<WorkoutPlan>`, `postReport(req): Promise<ReportApiResponse['report']>` — `AbortController`로 10초 타임아웃, 비200 시 `{error}` 파싱해 throw.
  - `calcKcal(exerciseId, durationSec, weightKg): number` — MET×체중×시간 근사, 0~2000 clamp.
  - `grantPromotion(promotionCode, amount)`: `amount>5000`이면 5000으로 제한 후 `grantPromotionReward` 호출.
  - `console.error` 사용 안 함(에러는 throw로 위임).
- **Covers**: [F8-AC5]
- **Files**: `src/lib/api.ts`, `src/lib/kcal.ts`, `src/lib/promotion.ts`
- **Depends on**: Task 1.1

---

## Epic 3. UI 페이지 (페이지당 1 Task)

> **Risk** — Complexity: High / 위험: TDS 여백을 인라인/Tailwind로 덮어써 검수 반려; 보상형 광고 게이트 누락; `location.state` undefined 크래시 / 완화: 각 페이지는 `ScreenScaffold`+TDS 컴포넌트만, `Spacing`으로만 간격, `RouteState` 캐스팅 후 undefined 폴백 처리.

### Task 3.1 — 온보딩 페이지 `/onboarding`
- **Description**: 프로필 입력 폼 + AI 최초 고지 다이얼로그. 저장 후 홈 이동.
- **DoD**:
  - `Top`+`TextField`(닉네임/키/몸무게, `inputMode="numeric"`)+`Chip`(연령대/목표/체력수준)+하단 `Button display="block"`.
  - 제출 유효성: 빈 닉네임 → "닉네임을 입력해주세요"; 키<100 or >250 → "키는 100~250cm 사이로 입력해주세요"; 저장 차단.
  - 필수(닉네임/키/몸무게/목표) 하나라도 비면 제출 버튼 `disabled`.
  - 성공 시 `saveProfile`+`flags.onboarded=true` 저장, 토스트 "프로필이 저장됐어요", `navigate('/', { replace: true })`.
  - `flags.aiNoticeConfirmed===false`면 최초 진입 시 AlertDialog "이 서비스는 생성형 AI를 활용합니다" 1회, 확인 시 `confirmAiNotice()`.
  - `flags.onboarded===true`로 진입 시 기존 프로필 프리필(수정 모드).
  - 숫자 필드 제출 시 키보드 dismiss(blur).
- **Covers**: [F2-AC1, F2-AC2, F2-AC3, F2-AC4, F2-AC5, F2-AC6, F2-AC7]
- **Files**: `src/pages/OnboardingPage.tsx`
- **Depends on**: Task 2.1, Task 2.3

### Task 3.2 — 홈 대시보드 `/`
- **Description**: 이번 주 요약·주간 추이·최근 세션 리스트·빈 상태.
- **DoD**:
  - `ScreenScaffold` 내부에 `data-testid="weekly-summary-hero"`(이번 주 운동 횟수 `SummaryHero` CountUp), `data-testid="weekly-trend"`(최근 7일 `Sparkline`) Card.
  - 최근 7일 세션 수 + 전체 `kcal` 합 계산·표시.
  - 최근 세션 `ListRow`(≥44px) 탭 → `navigate('/report/'+sessionId)`.
  - 세션 0개 → `Asset.ContentIcon` 빈 상태 + "첫 운동을 시작해보세요" + "운동 시작" 버튼.
  - 세션 20개 초과 시 최근 20개만 렌더 + "더 보기" 페이지네이션.
  - 요약 카드와 리스트 사이 `<AdSlot adGroupId={import.meta.env.VITE_TOSS_AD_GROUP_ID} />` 1개(콘텐츠 비겹침).
- **Covers**: [F6-AC1, F6-AC2, F6-AC3, F6-AC4, F6-AC6, F6-AC7]
- **Files**: `src/pages/HomePage.tsx`
- **Depends on**: Task 2.2, Task 2.3

### Task 3.3 — AI 플랜 페이지 `/plan`
- **Description**: 프리미엄 전용 주간 플랜 생성·표시, 보상형 광고 게이트.
- **DoD**:
  - `flags.isPremium===false`에서 "플랜 생성" 탭 → BottomSheet "프리미엄 전용 기능이에요" + `/subscribe` 이동 버튼, API 미호출.
  - 프리미엄: 생성 요청 후 `<TossRewardAd slotId={import.meta.env.VITE_TOSS_AD_SLOT_ID}>`로 감싼 결과가 광고 완료 후에만 노출.
  - 성공 시 `postPlan` 응답 `savePlan` 저장 + 7일 `Card`/`ListRow` 표시, 상단 "AI가 생성한 결과입니다" `Chip` 배지.
  - 대기 중 로딩 인디케이터 "플랜을 만들고 있어요" + 버튼 `disabled`.
  - 500/에러 → 토스트 "플랜 생성에 실패했어요. 다시 시도해주세요", 기존 플랜 유지, `console.error` 없음.
  - 10초 타임아웃 → 중단 + 재시도 버튼.
  - `getPlan()===null` → `Asset.ContentIcon` "아직 플랜이 없어요".
  - 플랜 운동 `ListRow` 탭 → `navigate('/workout/'+exerciseId, { state: { exercise } })`.
- **Covers**: [F3-AC1, F3-AC2, F3-AC3, F3-AC4, F3-AC5, F3-AC6, F3-AC7, F3-AC8]
- **Files**: `src/pages/PlanPage.tsx`
- **Depends on**: Task 2.1, Task 2.3, Task 2.4

### Task 3.4 — 운동 세션 페이지 `/workout/:exerciseId`
- **Description**: 타이머 세션 실행 + 카메라/실시간 피드백(프리미엄) + 프로모션 트리거.
- **DoD**:
  - `location.state`를 `RouteState["/workout/:exerciseId"]`로 캐스팅, undefined면 `exerciseId`로 기본 운동 조회.
  - 존재하지 않는 `exerciseId` → 에러 화면 "운동을 찾을 수 없어요" + 홈 버튼.
  - "시작"→타이머(남은 세트/횟수/경과 1초 갱신)→"완료" 시 `WorkoutSession` 생성(`calcKcal` 사용) `saveSession` 저장 후 `navigate('/report/'+sessionId, { state: { session } })`.
  - 프리미엄+카메라 허용: 무릎 각도>140° 시 코칭 "무릎을 더 굽히세요"(`warn`) 표시 + `speechSynthesis` 음성.
  - 카메라 권한 거부 → 타이머 폴백 "카메라 없이 진행해요", 크래시 없음.
  - 무료 유저 → 카메라/실시간 피드백 비활성, "실시간 자세 교정은 프리미엄" `Chip`.
  - 뒤로가기 → AlertDialog "운동을 중단할까요? 기록이 저장되지 않아요", "계속" 시 유지.
  - 마지막 3초 카운트다운 t1 타이포 + 진동/음성.
  - **최초 세션 완료 시** `grantPromotion(<콘솔코드>, 3000)` 호출(프로모션 대상 신규 유저).
- **Covers**: [F4-AC1, F4-AC2, F4-AC3, F4-AC4, F4-AC5, F4-AC6, F4-AC7, F4-AC8, F8-AC4]
- **Files**: `src/pages/WorkoutPage.tsx`
- **Depends on**: Task 2.2, Task 2.3, Task 2.4

### Task 3.5 — 운동 리포트 페이지 `/report/:sessionId`
- **Description**: 세션 AI 분석 리포트, 보상형 광고 게이트 + 하단 배너.
- **DoD**:
  - `location.state.session` 캐스팅, undefined면 `getSessionById(sessionId)` 조회.
  - `ScreenScaffold` 내 `data-testid="report-score-card"`(자세 점수 `SummaryHero` CountUp), `data-testid="report-muscle-card"`(근육 활성도 `MiniBar`), 피드백 `ListRow` 리스트.
  - "AI 분석 보기" 탭 후 `<TossRewardAd>` 시청 완료 시에만 결과 노출 → `postReport` 호출 결과를 세션 `aiReport`에 병합 저장.
  - 상단 "AI가 생성한 결과입니다" `Chip` 배지.
  - 대기 중 "AI가 자세를 분석하고 있어요" 스켈레톤.
  - 500/실패 → 토스트 "분석에 실패했어요", 기본 요약(횟수/시간/칼로리) 유지, `console.error` 없음.
  - `aiReport` 없으면 기본 요약 + "AI 분석 보기" 버튼만.
  - 리포트 카드 하단 섹션에 `<AdSlot adGroupId={...} />` 1개(비겹침).
- **Covers**: [F5-AC1, F5-AC2, F5-AC3, F5-AC4, F5-AC5, F5-AC6, F5-AC7, F5-AC8]
- **Files**: `src/pages/ReportPage.tsx`
- **Depends on**: Task 2.2, Task 2.4

### Task 3.6 — 챌린지 페이지 `/challenge`
- **Description**: 초대코드 기반 챌린지 생성/리스트/진행률/코드복사.
- **DoD**:
  - `BottomSheet` 생성 폼(`TextField` 제목/목표) 제출 → 6자리 영숫자 `inviteCode` 생성, `saveChallenges` 저장, 리스트 추가, 토스트 "챌린지가 시작됐어요".
  - 빈 제목 → "챌린지 이름을 입력해주세요", 저장 안 됨.
  - `targetSessions` 0 or >30 → "목표 횟수는 1~30 사이로 입력해주세요".
  - "초대 코드 복사" → `navigator.clipboard.writeText(inviteCode)` + 토스트 "코드를 복사했어요"(외부 이동 없음).
  - 챌린지 0개 → 빈 상태 "함께할 챌린지를 만들어보세요" + 생성 버튼.
  - `myProgress>=targetSessions` → "완료" `Chip` + 진행바 100%.
  - 각 챌린지 진행바 `myProgress/targetSessions` 표시.
- **Covers**: [F7-AC1, F7-AC3, F7-AC4, F7-AC5, F7-AC6, F7-AC7]
- **Files**: `src/pages/ChallengePage.tsx`
- **Depends on**: Task 2.1

### Task 3.7 — 구독 페이지 `/subscribe`
- **Description**: 프리미엄 IAP 결제 + 혜택 리스트 + 이용중 상태.
- **DoD**:
  - `<TossPurchase sku={import.meta.env.VITE_TOSS_IAP_SKU} processProductGrant={...} onPurchased={...} />` 결제 완료 시 `processProductGrant`에서 `setPremium(true)`(`isPremium=true`, `premiumSince=now`) + 토스트 "프리미엄이 활성화됐어요", `navigate('/plan')`.
  - `flags.isPremium===true` → "이용 중" `Chip` + 혜택 `ListRow` 표시, 결제 버튼 숨김.
  - 결제 취소 → 플래그 불변 + 토스트 "결제가 취소됐어요", `console.error` 없음.
  - 결제 진행 중 버튼 `disabled` + 로딩 인디케이터.
  - 혜택 `ListRow` 3개(전체 라이브러리/실시간 자세 교정/AI 개인화 플랜) + "월 12,900원" t3 강조.
- **Covers**: [F8-AC1, F8-AC2, F8-AC3, F8-AC6, F8-AC7]
- **Files**: `src/pages/SubscribePage.tsx`
- **Depends on**: Task 2.3

---

## Epic 4. 통합 + 라우팅 + 최종 UX

> **Risk** — Complexity: Medium / 위험: 라우트 미등록/탭 네비 누락으로 페이지 접근 불가, 온보딩 미완 유저가 빈 홈 진입 / 완화: 모든 페이지 완성 후 라우터·가드·탭바를 마지막에 배선.

### Task 4.1 — 라우터 배선 + FloatingTabBar + 온보딩 가드
- **Description**: `react-router-dom` 라우트 등록, `FloatingTabBar`(홈/플랜/챌린지/구독) 연결, `AppProvider` 래핑, 온보딩 미완 리다이렉트.
- **DoD**:
  - `/onboarding`, `/`, `/plan`, `/workout/:exerciseId`, `/report/:sessionId`, `/challenge`, `/subscribe` 라우트 등록.
  - `App`을 `AppProvider`로 래핑, 하단 `src/components/FloatingTabBar`(홈/플랜/챌린지/구독) 표시(세션/온보딩 화면 제외).
  - `flags.onboarded===false`로 `/` 진입 시 `/onboarding` 자동 리다이렉트.
  - 전 페이지 정상 네비게이션(빌드 통과).
- **Covers**: [F6-AC5]
- **Files**: `src/App.tsx`, `src/main.tsx`
- **Depends on**: Task 3.1–3.7

### Task 4.2 — 최종 폴리시 (AI 배지/광고 위치/정책 점검)
- **Description**: 전 화면 최종 검수: AI 배지 상시 표시, 광고 겹침 여부, `console.error` 0개, 외부 URL 이동/HEX 하드코딩 제거, 터치 타깃 ≥44px 확인.
- **DoD**:
  - 플랜/리포트 AI 배지 상시 노출 재확인, 홈·리포트 `<AdSlot>` 콘텐츠 비겹침 확인.
  - 전역 `console.error` grep 0건, `window.location.href`/`window.open` 0건, HEX 하드코딩 0건(`var(--tds-color-*)`만).
  - 다크모드 렌더 확인, 모든 Button/Chip ≥44px.
  - `tsc --noEmit` + 빌드 통과.
- **Covers**: (품질 게이트 — F3-AC4/F5-AC3 배지·F6-AC7/F5-AC8 광고 재검증)
- **Files**: (전 페이지 미세 수정)
- **Depends on**: Task 4.1

---

## AC Coverage
- **Total ACs in SPEC**: 58 (F1:6, F2:7, F3:8, F4:8, F5:8, F6:7, F7:7, F8:7)
- **Covered by tasks**: 58
  - F1-AC1,4,6 → 2.1 / F1-AC2,3,5 → 2.2
  - F2-AC1~7 → 3.1
  - F3-AC1~8 → 3.3
  - F4-AC1~8 → 3.4
  - F5-AC1~8 → 3.5
  - F6-AC1,2,3,4,6,7 → 3.2 / F6-AC5 → 4.1
  - F7-AC1,3,4,5,6,7 → 3.6 / F7-AC2 → 2.2
  - F8-AC1,2,3,6,7 → 3.7 / F8-AC4 → 3.4 / F8-AC5 → 2.4
- **Uncovered**: 0 ✅