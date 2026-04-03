import httpx
from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy import select, desc
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.config import get_settings
from app.models.draw import Prediction
from app.schemas.draw import PredictionResponse, PredictionListResponse, BacktestResultResponse, BacktestSummaryResponse

settings = get_settings()
router = APIRouter(prefix="/api/predictions", tags=["추천/예측"])


@router.post(
    "/generate",
    response_model=PredictionListResponse,
    summary="추천 번호 생성 (기존 앙상블)",
    description="알고리즘 서버를 호출하여 다음 회차 추천 번호 5세트를 생성합니다.",
)
async def generate_predictions(db: AsyncSession = Depends(get_db)):
    try:
        async with httpx.AsyncClient(timeout=60) as client:
            resp = await client.post(f"{settings.ALGORITHM_URL}/api/predict")
            if resp.status_code != 200:
                raise HTTPException(status_code=502, detail=f"알고리즘 서버 오류: {resp.text}")
            data = resp.json()
    except httpx.ConnectError:
        raise HTTPException(status_code=503, detail="알고리즘 서버에 연결할 수 없습니다.")

    return PredictionListResponse(**data)


@router.post(
    "/generate/typed",
    summary="5종류 타입별 추천 번호 생성",
    description="핫넘버, 콜드넘버, 균형조합, 희소조합, AI앙상블 5종류 추천을 생성합니다. "
    "각 타입별로 다른 전략을 사용하며, 분석 상세와 함께 반환됩니다.",
)
async def generate_typed_predictions(db: AsyncSession = Depends(get_db)):
    try:
        async with httpx.AsyncClient(timeout=120) as client:
            resp = await client.post(f"{settings.ALGORITHM_URL}/api/predict/typed")
            if resp.status_code != 200:
                raise HTTPException(status_code=502, detail=f"알고리즘 서버 오류: {resp.text}")
            return resp.json()
    except httpx.ConnectError:
        raise HTTPException(status_code=503, detail="알고리즘 서버에 연결할 수 없습니다.")


@router.get(
    "/latest",
    response_model=PredictionListResponse,
    summary="최신 추천 번호 조회",
    description="가장 최근 생성된 추천 번호 5세트를 조회합니다.",
)
async def get_latest_predictions(db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Prediction).order_by(desc(Prediction.created_at)).limit(5)
    )
    predictions = result.scalars().all()

    if not predictions:
        raise HTTPException(status_code=404, detail="추천 번호가 없습니다. 먼저 생성하세요.")

    target_round = predictions[0].target_round
    return PredictionListResponse(
        target_round=target_round,
        predictions=[
            PredictionResponse(
                target_round=p.target_round,
                set_number=p.set_number,
                numbers=p.numbers,
                confidence=p.confidence,
                algorithm_detail=p.algorithm_detail,
                created_at=p.created_at,
            )
            for p in predictions
        ],
    )


@router.get(
    "/{target_round}",
    response_model=PredictionListResponse,
    summary="특정 회차 추천 번호 조회",
    description="지정된 회차의 추천 번호를 조회합니다.",
)
async def get_predictions_by_round(
    target_round: int,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Prediction)
        .where(Prediction.target_round == target_round)
        .order_by(Prediction.set_number)
    )
    predictions = result.scalars().all()

    if not predictions:
        raise HTTPException(status_code=404, detail=f"{target_round}회차 추천 번호가 없습니다.")

    return PredictionListResponse(
        target_round=target_round,
        predictions=[
            PredictionResponse(
                target_round=p.target_round,
                set_number=p.set_number,
                numbers=p.numbers,
                confidence=p.confidence,
                algorithm_detail=p.algorithm_detail,
                created_at=p.created_at,
            )
            for p in predictions
        ],
    )


@router.post(
    "/backtest",
    response_model=list[BacktestSummaryResponse],
    summary="백테스트 실행",
    description="알고리즘 서버에 백테스트를 요청하여 각 알고리즘의 과거 적중률을 확인합니다.",
)
async def run_backtest(
    rounds: int = Query(10, ge=5, le=100, description="테스트할 최근 회차 수"),
):
    try:
        async with httpx.AsyncClient(timeout=120) as client:
            resp = await client.post(
                f"{settings.ALGORITHM_URL}/api/backtest",
                params={"rounds": rounds},
            )
            if resp.status_code != 200:
                raise HTTPException(status_code=502, detail=f"알고리즘 서버 오류: {resp.text}")
            return resp.json()
    except httpx.ConnectError:
        raise HTTPException(status_code=503, detail="알고리즘 서버에 연결할 수 없습니다.")


@router.get(
    "/backtest/results",
    response_model=list[BacktestSummaryResponse],
    summary="백테스트 결과 조회",
    description="저장된 백테스트 결과 요약을 조회합니다.",
)
async def get_backtest_results():
    try:
        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.get(f"{settings.ALGORITHM_URL}/api/backtest/results")
            if resp.status_code != 200:
                raise HTTPException(status_code=502, detail=f"알고리즘 서버 오류: {resp.text}")
            return resp.json()
    except httpx.ConnectError:
        raise HTTPException(status_code=503, detail="알고리즘 서버에 연결할 수 없습니다.")
