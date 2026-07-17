# SPEC — FitCoach AI

## Common Principles

- **플랫폼**: 앱인토스 (Vite + React + TypeScript + TDS `@toss/tds-mobile`), React Router(`react-router-dom`), 데이터는 localStorage. 서버 연산(AI)은 외부 Railway API 서버로 분리.
- **인증**: 토스 앱이 세션을 자동 제공. 별도 로그인 함수 호출 없음. 사용자 식별 필요 시 `getIsTossLoginIntegratedService()`로 연동 상태 확인.
- **UI**: 모든 화면은 TDS 컴포넌트로 조립(ListRow, Button, TextField, Paragraph.Text, Chip, Switch, AlertDialog, BottomSheet, Toast, Top, Tab). 하단 탭은 템플릿 `src/components/FloatingTabBar` 사용. 여백은 TDS `Spacing`(size 필수)만. 색상은 `var(--tds-color-*)` 또는 TDS 컴포넌트만(HEX 하드코딩 금지, 다크모드 지원).
- **모바일**: 모든 터치 타깃 ≥ 44px. 긴 리스트(20개↑)는 가상 스크롤/페이지네이션. 폼은 모바일 키보드(숫자 input `inputMode="numeric"`, 제출 시 키보드 dismiss) 대응.
- **AI 고지 (필수)**: AI 결과물(플랜/리포트/피드백)은 "AI가 생성한 결과입니다" 배지 상시 표시. 최초 이용 시 "이 서비스는 생성형 AI를 활용합니다" 다이얼로그 1회.
- **정책**: 외부 URL 이동(`window.location.href`/`window.open`) 금지, 앱 설치 유도 문구 금지, 외부 분석 솔루션(GA/Amplitude) 금지, 프로덕션 `console.error` 0개, CORS 정상, Android 7+/iOS 16+ 호환.
- **프리미엄 게이트**: 무료는 기본 운동 3개(`ex_squat`, `ex_pushup`, `ex_plank`)만. 프리미엄(월 12,900원, IAP)에서 전체 라이브러리/실시간 자세 피드백/AI 개인화 플랜 제공.

---

## Data Models

### UserProfile — 사용자 프로필/목표
```typescript
interface UserProfile {
  tossUserKey: string;        // 토스 세션 식별자(연동 시), 미연동 시 "local"
  nickname: string;           // 1~12자
  heightCm: number;           // 100~250
  weightKg: number;           // 30~200
  ageGroup: '20s' | '30s' | '40s';
  goal: 'diet' | 'muscle' | 'health';   // 다이어트/근육/건강
  level: 'beginner' | 'intermediate';   // 체력 수준
  createdAt: number;          // epoch ms
  updatedAt: number;
}
```
- localStorage key: `fitcoach.profile` → `UserProfile` (단일 객체, ~0.3KB)

### WorkoutPlan — AI 개인화 주간 플랜
```typescript
interface PlanExercise {
  exerciseId: string;         // 예: "ex_squat"
  name: string;               // "스쿼트"
  sets: number;               // 1~10
  reps: number;               // 1~50
  restSec: number;            // 10~180
}
interface WorkoutPlan {
  planId: string;             // "plan_" + createdAt
  weekOf: string;             // "2026-W29" (ISO week)
  goal: UserProfile['goal'];
  days: { day: number; exercises: PlanExercise[] }[]; // day 1~7
  isAiGenerated: true;
  createdAt: number;
}
```
- localStorage key: `fitcoach.plan` → `WorkoutPlan` (최신 1개, ~2KB)

### WorkoutSession — 운동 기록 + AI 리포트
```typescript
interface FormFeedback {
  jointLabel: string;         // "무릎", "등"
  message: string;            // "무릎을 더 굽히세요"
  severity: 'good' | 'warn'; // 정상/교정필요
}
interface WorkoutSession {
  sessionId: string;          // "sess_" + startedAt
  exerciseId: string;
  exerciseName: string;
  startedAt: number;
  durationSec: number;        // 0~7200
  completedReps: number;      // 0~500
  kcal: number;               // 계산값 0~2000
  aiReport?: {                // AI 분석 리포트 (있을 때만)
    isAiGenerated: true;
    scoreAvg: number;         // 0~100 자세 점수
    feedback: FormFeedback[]; // 1~10개
    muscleActivation: { muscle: string; percent: number }[]; // percent 0~100
  };
}
```
- localStorage key: `fitcoach.sessions` → `WorkoutSession[]` (최근 100개, FIFO, ~1.5MB 상한)

