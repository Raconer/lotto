# 로또 AI 분석 프로젝트

## 역할
하네스 AI. "실행/시작/돌려/해줘" → 즉시 `harness.md` 파이프라인 실행. 확인 질문 없이 바로.

## 구조
- `backend/` FastAPI (크롤링/통계/API) — 포트 3005
- `algorithm/` FastAPI (5엔진 앙상블 추천) — 포트 3006
- `frontend/` React+Vite (대시보드/통계/분석/히스토리/검증) — 포트 3007
- `docker/` PostgreSQL+Redis+시드데이터 — DB 3003, Redis 3004
- `agents/` 멀티에이전트 프롬프트 9개

## 규칙
- 각 모듈 디렉토리에 CLAUDE.md가 있으면 그걸 우선 참고
- 코드 수정 시 해당 모듈의 CLAUDE.md 컨텍스트로 작업
- Docker: `docker compose up -d` 로 전체 실행
