# Lotto AI - 멀티 에이전트 & 하네스 AI 기반 로또 분석 시스템

Claude CLI 위에서 동작하는 **멀티 에이전트 시스템**입니다.
하네스 AI가 9개의 전문 에이전트를 **각각 독립된 Claude 세션으로** 호출하여 로또 데이터 분석부터 풀스택 개발까지 자율적으로 수행합니다.

---

## 핵심 개념

### 멀티 에이전트 (Multi-Agent)

하나의 AI가 모든 작업을 하는 것이 아니라, **역할별 전문 에이전트**가 자신의 영역만 담당합니다.

- 각 에이전트는 `agents/*.md` 파일에 프롬프트로 정의
- 에이전트는 **파일을 통해 소통** (앞 에이전트의 산출물 → 뒷 에이전트의 입력)
- 에이전트마다 **독립된 Claude 세션**으로 실행 (서로의 사고 과정을 모름)

### 하네스 AI (Harness AI)

에이전트들을 **감싸고(wrap) 조율하는 상위 AI**입니다.

- `harness.md`에 정의
- 하네스는 **직접 코드를 작성하거나 분석하지 않음**
- 하네스가 하는 일:
  - `claude -p` 명령으로 에이전트를 **별도 프로세스로 호출**
  - 에이전트 완료 후 산출물을 **검증**
  - 품질 부족 시 실패 사유를 포함하여 **재호출**
  - 치명적 문제 시 **이전 단계로 되돌림**

### 멀티 에이전트 vs 하네스 AI

```
┌──────────────────────────────────────────────────────┐
│  하네스 AI (harness.md) - Claude 세션 1               │
│  역할: 에이전트 호출, 검증, 재시도 판단                  │
│                                                       │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐    │
│  │ 기획자   │→│ 개발자   │→│ 리뷰어   │→│  QA     │    │
│  │ 세션 2   │ │ 세션 3   │ │ 세션 4   │ │ 세션 5  │    │
│  └─────────┘ └─────────┘ └─────────┘ └─────────┘    │
│       ↑            ↑            ↑           ↑         │
│       각각 독립된 Claude 프로세스 (서로를 모름)           │
└──────────────────────────────────────────────────────┘
```

- **멀티 에이전트** = 독립된 Claude 세션으로 실행되는 전문가들 (수평 관계)
- **하네스 AI** = 전문가들을 호출하고 관리하는 매니저 (수직 관계)

---

## Claude CLI 실행 구조

### 사용자가 입력하는 것

```bash
# Claude CLI에서 한마디:
harness.md 읽고 실행해줘
```

### 실제 일어나는 일

```
사용자 → Claude CLI 실행
           │
           ▼
     ┌─────────────┐
     │  하네스 AI    │ ← Claude 세션 1 (harness.md를 프롬프트로 받음)
     │  (매니저)     │
     └──────┬──────┘
            │
            │  Bash 도구로 claude -p 실행 (별도 프로세스 생성)
            │
            ├──→ $ claude -p "$(cat agents/planner.md)"     ← 세션 2
            │         │
            │         └→ docs/spec-*.md 파일 생성
            │
            │    하네스: docs/ 파일 읽어서 검증 ✓
            │
            ├──→ $ claude -p "data 수집 지시"                ← 세션 3
            │         └→ data/collected.json 생성
            │    하네스: 10회차 이상? ✓
            │
            ├──→ $ claude -p "$(cat agents/crawler.md)"     ← 세션 4
            │         └→ data/context.json, popular.json 생성
            │    하네스: 계절/요일 포함? ✓
            │
            ├──→ $ claude -p "$(cat agents/pattern.md)"     ← 세션 5
            │         └→ data/patterns.json 생성
            │    하네스: pairs, trend, overdue? ✓
            │
            ├──→ $ claude -p "$(cat agents/backtest.md)"    ← 세션 6
            │         └→ data/backtest.json 생성
            │    하네스: ranking 존재? ✓
            │
            ├──→ $ claude -p "$(cat agents/avoid.md)"       ← 세션 7
            │         └→ data/avoid.json 생성
            │    하네스: popularity_score? ✓
            │
            ├──→ $ claude -p "$(cat agents/ensemble.md)"    ← 세션 8
            │         └→ data/prediction.json 생성
            │    하네스: 5세트, 6개 번호, 중복 없음? ✓
            │
            ├──→ $ claude -p "$(cat agents/developer.md)"   ← 세션 9
            │         └→ backend/, frontend/ 생성
            │    하네스: npm run dev 실행 가능? ✓
            │
            ├──→ $ claude -p "$(cat agents/reviewer.md)"    ← 세션 10
            │         └→ 코드 수정 + docs/review-report.md
            │    하네스: 수정 후 실행 정상? ✓
            │
            └──→ $ claude -p "$(cat agents/qa.md)"          ← 세션 11
                      └→ 버그 수정 + docs/qa-report.md
                 하네스: Critical 버그 해결? ✓
            │
            ▼
     파이프라인 완료
```