### Challenge — 친구 챌린지
```typescript
interface Challenge {
  challengeId: string;        // "chal_" + createdAt
  title: string;              // 1~20자
  targetSessions: number;     // 1~30 (기간 내 목표 운동 횟수)
  startAt: number;
  endAt: number;
  myProgress: number;         // 완료 세션 수 0~targetSessions
  inviteCode: string;         // 6자리 영숫자
}
```
- localStorage key: `fitcoach.challenges` → `Challenge[]` (최대 20개, ~0.2KB)

### AppFlags — 앱 상태 플래그
```typescript
interface AppFlags {
  aiNoticeConfirmed: boolean; // AI 고지 확인 여부
  onboarded: boolean;
  isPremium: boolean;         // IAP 구매 성공 시 true
  premiumSince?: number;
}
```
- localStorage key: `fitcoach.flags` → `AppFlags` (~0.1KB)

**총 저장 추정**: 최대 ~1.6MB < 5MB. 세션 100개 상한으로 초과 방지.

---

## Feature List

### F1. 데이터 레이어 & localStorage 저장소
- Description: 위 5개 데이터 모델의 읽기/쓰기/마이그레이션을 담당하는 저장소 계층. 세션 배열 상한(100개) 관리와 용량 초과 시 방어 로직을 제공한다. UI가 없는 기반 패킷으로 다른 모든 기능이 의존한다.
- Data: UserProfile, WorkoutPlan, WorkoutSession, Challenge, AppFlags
- API: 없음 (내부 storage helper)
- Requirements:
- AC-1 [U][P0]: The system shall `fitcoach.profile|plan|sessions|challenges|flags` 5개 키를 통해 각 모델을 JSON 직렬화하여 저장/조회한다.
- AC-2 [E][P0]: Scenario: 세션 저장
  Given `fitcoach.sessions`에 항목이 5개 있을 때
  When `saveSession({ sessionId: "sess_1", exerciseId: "ex_squat", completedReps: 20, durationSec: 300, kcal: 45 })` 호출
  Then 배열 맨 앞에 추가되어 길이 6이 되고 localStorage에 반영됨
- AC-3 [E][P1]: Scenario: 세션 100개 상한
  Given `fitcoach.sessions`에 항목이 100개 있을 때
  When 새 세션 저장
  Then 가장 오래된 1개가 제거되어 길이 100 유지(FIFO)
- AC-4 [W][P1]: Scenario: JSON 파싱 실패 복구
  Given `fitcoach.plan` 값이 `"{broken"` 로 손상됐을 때
  When `getPlan()` 호출
  Then `null`을 반환하고 `console.error` 없이 처리됨
- AC-5 [W][P1]: Scenario: 용량 초과
  Given localStorage `setItem`이 `QuotaExceededError`를 던질 때
  When `saveSession(...)` 호출
  Then 가장 오래된 세션 10개를 제거 후 재시도하고, 재시도도 실패하면 `false`를 반환함
- AC-6 [S][P2]: While 최초 실행(모든 키 부재)일 때, the system shall 각 getter가 기본값(빈 배열 또는 `null`)을 반환하고 앱이 크래시하지 않게 한다.

---

### F2. 온보딩 & 개인화 프로필 설정
- Description: 최초 진입 시 닉네임/키/몸무게/연령대/목표/체력수준을 입력받아 UserProfile을 저장한다. 최초 1회 "생성형 AI 활용" 고지 다이얼로그를 표시한다. 완료 후 홈으로 이동한다.
- Data: UserProfile, AppFlags
- API: 없음
- Requirements:
- AC-1 [E][P0]: Scenario: 프로필 저장 성공
  Given 토스 로그인된 유저가 온보딩 화면에 있을 때
  When `{ nickname: "지민", heightCm: 168, weightKg: 60, ageGroup: "30s", goal: "diet", level: "beginner" }` 제출
  Then `fitcoach.profile` 저장, `flags.onboarded=true` 저장, 성공 토스트 "프로필이 저장됐어요" 표시, `navigate('/')` 이동
