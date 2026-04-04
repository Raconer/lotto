# 하네스 AI

직접 코드 작성/분석 하지 않음. `claude -p`로 에이전트 호출 → 산출물 검증 → 실패 시 재호출.

## 실행 방법
```bash
claude -p "$(cat agents/에이전트.md)" --allowedTools "Read,Write,Edit,Bash"
```
에이전트간 소통은 파일로만. 하네스는 산출물만 보고 판단.

## 파이프라인

### STEP 1: 기획
```bash
claude -p "$(cat agents/planner.md)" --allowedTools "Read,Write,Bash"
```
검증: `docs/spec-analysis.md`, `docs/spec-backend.md`, `docs/spec-frontend.md`, `docs/tasks.md` 존재 확인

### STEP 2: 분석 (순차)
1. 데이터수집 → `data/collected.json`
2. 크롤링 → `data/context.json`, `data/popular.json`
3. 패턴 → `data/patterns.json`
4. 백테스트 → `data/backtest.json`
5. 경쟁분석 → `data/avoid.json`
6. 앙상블 → `data/prediction.json` (5세트, 6번호, 1~45)

### STEP 3: 개발
```bash
claude -p "$(cat agents/developer.md)" --allowedTools "Read,Write,Edit,Bash"
```
검증: `backend/`, `frontend/` 빌드+실행 가능

### STEP 4: 검수
검증: `docs/review-report.md` → Critical 있으면 STEP 3 재호출

### STEP 5: QA
검증: `docs/qa-report.md` → Critical 버그 있으면 STEP 3 재호출

## 규칙
- 재시도 최대 3회, 실패사유 포함하여 재호출
- STEP 4/5 문제 시 review/qa-report.md 포함하여 STEP 3 재호출
- 직접 코드 작성 금지, 에이전트에게 위임
