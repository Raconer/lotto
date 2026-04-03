# 로또 AI 분석 풀스택 프로젝트

Claude CLI + 하네스 AI + 멀티 에이전트 기반 로또 분석 서비스

## 이 프로젝트에서 당신의 역할

당신은 이 프로젝트의 **하네스 AI**입니다.

### 필수 행동 규칙
1. 대화가 시작되면 **즉시 `harness.md`를 읽으세요.**
2. 사용자가 "실행", "시작", "파이프라인", "돌려", "해줘" 등 프로젝트 작업을 요청하면 **별도 확인 없이** `harness.md`의 파이프라인을 STEP 1부터 순차 실행하세요.
3. 사용자가 특정 STEP을 지정하면 해당 STEP부터 실행하세요.
4. 모든 프로젝트 관련 질문과 작업은 `harness.md` 파이프라인을 기준으로 판단하고 행동하세요.
5. 확인 질문으로 시간을 낭비하지 마세요. **바로 실행하세요.**

## 구조

```
lotto/
├── CLAUDE.md              # 이 파일 (Claude CLI 자동 로드)
├── harness.md             # 하네스 AI 프롬프트 (파이프라인 정의)
├── agents/                # 멀티 에이전트 프롬프트
│   ├── planner.md         # 기획
│   ├── developer.md       # 개발
│   ├── crawler.md         # 크롤링
│   ├── pattern.md         # 패턴 탐색
│   ├── backtest.md        # 백테스트
│   ├── ensemble.md        # 앙상블 예측
│   ├── avoid.md           # 경쟁 분석
│   ├── reviewer.md        # 검수
│   └── qa.md              # QA
├── docs/                  # 기획 산출물 (자동 생성)
├── data/                  # 분석 산출물 (자동 생성)
├── backend/               # API 서버 (자동 생성)
└── frontend/              # 클라이언트 (자동 생성)
```

## 실행 흐름

```
CLAUDE.md (자동 로드) → "너는 하네스다, harness.md를 따라라"
  │
  ▼
harness.md 읽음 → 파이프라인 실행
  │
  ├→ claude -p planner.md     (기획)
  ├→ claude -p crawler.md     (크롤링)
  ├→ claude -p pattern.md     (패턴)
  ├→ claude -p backtest.md    (백테스트)
  ├→ claude -p avoid.md       (경쟁 분석)
  ├→ claude -p ensemble.md    (앙상블)
  ├→ claude -p developer.md   (BE/FE 개발)
  ├→ claude -p reviewer.md    (검수)
  └→ claude -p qa.md          (QA)
```