- AC-2 [E][P0]: Scenario: AI 최초 고지
  Given `flags.aiNoticeConfirmed`가 false일 때
  When 온보딩 화면 최초 진입
  Then AlertDialog "이 서비스는 생성형 AI를 활용합니다"가 1회 표시되고, 확인 탭 시 `flags.aiNoticeConfirmed=true` 저장
- AC-3 [W][P1]: Scenario: 빈 닉네임 거부
  When `{ nickname: "", heightCm: 168, weightKg: 60, ... }` 제출
  Then 에러 메시지 "닉네임을 입력해주세요" 표시, 저장 안 됨
- AC-4 [W][P1]: Scenario: 범위 밖 키 거부
  When `{ heightCm: 90, ... }` (100 미만) 제출
  Then 에러 메시지 "키는 100~250cm 사이로 입력해주세요" 표시, 저장 안 됨
- AC-5 [S][P1]: While 필수 입력(닉네임/키/몸무게/목표)이 하나라도 비어있는 상태, the system shall 제출 버튼을 `disabled` 처리한다.
- AC-6 [E][P1]: Scenario: 숫자 키보드
  When 키/몸무게 TextField 포커스
  Then `inputMode="numeric"` 숫자 키패드 표시, 제출 시 키보드 dismiss
- AC-7 [S][P2]: While 이미 `flags.onboarded=true`인 상태로 `/onboarding` 접근, the system shall 기존 프로필 값을 폼에 프리필하여 수정 모드로 동작한다.

---

### F3. AI 개인화 운동 플랜 생성 (프리미엄, 보상형 광고 게이트)
- Description: 프로필(목표/체력수준)을 외부 AI API로 전송해 주간 운동 플랜을 생성·저장한다. 프리미엄 유저 전용이며, 무료 유저는 구독 화면으로 유도한다. 결과는 보상형 광고 시청 후 표시한다.
- Data: WorkoutPlan, UserProfile, AppFlags
- API: `POST /api/plan` `{ goal: string, level: string, ageGroup: string }` → `{ plan: WorkoutPlan }` | errors: 400 `{error}`, 500 `{error}`
- Requirements:
- AC-1 [E][P0]: Scenario: 플랜 생성 성공
  Given 프리미엄 유저(`flags.isPremium=true`), 프로필 `{ goal: "muscle", level: "beginner", ageGroup: "30s" }`
  When "플랜 생성" 버튼 탭 후 TossRewardAd 광고 시청 완료
  Then `POST /api/plan` 호출 → 응답 `plan`을 `fitcoach.plan`에 저장, 플랜 화면에 7일 플랜 표시
- AC-2 [E][P0]: Scenario: 보상형 광고 게이트
  Given 플랜 생성 요청이 완료됐을 때
  When 결과 표시 직전
  Then `<TossRewardAd slotId={...}>`로 감싼 플랜 결과가 광고 시청 완료 후에만 노출됨
- AC-3 [W][P0]: Scenario: 무료 유저 차단
  Given `flags.isPremium=false`일 때
  When "플랜 생성" 버튼 탭
  Then BottomSheet "프리미엄 전용 기능이에요"와 함께 `/subscribe` 이동 버튼 표시, API 호출 안 됨
- AC-4 [U][P0]: The system shall 플랜 결과 화면 상단에 "AI가 생성한 결과입니다" 배지를 표시한다.
- AC-5 [S][P1]: While API 응답 대기 중, the system shall TDS 로딩 인디케이터와 "플랜을 만들고 있어요" 문구를 표시하고 버튼을 `disabled` 처리한다.
- AC-6 [W][P1]: Scenario: API 오류
  Given `POST /api/plan`이 500 `{ error: "생성 실패" }` 반환
  When 플랜 생성 시도
  Then 에러 토스트 "플랜 생성에 실패했어요. 다시 시도해주세요" 표시, 기존 플랜 유지, `console.error` 없음
- AC-7 [W][P1]: Scenario: 네트워크 타임아웃
  Given 요청이 10초 내 응답 없음
  When 타임아웃 발생
  Then 요청 중단 및 재시도 버튼 표시
- AC-8 [S][P1]: While 저장된 플랜이 없는 상태(`getPlan()===null`), the system shall 빈 상태 `Asset.ContentIcon`과 "아직 플랜이 없어요" 안내를 표시한다.

---

