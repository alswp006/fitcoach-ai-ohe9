# FitCoach AI

앱인토스 (Vite + React + TDS) 헬스장 PT는 비싸고(월 50만원+) 유튜브 운동 영상은 내 몸에 안 맞는 문제를 해결하는 AI 실시간 자세 교정 홈트레이닝 앱 한국인의 70%가 운동 필요성을 느끼지만 PT 비용 부담과 시간 부족으로 포기합니다. Product Hunt에서 AI 피트니스 앱이 인기를 끌고 있으나, 한국어 지원과 한국인 체형 맞춤 운동이 부족합니다. 기존 MyFitnessPal은 식단 위주이고, 나이키 트레이닝 클럽은 자세 교정 기능이 약합니다. 사용자들은 '내가 제대로 하고 있는지' 실시간 피드백을 가장 원합니다.

## Tech Stack

- React 18.0.0
- TypeScript
- Vitest

## Routes

| Path | Description |
|------|-------------|
| `/Challenge` | Challenge |
| `/Home` | Home |
| `/Onboarding` | Onboarding |
| `/Plan` | Plan |

## Getting Started

```bash
pnpm install
pnpm dev
```

## Development

```bash
pnpm typecheck    # Type checking
pnpm test         # Run tests
pnpm build        # Production build
```

## Design Documents

See `.ai-factory/` directory for full design artifacts:
- `prd.md` — Product Requirements Document
- `spec.md` — Technical Specification
- `task.md` — Epic/Task Breakdown

---
Built with [AI Factory](https://github.com/alswp006/ai-factory) · Last synced: 2026-07-17