### 핵심: 왜 별도 세션인가?

```
❌ 단일 세션 (역할 연기)              ✅ 멀티 세션 (진짜 멀티 에이전트)
┌──────────────────────┐           ┌──────────────────────┐
│ Claude 1개가 전부 수행  │           │ 하네스 (세션 1)        │
│                       │           │   ├→ 기획자 (세션 2)    │
│ "나는 기획자..."       │           │   ├→ 개발자 (세션 3)    │
│ "이제 개발자..."       │           │   ├→ 리뷰어 (세션 4)    │
│ "이제 리뷰어..."       │           │   └→ QA (세션 5)       │
│                       │           │                       │
│ 같은 컨텍스트 공유      │           │ 각자 독립된 컨텍스트     │
│ 기획 시 사고가          │           │ 리뷰어는 개발자의       │
│ 리뷰에도 영향           │           │ 사고 과정을 모른 채     │
│                       │           │ 순수하게 코드만 검수     │
└──────────────────────┘           └──────────────────────┘
```

- 리뷰어가 개발자의 의도를 모른 채 **코드만 보고** 검수
- QA가 기획/개발 과정을 모른 채 **동작만 보고** 테스트
- 하네스는 내부 과정을 모른 채 **산출물만 보고** 검증

---

## 프로젝트 구조

```
lotto/
├── README.md                  # 이 파일
├── CLAUDE.md                  # Claude CLI가 읽는 프로젝트 설명
├── harness.md                 # 하네스 AI 프롬프트
│
├── agents/                    # 멀티 에이전트 프롬프트
│   ├── planner.md             # 기획 에이전트
│   ├── developer.md           # 개발 에이전트
│   ├── crawler.md             # 크롤러 에이전트
│   ├── pattern.md             # 패턴 탐색 에이전트
│   ├── backtest.md            # 백테스트 에이전트
│   ├── ensemble.md            # 앙상블 예측 에이전트
│   ├── avoid.md               # 경쟁 분석 에이전트
│   ├── reviewer.md            # 검수 에이전트
│   └── qa.md                  # QA 에이전트
│
├── docs/                      # [자동 생성] 기획 산출물
├── data/                      # [자동 생성] 분석 산출물
├── backend/                   # [자동 생성] API 서버
└── frontend/                  # [자동 생성] 클라이언트
```

---

## 파일별 역할 분류

### 하네스 AI

| 파일 | 유형 | 호출 방식 | 설명 |
|------|------|----------|------|
| `harness.md` | **하네스** | 사용자가 직접 실행 | 9개 에이전트를 `claude -p`로 호출, 산출물 검증, 재시도 판단 |

### 멀티 에이전트 - 프로젝트 관리

| 파일 | 유형 | 호출 방식 | 역할 | 산출물 |
|------|------|----------|------|--------|
| `agents/planner.md` | **에이전트** | 하네스가 `claude -p` 호출 | 기술 스펙 문서 작성 | `docs/spec-*.md` |
| `agents/developer.md` | **에이전트** | 하네스가 `claude -p` 호출 | 스펙 기반 코드 구현 | `backend/`, `frontend/` |
| `agents/reviewer.md` | **에이전트** | 하네스가 `claude -p` 호출 | 코드 검수 + 직접 수정 | `docs/review-report.md` |
| `agents/qa.md` | **에이전트** | 하네스가 `claude -p` 호출 | 실행 테스트 + 버그 수정 | `docs/qa-report.md` |

### 멀티 에이전트 - 로또 분석 특화