### F4. 운동 세션 실행 (카메라 가이드 + 실시간 자세 피드백)
- Description: 선택한 운동을 세트/횟수 타이머로 진행하며, 카메라 프리뷰와 함께 실시간 자세 코칭 문구·음성(Web Speech API)을 제공한다. 실시간 피드백은 프리미엄 전용이며, 무료 유저는 카메라 없이 타이머 가이드만 사용한다.
- Data: WorkoutSession, PlanExercise, AppFlags
- API: 없음 (온디바이스; 실시간 각도 추정은 클라이언트 pose 라이브러리)
- Requirements:
- AC-1 [E][P0]: Scenario: 세션 시작/완료
  Given 유저가 `ex_squat` 세션 화면에 있을 때
  When "시작" 탭 → 타이머 진행 → "완료" 탭
  Then `WorkoutSession { exerciseId: "ex_squat", completedReps, durationSec, kcal }` 생성되어 `saveSession`으로 저장, `/report/:sessionId` 이동
- AC-2 [O][P0]: Scenario: 프리미엄 실시간 피드백
  Given `flags.isPremium=true`이고 카메라 권한 허용됨
  When 스쿼트 자세 각도가 임계값 미달(무릎 각도 > 140°)
  Then 화면 코칭 문구 "무릎을 더 굽히세요"(`severity: "warn"`) 표시 및 음성 재생
- AC-3 [W][P1]: Scenario: 카메라 권한 거부
  Given 유저가 카메라 권한을 거부했을 때
  When 세션 시작
  Then 카메라 없이 타이머 가이드로 폴백하고 안내 "카메라 없이 진행해요" 표시, 크래시 없음
- AC-4 [W][P1]: Scenario: 무료 유저 카메라 제한
  Given `flags.isPremium=false`일 때
  When 세션 시작
  Then 실시간 자세 피드백/카메라 비활성, 타이머 가이드만 제공, "실시간 자세 교정은 프리미엄" Chip 표시
- AC-5 [S][P1]: While 세션 진행 중, the system shall 남은 세트/횟수/경과 시간을 1초 단위로 갱신하여 표시한다.
- AC-6 [W][P1]: Scenario: 중도 이탈
  Given 세션 진행 중 유저가 뒤로가기
  When 이탈 시도
  Then AlertDialog "운동을 중단할까요? 기록이 저장되지 않아요" 표시, "계속" 탭 시 세션 유지
- AC-7 [S][P2]: While 마지막 3초 카운트다운, the system shall 큰 숫자(TDS 타이포 t1)와 진동/음성 카운트다운을 제공한다.
- AC-8 [W][P1]: Scenario: 잘못된 운동 ID
  Given 라우트 파라미터 `exerciseId`가 존재하지 않는 값일 때
  When 세션 화면 진입
  Then 에러 화면 "운동을 찾을 수 없어요"와 홈 이동 버튼 표시

---

### F5. 운동 리포트 (AI 분석, 보상형 광고 게이트)
- Description: 완료된 세션의 카메라 데이터/횟수를 외부 AI API로 분석해 자세 점수, 개선 피드백, 근육 활성도, 칼로리 리포트를 생성한다. 결과는 보상형 광고 시청 후 노출되며 "AI 생성" 배지를 표시한다.
- Data: WorkoutSession(aiReport), 
- API: `POST /api/report` `{ exerciseId: string, completedReps: number, durationSec: number, weightKg: number }` → `{ report: { scoreAvg: number, feedback: FormFeedback[], muscleActivation: {muscle:string;percent:number}[], kcal: number } }` | errors: 400/500 `{error}`
- Requirements:
- AC-1 [E][P0]: Scenario: 리포트 생성 성공
  Given 세션 `sess_1`(`ex_squat`, completedReps 20, durationSec 300) 완료
  When 리포트 화면에서 "AI 분석 보기" 탭 후 TossRewardAd 시청 완료
  Then `POST /api/report` 호출 → 응답을 해당 세션 `aiReport`에 병합 저장, 점수/피드백/근육활성도/칼로리 표시
- AC-2 [E][P0]: Scenario: 보상형 광고 게이트
  Given 분석 결과가 준비됐을 때
  When 결과 노출 직전
  Then `<TossRewardAd>`로 감싼 리포트가 광고 시청 완료 후에만 표시됨
