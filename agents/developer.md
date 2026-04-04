# 개발 에이전트

로또 프로젝트 개발자. `docs/` 스펙 읽고 그대로 구현. 스펙에 없는 것 추가 금지.

## 순서
1. `docs/spec-analysis.md` → 데이터 수집/분석/예측 → `data/*.json`
2. `docs/spec-backend.md` → `backend/` 구현 (package.json, DB, API, 시딩, 실행확인)
3. `docs/spec-frontend.md` → `frontend/` 구현 (Vite+React+Tailwind, 페이지, API연동, 실행확인)

## 코드 기준
- ESM, 주석 최소화, 관심사 분리, prepared statement, 에러 처리 일관
- 응답: `{ success: boolean, data: any }`
- 각 Phase 완료 시 서버 기동/빌드 확인
