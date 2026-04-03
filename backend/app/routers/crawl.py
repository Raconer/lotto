from fastapi import APIRouter, Depends, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.schemas.draw import CrawlResponse
from app.services.crawler import crawl_all_draws, crawl_latest_draw
from app.services.stats import update_number_stats, update_combination_stats, update_range_stats

router = APIRouter(prefix="/api/crawl", tags=["크롤링"])


async def _update_all_stats(db: AsyncSession):
    """크롤링 후 모든 통계를 갱신합니다."""
    await update_number_stats(db)
    await update_combination_stats(db, max_combo_size=3)
    await update_range_stats(db)


@router.post(
    "/all",
    response_model=CrawlResponse,
    summary="전체 회차 크롤링",
    description="동행복권에서 1회차부터 최신 회차까지 모든 당첨번호를 수집하고 DB에 저장합니다. "
    "이미 존재하는 회차는 건너뜁니다. 수집 후 통계가 자동 갱신됩니다.",
)
async def crawl_all(
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
):
    result = await crawl_all_draws(db)
    if result["new_rounds"] > 0:
        background_tasks.add_task(_update_all_stats, db)
    return CrawlResponse(**result)


@router.post(
    "/latest",
    response_model=CrawlResponse,
    summary="최신 회차 크롤링",
    description="동행복권에서 가장 최근 회차의 당첨번호만 수집합니다. "
    "이미 존재하면 건너뜁니다. 수집 후 통계가 자동 갱신됩니다.",
)
async def crawl_latest(
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
):
    result = await crawl_latest_draw(db)
    if result["new_rounds"] > 0:
        background_tasks.add_task(_update_all_stats, db)
    return CrawlResponse(**result)


@router.post(
    "/update-stats",
    summary="통계 갱신",
    description="DB에 저장된 당첨번호 기반으로 모든 통계(번호별, 조합별, 구간별)를 갱신합니다. "
    "크롤링 없이 기존 데이터로만 통계를 재계산합니다.",
)
async def update_stats(db: AsyncSession = Depends(get_db)):
    await _update_all_stats(db)
    return {"message": "통계 갱신 완료"}