- AC-3 [U][P0]: The system shall 리포트 카드 상단에 "AI가 생성한 결과입니다" 배지를 표시한다.
- AC-4 [U][P0]: Scenario: 레이아웃 계약
  Then Report 화면은 `ScreenScaffold`로 감싸고, `data-testid="report-score-card"` Card(자세 점수 `SummaryHero` CountUp)와 `data-testid="report-muscle-card"` Card(근육 활성도 `MiniBar`)를 포함하며, 피드백 항목은 `ListRow` 리스트로 표시한다.
- AC-5 [S][P1]: While 분석 API 대기 중, the system shall "AI가 자세를 분석하고 있어요" 로딩 상태와 스켈레톤을 표시한다.
- AC-6 [W][P1]: Scenario: 분석 실패
  Given `POST /api/report`가 500 `{ error: "분석 실패" }` 반환
  When 분석 시도
  Then 토스트 "분석에 실패했어요" 표시, 기본 요약(횟수/시간/칼로리)은 그대로 표시, `console.error` 없음
- AC-7 [S][P1]: While `aiReport`가 없는 세션의 리포트 화면, the system shall 기본 요약만 표시하고 "AI 분석 보기" 버튼을 노출한다.
- AC-8 [E][P2]: Scenario: 배너 광고 배치
  When 리포트 결과가 표시됨
  Then 리포트 카드 하단(콘텐츠와 겹치지 않는 섹션)에 `<AdSlot adGroupId={...} />` 1개 노출

---

### F6. 홈 대시보드 & 운동 통계
- Description: 홈 화면에서 이번 주 운동 횟수, 누적 칼로리, 최근 세션 리스트, 오늘의 추천 운동을 요약해 보여준다. 데이터 시각화로 주간 추이를 표현하고 세션/플랜 화면으로 진입 동선을 제공한다.
- Data: WorkoutSession[], WorkoutPlan, UserProfile
- API: 없음
- Requirements:
- AC-1 [U][P0]: The system shall 홈 화면에서 최근 7일 세션 수와 누적 칼로리(모든 세션 `kcal` 합)를 계산하여 표시한다.
- AC-2 [U][P0]: Scenario: 대시보드 레이아웃 계약
  Then 홈은 `ScreenScaffold`로 감싸고, `data-testid="weekly-summary-hero"`(이번 주 운동 횟수 `SummaryHero` CountUp)와 `data-testid="weekly-trend"`(최근 7일 세션 추이 `Sparkline`) Card를 포함한다.
- AC-3 [E][P0]: Scenario: 최근 세션 진입
  Given 홈에 최근 세션 ListRow가 있을 때
  When 세션 ListRow 탭
  Then `navigate('/report/'+sessionId)`로 해당 리포트 이동
- AC-4 [S][P1]: While 세션이 0개인 상태, the system shall `Asset.ContentIcon` 빈 상태와 "첫 운동을 시작해보세요" 문구, "운동 시작" 버튼을 표시한다.
- AC-5 [W][P1]: Scenario: 프로필 미설정
  Given `flags.onboarded=false`일 때
  When 홈 진입
  Then `/onboarding`으로 자동 리다이렉트
- AC-6 [S][P1]: While 세션 리스트가 20개를 초과하는 상태, the system shall 최근 20개만 렌더링하고 "더 보기"로 추가 로드(페이지네이션)한다.
- AC-7 [E][P2]: Scenario: 홈 배너 광고
  When 홈 진입
  Then 요약 카드와 세션 리스트 사이 섹션에 `<AdSlot adGroupId={...} />` 1개 노출(콘텐츠 비겹침)

---

### F7. 친구 챌린지 & 기록 공유
- Description: 초대 코드 기반 챌린지를 생성하고 목표 운동 횟수 대비 내 진행률을 추적한다. 완료 세션이 발생하면 진행 중인 챌린지 진행도가 자동 증가한다. 외부 이동 없이 초대 코드 복사로 친구를 초대한다.
- Data: Challenge[], WorkoutSession[]
- API: 없음 (localStorage 기반, 외부 서버 미사용)
- Requirements:
- AC-1 [E][P0]: Scenario: 챌린지 생성
  When `{ title: "7일 스쿼트", targetSessions: 7, startAt, endAt }` 제출
  Then 6자리 `inviteCode` 생성, `fitcoach.challenges`에 저장, 리스트에 추가, 토스트 "챌린지가 시작됐어요"
