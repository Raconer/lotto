from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy import select, desc, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.models.draw import Draw
from app.schemas.draw import DrawResponse, DrawListResponse

router = APIRouter(prefix="/api/draws", tags=["당첨번호"])


@router.get(
    "",
    response_model=DrawListResponse,
    summary="당첨번호 목록 조회",
    description="전체 로또 당첨번호를 페이지네이션으로 조회합니다.",
)
async def get_draws(
    page: int = Query(1, ge=1, description="페이지 번호"),
    size: int = Query(20, ge=1, le=100, description="페이지 크기"),
    db: AsyncSession = Depends(get_db),
):
    total_result = await db.execute(select(func.count(Draw.id)))
    total = total_result.scalar() or 0

    result = await db.execute(
        select(Draw).order_by(desc(Draw.round_no)).offset((page - 1) * size).limit(size)
    )
    draws = result.scalars().all()

    return DrawListResponse(
        total=total,
        draws=[
            DrawResponse(
                id=d.id,
                round_no=d.round_no,
                draw_date=d.draw_date,
                num1=d.num1, num2=d.num2, num3=d.num3,
                num4=d.num4, num5=d.num5, num6=d.num6,
                bonus=d.bonus,
                numbers=d.numbers,
                total_sales=d.total_sales,
                first_prize=d.first_prize,
                first_winners=d.first_winners,
                created_at=d.created_at,
            )
            for d in draws
        ],
    )


@router.get(
    "/latest",
    response_model=DrawResponse,
    summary="최신 당첨번호 조회",
    description="가장 최근 회차의 당첨번호를 조회합니다.",
)
async def get_latest_draw(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Draw).order_by(desc(Draw.round_no)).limit(1))
    draw = result.scalar_one_or_none()
    if not draw:
        raise HTTPException(status_code=404, detail="당첨번호 데이터가 없습니다. 크롤링을 먼저 실행하세요.")

    return DrawResponse(
        id=draw.id, round_no=draw.round_no, draw_date=draw.draw_date,
        num1=draw.num1, num2=draw.num2, num3=draw.num3,
        num4=draw.num4, num5=draw.num5, num6=draw.num6,
        bonus=draw.bonus, numbers=draw.numbers,
        total_sales=draw.total_sales, first_prize=draw.first_prize,
        first_winners=draw.first_winners, created_at=draw.created_at,
    )


@router.get(
    "/{round_no}",
    response_model=DrawResponse,
    summary="특정 회차 당첨번호 조회",
    description="지정된 회차의 당첨번호를 조회합니다.",
)
async def get_draw_by_round(round_no: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Draw).where(Draw.round_no == round_no))
    draw = result.scalar_one_or_none()
    if not draw:
        raise HTTPException(status_code=404, detail=f"{round_no}회차 데이터가 없습니다.")

    return DrawResponse(
        id=draw.id, round_no=draw.round_no, draw_date=draw.draw_date,
        num1=draw.num1, num2=draw.num2, num3=draw.num3,
        num4=draw.num4, num5=draw.num5, num6=draw.num6,
        bonus=draw.bonus, numbers=draw.numbers,
        total_sales=draw.total_sales, first_prize=draw.first_prize,
        first_winners=draw.first_winners, created_at=draw.created_at,
    )