| 파일 | 유형 | 호출 방식 | 역할 | 산출물 |
|------|------|----------|------|--------|
| `agents/crawler.md` | **에이전트** | 하네스가 `claude -p` 호출 | 추가 데이터 수집 | `data/context.json` |
| `agents/pattern.md` | **에이전트** | 하네스가 `claude -p` 호출 | 번호 쌍/주기/트렌드 탐색 | `data/patterns.json` |
| `agents/backtest.md` | **에이전트** | 하네스가 `claude -p` 호출 | 전략 성능 검증 | `data/backtest.json` |
| `agents/avoid.md` | **에이전트** | 하네스가 `claude -p` 호출 | 대중 선호 번호 분석 | `data/avoid.json` |
| `agents/ensemble.md` | **에이전트** | 하네스가 `claude -p` 호출 | 전체 결과 종합 → 최종 추천 | `data/prediction.json` |

---

## 에이전트 간 데이터 흐름

```
                    동행복권 API
                         │
                    ┌────▼────┐
                    │ 데이터   │ claude -p (세션 3)
                    │ 수집     │
                    └────┬────┘
                         │ data/collected.json
                    ┌────▼────┐
                    │ 크롤러   │ claude -p (세션 4)
                    └────┬────┘
                         │ data/context.json
                         │ data/popular.json
              ┌──────────┼──────────┐
              │          │          │
         ┌────▼────┐┌───▼───┐┌────▼────┐
         │ 패턴    ││백테스트││ 경쟁    │ 각각 별도 claude -p
         │ (세션5) ││(세션6) ││ (세션7) │ (세션 5, 6, 7)
         └────┬────┘└───┬───┘└────┬────┘
              │         │         │
              │  data/  │  data/  │  data/
              │patterns │backtest │  avoid
              │  .json  │  .json  │  .json
              └─────────┼─────────┘
                        │
              ┌─────────▼─────────┐
              │   앙상블 예측      │ claude -p (세션 8)
              │  (전체 결과 종합)   │
              └─────────┬─────────┘
                        │ data/prediction.json
                        │
          ┌─────────────▼─────────────┐
          │     Backend / Frontend     │ claude -p (세션 9)
          │    (분석 결과를 서비스화)    │
          └─────────────┬─────────────┘
                        │
              ┌─────────▼─────────┐
              │ 검수 (세션 10)     │ claude -p
              └─────────┬─────────┘
                        │
              ┌─────────▼─────────┐
              │ QA (세션 11)       │ claude -p
              └─────────┬─────────┘
                        │
                     완료
```

---

## 하네스 AI의 검증 & 재시도 로직

```
하네스가 claude -p로 에이전트 호출
    │
    ▼
에이전트 실행 완료 (별도 세션 종료)
    │
    ▼
하네스가 산출물 파일을 직접 읽어 검증
    │
    ├── 통과 → 다음 에이전트 호출
    │
    └── 실패 → 실패 사유를 프롬프트에 포함하여 재호출
               │
               │  claude -p "이전 에러: {에러 내용}. 해결하세요."
               │
               ├── 성공 → 다음 에이전트 호출
               │
               └── 3회 실패
                    │
                    ├── Critical → 파이프라인 중단
                    └── Non-critical → 경고 후 계속
```

### 되돌림 (Rollback)

```
STEP 5 (QA)에서 Critical 버그 발견
    │
    ▼
하네스가 판단: "구조적 문제 → 개발부터 다시"
    │
    ▼
STEP 3 (개발) 재호출 → STEP 4 (검수) → STEP 5 (QA)
```

---

## 사용법

### 전체 파이프라인 실행
```bash
# Claude CLI에서:
harness.md 읽고 실행해줘
```

### 특정 단계만 실행
```bash
harness.md 읽고 STEP 1만 실행해줘
harness.md 읽고 STEP 2만 실행해줘
harness.md 읽고 STEP 3만 실행해줘
```

### 특정 에이전트만 직접 실행 (하네스 없이)
```bash
agents/pattern.md 읽고 실행해줘
agents/backtest.md 읽고 실행해줘
```

---

## 기술 스택 (개발 시 생성)

| 영역 | 스택 |
|------|------|
| Backend | Node.js, Express, SQLite (better-sqlite3) |
| Frontend | React 19, Vite, Tailwind CSS |
| AI | Claude CLI (Anthropic) |
| 데이터 | 동행복권 API |