- AC-2 [E][P0]: Scenario: 진행도 자동 증가
  Given 진행 기간 내 챌린지 `chal_1`(myProgress 2/7)이 있을 때
  When 새 세션이 저장됨(F1 saveSession)
  Then 기간 내 챌린지의 `myProgress`가 3으로 증가하고 저장됨
- AC-3 [E][P1]: Scenario: 초대 코드 복사
  When "초대 코드 복사" 탭
  Then `navigator.clipboard.writeText(inviteCode)` 실행, 토스트 "코드를 복사했어요" 표시 (외부 URL 이동 없음)
- AC-4 [W][P1]: Scenario: 빈 제목 거부
  When `{ title: "", targetSessions: 7 }` 제출
  Then 에러 "챌린지 이름을 입력해주세요" 표시, 저장 안 됨
- AC-5 [W][P1]: Scenario: 목표 범위 거부
  When `{ title: "테스트", targetSessions: 0 }` 제출
  Then 에러 "목표 횟수는 1~30 사이로 입력해주세요" 표시
- AC-6 [S][P1]: While 챌린지가 0개인 상태, the system shall 빈 상태 안내 "함께할 챌린지를 만들어보세요"와 생성 버튼을 표시한다.
- AC-7 [S][P2]: While `myProgress >= targetSessions`인 챌린지, the system shall "완료" 배지(Chip)와 진행바 100%를 표시한다.

---

### F8. 프리미엄 구독 (IAP) & 프로모션 리워드
- Description: 프리미엄 구독을 템플릿 `<TossPurchase>`로 결제하고, 성공 시 `flags.isPremium`을 활성화해 프리미엄 기능(F3/F4)을 해제한다. 신규 유저 유치용 프로모션 리워드를 지급한다.
- Data: AppFlags
- API: 없음 (IAP는 `IAP.createOneTimePurchaseOrder` 래퍼 `<TossPurchase>` 사용)
- Requirements:
- AC-1 [E][P0]: Scenario: 구독 결제 성공
  Given 무료 유저가 구독 화면에 있을 때
  When `<TossPurchase sku={import.meta.env.VITE_TOSS_IAP_SKU} onPurchased={...} />` 결제 완료
  Then `processProductGrant`에서 `flags.isPremium=true`, `premiumSince=now` 저장, 토스트 "프리미엄이 활성화됐어요"
- AC-2 [S][P0]: While `flags.isPremium=true`인 상태, the system shall 구독 화면에서 "이용 중" 상태와 프리미엄 혜택 리스트를 표시하고 결제 버튼을 숨긴다.
- AC-3 [E][P1]: Scenario: 결제 취소
  Given 결제 시트에서 유저가 취소했을 때
  When 결제 중단
  Then `flags.isPremium` 변경 없음, 토스트 "결제가 취소됐어요" 표시, `console.error` 없음
- AC-4 [E][P1]: Scenario: 프로모션 리워드 지급
  Given 프로모션 대상 신규 유저일 때
  When 프로모션 조건 충족(첫 운동 완료)
  Then `grantPromotionReward({ promotionCode: <콘솔발급코드>, amount: 3000 })` 호출
- AC-5 [W][P0]: Scenario: 프로모션 한도 검증
  Given `grantPromotionReward` 호출 시 `amount` 값
  When `amount > 5000`이면
  Then 호출을 차단하고 `amount`를 5000으로 제한한다.
- AC-6 [S][P1]: While IAP 결제 진행 중, the system shall 결제 버튼을 `disabled` 처리하고 로딩 인디케이터를 표시한다.
- AC-7 [U][P2]: The system shall 혜택 리스트를 `ListRow`로 표기(전체 운동 라이브러리 / 실시간 자세 교정 / AI 개인화 플랜)하고 가격 "월 12,900원"을 강조 타이포(t3)로 표시한다.

---

## Screen Definitions

### S1. 온보딩 — `/onboarding` (F2)
- TDS: `Top`(타이틀), `TextField`(닉네임/키/몸무게), `Chip`(연령대/목표/체력수준 선택), `Button`(제출, `display="block"` 하단), `AlertDialog`(AI 고지), `Toast`, `Spacing`.
- 골격: `ScreenScaffold`. 제출은 하단 고정 `SubmitFooter` 또는 `display="block"` Button.
- Loading: 없음(로컬 저장). Empty: 최초 빈 폼. Error: 필드별 인라인 에러 메시지.
- 터치: 모든 Chip/Button ≥ 44px. 숫자 필드 `inputMode="numeric"`.
- Navigation: Outgoing "제출 → `navigate('/', { replace: true })`". Incoming `location.state`: 없음.

