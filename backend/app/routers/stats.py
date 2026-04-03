from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.schemas.draw import (
    NumberStatResponse,
    CombinationStatResponse,
    RangeStatResponse,
    NumberValidationRequest,
    NumberValidationResponse,
)
from app.services.stats import get_number_stats, get_combination_stats, get_range_stats
from app.services.validation import validate_numbers

router = APIRouter(prefix="/api/stats", tags=["통계"])


@router.get(
    "/numbers",
    response_model=list[NumberStatResponse],
    summary="번호별 통계",
    description="1~45 각 번호의 출현 횟수, 확률, 핫/콜드 여부, 미출현 간격 등을 조회합니다.",
)
async def get_number_statistics(db: AsyncSession = Depends(get_db)):
    return await get_number_stats(db)


@router.get(
    "/combinations",
    response_model=list[CombinationStatResponse],
    summary="조합 통계",
    description="N개 번호 조합의 동시 출현 빈도와 확률을 조회합니다. "
    "combo_size로 조합 크기(2~6)를 지정하고, order로 정렬 방향을 선택합니다.",
)
async def get_combination_statistics(
    combo_size: int = Query(2, ge=2, le=6, description="조합 크기 (2~6)"),
    limit: int = Query(50, ge=1, le=500, description="조회 개수"),
    order: str = Query("desc", description="정렬 (desc: 높은순, asc: 낮은순)"),
    db: AsyncSession = Depends(get_db),
):
    return await get_combination_stats(db, combo_size, limit, order)


@router.get(
    "/ranges",
    response_model=list[RangeStatResponse],
    summary="구간별 통계",
    description="회차별 구간 분포(1~10, 11~20, ...), 홀짝 비율, 합계, 연속번호 등을 조회합니다.",
)
async def get_range_statistics(
    limit: int = Query(50, ge=1, le=500, description="조회 회차 수"),
    db: AsyncSession = Depends(get_db),
):
    return await get_range_stats(db, limit)


@router.post(
    "/validate",
    response_model=NumberValidationResponse,
    summary="내 번호 검증",
    description="사용자가 입력한 번호 6개를 과거 데이터 기반으로 분석하여 "
    "빈도 점수, 조합 점수, 균형 점수, 종합 점수를 산출합니다.",
)
async def validate_my_numbers(
    request: NumberValidationRequest,
    db: AsyncSession = Depends(get_db),
):
    if len(set(request.numbers)) != 6:
        from fastapi import HTTPException
        raise HTTPException(status_code=400, detail="중복 없는 6개 번호를 입력하세요.")
    if any(n < 1 or n > 45 for n in request.numbers):
        from fastapi import HTTPException
        raise HTTPException(status_code=400, detail="번호는 1~45 사이여야 합니다.")

    return await validate_numbers(db, request.numbers)
