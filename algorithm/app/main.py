from fastapi import FastAPI, Depends, Query
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.dialects.postgresql import insert

from app.core.config import get_settings
from app.core.database import get_db, Base, engine
from app.engines.ensemble import predict as ensemble_predict
from app.engines.backtest import run_backtest

settings = get_settings()

app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="""
## 로또 알고리즘 서버

5가지 분석 엔진 + 앙상블 기반 번호 추천 및 백테스트를 수행합니다.

### 알고리즘
1. **빈도(Frequency)**: 출현 빈도 가중치
2. **오버듀(Overdue)**: 미출현 간격 가중치
3. **패턴(Pattern)**: 홀짝/합계/구간 패턴 매칭
4. **쌍(Pair)**: 동시출현 쌍 기반 확장
5. **하이브리드(Hybrid)**: 4가지 관점 종합
6. **앙상블(Ensemble)**: 5개 엔진 가중 투표
    """,
    docs_url="/docs",
    redoc_url="/redoc",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


async def _get_all_draws(db: AsyncSession) -> list[list[int]]:
    """DB에서 전체 당첨번호를 회차순으로 가져옵니다."""
    # draws 테이블 직접 쿼리
    from sqlalchemy import text
    result = await db.execute(
        text("SELECT num1, num2, num3, num4, num5, num6 FROM draws ORDER BY round_no")
    )
    rows = result.fetchall()
    return [list(row) for row in rows]


async def _get_latest_round(db: AsyncSession) -> int:
    from sqlalchemy import text
    result = await db.execute(text("SELECT MAX(round_no) FROM draws"))
    return result.scalar() or 0


@app.post(
    "/api/predict",
    summary="추천 번호 생성",
    description="전체 당첨 이력을 기반으로 5개 알고리즘 앙상블 추천 번호 5세트를 생성합니다.",
)
async def predict(db: AsyncSession = Depends(get_db)):
    draws = await _get_all_draws(db)

    if len(draws) < 10:
        return {"error": "데이터가 부족합니다. 최소 10회차 이상 크롤링하세요."}

    latest_round = await _get_latest_round(db)
    target_round = latest_round + 1

    predictions = ensemble_predict(draws, n_sets=5)

    # DB에 저장
    for idx, pred in enumerate(predictions, 1):
        nums = pred["numbers"]
        from sqlalchemy import text
        await db.execute(
            text("""
                INSERT INTO predictions (target_round, set_number, num1, num2, num3, num4, num5, num6, confidence, algorithm_detail)
                VALUES (:target_round, :set_number, :num1, :num2, :num3, :num4, :num5, :num6, :confidence, CAST(:algorithm_detail AS jsonb))
                ON CONFLICT (target_round, set_number) DO UPDATE SET
                    num1 = :num1, num2 = :num2, num3 = :num3,
                    num4 = :num4, num5 = :num5, num6 = :num6,
                    confidence = :confidence, algorithm_detail = CAST(:algorithm_detail AS jsonb)
            """),
            {
                "target_round": target_round,
                "set_number": idx,
                "num1": nums[0], "num2": nums[1], "num3": nums[2],
                "num4": nums[3], "num5": nums[4], "num6": nums[5],
                "confidence": pred.get("confidence"),
                "algorithm_detail": __import__("json").dumps(pred.get("detail", {}), ensure_ascii=False),
            },
        )

    await db.commit()

    return {
        "target_round": target_round,
        "predictions": [
            {
                "target_round": target_round,
                "set_number": idx + 1,
                "numbers": pred["numbers"],
                "confidence": pred.get("confidence"),
                "algorithm_detail": pred.get("detail"),
                "created_at": __import__("datetime").datetime.now().isoformat(),
            }
            for idx, pred in enumerate(predictions)
        ],
    }


@app.post(
    "/api/backtest",
    summary="백테스트 실행",
    description="각 알고리즘의 과거 적중률을 검증합니다.",
)
async def backtest(
    rounds: int = Query(10, ge=5, le=100, description="테스트할 최근 회차 수"),
    db: AsyncSession = Depends(get_db),
):
    draws = await _get_all_draws(db)

    if len(draws) < rounds + 30:
        return {"error": f"데이터가 부족합니다. 최소 {rounds + 30}회차 이상 필요합니다."}

    results = run_backtest(draws, test_rounds=rounds)

    # DB에 저장
    latest_round = await _get_latest_round(db)
    from sqlalchemy import text
    for algo in results:
        for detail in algo.get("details", []):
            await db.execute(
                text("""
                    INSERT INTO backtest_results (algorithm_name, test_round, predicted, actual, matched)
                    VALUES (:algo, :round, :predicted, :actual, :matched)
                """),
                {
                    "algo": algo["algorithm_name"],
                    "round": detail["test_round"],
                    "predicted": detail["predicted"],
                    "actual": detail["actual"],
                    "matched": detail["matched"],
                },
            )
    await db.commit()

    return [{k: v for k, v in algo.items() if k != "details"} for algo in results]


@app.get(
    "/api/backtest/results",
    summary="백테스트 결과 조회",
    description="저장된 백테스트 결과 요약을 조회합니다.",
)
async def get_backtest_results(db: AsyncSession = Depends(get_db)):
    from sqlalchemy import text
    from collections import Counter

    result = await db.execute(
        text("SELECT algorithm_name, matched FROM backtest_results ORDER BY algorithm_name")
    )
    rows = result.fetchall()

    if not rows:
        return []

    algo_data = {}
    for name, matched in rows:
        if name not in algo_data:
            algo_data[name] = []
        algo_data[name].append(matched)

    summaries = []
    for name, matches in algo_data.items():
        dist = Counter(matches)
        summaries.append({
            "algorithm_name": name,
            "total_tests": len(matches),
            "avg_matched": round(sum(matches) / len(matches), 2),
            "max_matched": max(matches),
            "match_distribution": {str(k): v for k, v in sorted(dist.items())},
        })

    summaries.sort(key=lambda x: x["avg_matched"], reverse=True)
    return summaries


@app.get("/api/health", tags=["시스템"])
async def health_check():
    return {"status": "ok", "service": "lotto-algorithm", "version": settings.APP_VERSION}