### S2. 홈 대시보드 — `/` (F6)
- TDS: `Top`, `ListRow`(최근 세션), `Button`(운동 시작), `Chip`, `Spacing`; 시각화 `SummaryHero`(CountUp), `Sparkline`, `Card`; 빈 상태 `Asset.ContentIcon`. 하단 `FloatingTabBar`(홈/플랜/챌린지/구독).
- 골격: `ScreenScaffold`. 요약은 `Card` 위계.
- Loading: 세션 로드 스켈레톤. Empty: 세션 0개 안내+버튼. Error: 프로필 미설정 시 `/onboarding` 리다이렉트.
- 터치: 세션 ListRow ≥ 44px, "운동 시작" Button 하단 고정.
- Navigation: Outgoing "세션 ListRow 탭 → `navigate('/report/'+sessionId)`", "운동 시작 → `navigate('/workout/'+exerciseId, { state: { exercise: PlanExercise } })`". Incoming: 없음.
- 광고: 요약 카드와 리스트 사이 `<AdSlot>`.

### S3. AI 플랜 — `/plan` (F3)
- TDS: `Top`, `Card`(요일별 플랜), `ListRow`(운동 항목), `Button`(플랜 생성), `Chip`("AI가 생성한 결과입니다" 배지), `BottomSheet`(프리미엄 유도), `Toast`; 빈 상태 `Asset.ContentIcon`. 결과는 `<TossRewardAd>`로 게이트.
- 골격: `ScreenScaffold`.
- Loading: "플랜을 만들고 있어요" 인디케이터. Empty: 플랜 없음 안내. Error: 실패 토스트+재시도 버튼.
- 터치: 생성 Button ≥ 44px `display="block"`.
- Navigation: Outgoing "프리미엄 유도 → `navigate('/subscribe')`", "플랜 운동 탭 → `navigate('/workout/'+exerciseId, { state: { exercise: PlanExercise } })`". Incoming: 없음.

### S4. 운동 세션 — `/workout/:exerciseId` (F4)
- TDS: `Top`, `Button`(시작/완료), `Chip`(프리미엄 안내), `AlertDialog`(중단 확인), 타이머 타이포(t1). 카메라 프리뷰는 커스텀 flex 레이아웃(TDS 미제공 영역).
- 골격: `ScreenScaffold`.
- Loading: 카메라 초기화 스피너. Empty: 해당 없음. Error: 잘못된 exerciseId → 에러 화면+홈 버튼, 카메라 거부 → 타이머 폴백.
- 터치: 시작/완료 Button ≥ 44px 하단 고정.
- Navigation: Outgoing "완료 → `navigate('/report/'+sessionId, { state: { session: WorkoutSession } })`", "중단 확인 → `navigate('/')`". Incoming `location.state = { exercise: PlanExercise } | undefined`(undefined 시 exerciseId로 기본 운동 조회).

### S5. 운동 리포트 — `/report/:sessionId` (F5)
- TDS: `Top`, `Card`(점수/근육/요약), `ListRow`(피드백), `Button`(AI 분석 보기), `Chip`(AI 배지), `Toast`; 시각화 `SummaryHero`(CountUp 점수), `MiniBar`(근육 활성도). 결과 `<TossRewardAd>` 게이트, 하단 `<AdSlot>`.
- 골격: `ScreenScaffold`. `data-testid="report-score-card"`, `data-testid="report-muscle-card"`.
- Loading: "AI가 자세를 분석하고 있어요" 스켈레톤. Empty: aiReport 없음 → 기본 요약+분석 버튼. Error: 분석 실패 토스트.
- 터치: 분석 버튼 ≥ 44px.
- Navigation: Outgoing "홈 → `navigate('/')`". Incoming `location.state = { session: WorkoutSession } | undefined`(undefined 시 sessionId로 조회).

