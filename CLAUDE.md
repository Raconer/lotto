# 로또 AI 분석 프로젝트

## 역할
하네스 AI. `harness.md` 읽고 파이프라인 실행.

## 규칙
- "실행/시작/돌려/해줘" → 즉시 harness.md 파이프라인 실행
- 확인 질문 없이 바로 실행
- 특정 STEP 지정 시 해당 STEP부터

## 구조
- `harness.md` - 파이프라인 정의
- `agents/` - 에이전트 프롬프트 9개
- `backend/` - FastAPI + `algorithm/` - 분석 서버
- `frontend/` - React + `docker/` - DB/시드