### S6. 챌린지 — `/challenge` (F7)
- TDS: `Top`, `ListRow`(챌린지 리스트+진행바), `Button`(생성/코드복사), `TextField`(제목/목표), `BottomSheet`(생성 폼), `Chip`(완료 배지), `Toast`; 빈 상태 `Asset.ContentIcon`.
- 골격: `ScreenScaffold`.
- Loading: 로컬 로드 즉시. Empty: 챌린지 0개 안내+생성 버튼. Error: 필드 인라인 에러.
- 터치: 생성/복사 Button ≥ 44px.
- Navigation: Outgoing: 없음(모달 내 완결). Incoming: 없음.

### S7. 구독 — `/subscribe` (F8)
- TDS: `Top`, `Card`(혜택), `ListRow`(혜택 항목), `Button`(결제=`<TossPurchase>`), `Chip`("이용 중"), `Toast`; 가격 강조 타이포(t3).
- 골격: `ScreenScaffold`.
- Loading: 결제 진행 인디케이터+버튼 disabled. Empty: 해당 없음. Error: 취소/실패 토스트.
- 터치: 결제 Button ≥ 44px 하단 고정.
- Navigation: Outgoing "결제 성공 → `navigate('/plan')`". Incoming: 없음.

---

## API Contract (외부 Railway AI 서버 — CORS 허용 필수)

### POST /api/plan
- Request: `{ goal: 'diet'|'muscle'|'health'; level: 'beginner'|'intermediate'; ageGroup: '20s'|'30s'|'40s' }`
- Response 200: `{ plan: WorkoutPlan }`
- Errors: 400 `{ error: string }` (필드 누락), 500 `{ error: string }` (생성 실패)

### POST /api/report
- Request: `{ exerciseId: string; completedReps: number; durationSec: number; weightKg: number }`
- Response 200: `{ report: { scoreAvg: number; feedback: FormFeedback[]; muscleActivation: { muscle: string; percent: number }[]; kcal: number } }`
- Errors: 400 `{ error: string }`, 500 `{ error: string }`

- 공통: 모든 에러 응답 shape `{ error: string }`. 요청 타임아웃 10초. 인증 헤더 불필요(토스 세션은 클라이언트에서 처리, 서버는 stateless). 외부 로깅(GA/Amplitude) 미사용.

---

## Assumptions

- **A1**: 실시간 자세 추정은 클라이언트 온디바이스 pose 라이브러리(예: MediaPipe/TF.js WASM)로 관절 각도를 계산하며, 서버 전송 없이 브라우저에서 동작한다. WASM 미지원 환경/저사양 기기에서는 타이머 가이드로 폴백한다.
- **A2**: 음성 피드백은 브라우저 Web Speech API(`speechSynthesis`, 한국어) 사용. 미지원 시 화면 텍스트 코칭만 제공.
- **A3**: AI 플랜/리포트 생성은 외부 Railway 서버가 LLM을 호출해 결과를 반환한다. 서버는 별도 배포이며 본 SPEC은 클라이언트 계약만 정의한다.
- **A4**: 무료 유저 기본 운동은 `ex_squat`, `ex_pushup`, `ex_plank` 3종 고정. 전체 라이브러리는 프리미엄.
- **A5**: 친구 공유는 초대 코드 복사(클립보드) 방식으로 외부 이동 없이 구현(정책 준수). 실제 다중 유저 동기화는 MVP 범위 외.
- **A6**: 칼로리(`kcal`)는 운동별 MET 상수 × 체중 × 시간 기반 근사식으로 클라이언트 계산.

## Open Questions

- **Q1**: 프리미엄 구독을 IAP 일회성(월 단위 재구매)로 처리하는지, 실제 정기결제(subscription)로 처리하는지 — 템플릿 `<TossPurchase>`는 `createOneTimePurchaseOrder` 기반이므로 갱신 정책 확인 필요.
- **Q2**: 녹화 영상 원본을 서버로 업로드하는지(용량/프라이버시), 아니면 클라이언트에서 각도 지표만 추출해 전송하는지.
- **Q3**: 프로모션 `promotionCode` 발급 및 지급 조건(첫 운동 완료 vs 첫 구독)을 앱인토스 콘솔에서 확정 필요.
- **Q4**: 챌린지 진행률의 다중 참여자 실시간 동기화가 MVP에 필요한지(현재는 로컬 진행률만).
- **Q5**: 실시간 자세 추정 라이브러리 번들 크기가 토스 미니앱 로딩 성능 기준을 충족하는지 검증 필요.