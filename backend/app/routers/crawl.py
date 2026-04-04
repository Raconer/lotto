import csv
import io
from datetime import datetime
from fastapi import APIRouter, Depends, BackgroundTasks, Query, UploadFile, File
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.dialects.postgresql import insert as pg_insert

from app.core.database import get_db, async_session
from app.schemas.draw import CrawlResponse
from app.services.crawler import (
    crawl_all_draws, crawl_latest_draw, crawl_range,
    get_crawl_status, get_db_status,
)
from app.services.stats import update_number_stats, update_combination_stats, update_range_stats

router = APIRouter(prefix="/api/crawl", tags=["크롤링"])


async def _update_all_stats_background():
    """백그라운드에서 통계 갱신 (새 세션 사용)"""
    async with async_session() as db:
        await update_number_stats(db)
        await update_combination_stats(db, max_combo_size=3)
        await update_range_stats(db)


@router.post(
    "/all",
    summary="전체 미수집 회차 크롤링",
    description="DB에 없는 회차부터 최신 회차까지 크롤링합니다.",
)
async def crawl_all(background_tasks: BackgroundTasks, db: AsyncSession = Depends(get_db)):
    result = await crawl_all_draws(db)
    if result["new_rounds"] > 0:
        background_tasks.add_task(_update_all_stats_background)
    return result


@router.post(
    "/range",
    summary="범위 지정 크롤링",
    description="시작 회차~끝 회차를 지정하여 크롤링합니다. 진행 상황은 GET /api/crawl/status로 확인 가능합니다.",
)
async def crawl_by_range(
    start: int = Query(..., ge=1, description="시작 회차"),
    end: int = Query(..., ge=1, description="끝 회차"),
    background_tasks: BackgroundTasks = None,
    db: AsyncSession = Depends(get_db),
):
    if end < start:
        return {"error": "끝 회차가 시작보다 작습니다."}
    if end - start > 500:
        return {"error": "한 번에 최대 500회차까지 수집 가능합니다."}

    result = await crawl_range(db, start, end)
    if result["new_rounds"] > 0 and background_tasks:
        background_tasks.add_task(_update_all_stats_background)
    return result


@router.post(
    "/latest",
    summary="최신 회차 크롤링",
    description="가장 최근 회차 1개만 수집합니다.",
)
async def crawl_latest(background_tasks: BackgroundTasks, db: AsyncSession = Depends(get_db)):
    result = await crawl_latest_draw(db)
    if result["new_rounds"] > 0:
        background_tasks.add_task(_update_all_stats_background)
    return result


@router.get(
    "/status",
    summary="크롤링 진행 상황",
    description="현재 진행 중인 크롤링의 상태를 반환합니다. 페이지 이동 후에도 조회 가능합니다.",
)
async def crawl_status():
    status = await get_crawl_status()
    return status or {"state": "idle", "message": "진행 중인 크롤링이 없습니다."}


@router.get(
    "/db-status",
    summary="DB 데이터 현황",
    description="DB에 저장된 회차 범위, 총 개수, 누락 회차를 반환합니다.",
)
async def db_status(db: AsyncSession = Depends(get_db)):
    return await get_db_status(db)


@router.post(
    "/update-stats",
    summary="통계 갱신",
    description="기존 데이터 기반으로 통계를 재계산합니다.",
)
async def update_stats(db: AsyncSession = Depends(get_db)):
    await update_number_stats(db)
    await update_combination_stats(db, max_combo_size=3)
    await update_range_stats(db)
    return {"message": "통계 갱신 완료"}


@router.post(
    "/manual",
    summary="수동 회차 입력",
    description="회차 번호, 추첨일, 당첨번호 6개, 보너스를 직접 입력합니다.",
)
async def manual_input(
    round_no: int = Query(..., ge=1),
    draw_date: str = Query(..., description="YYYY-MM-DD"),
    num1: int = Query(..., ge=1, le=45),
    num2: int = Query(..., ge=1, le=45),
    num3: int = Query(..., ge=1, le=45),
    num4: int = Query(..., ge=1, le=45),
    num5: int = Query(..., ge=1, le=45),
    num6: int = Query(..., ge=1, le=45),
    bonus: int = Query(..., ge=1, le=45),
    background_tasks: BackgroundTasks = None,
    db: AsyncSession = Depends(get_db),
):
    from app.models.draw import Draw
    nums = sorted([num1, num2, num3, num4, num5, num6])
    if len(set(nums + [bonus])) != 7:
        return {"error": "번호가 중복됩니다."}

    stmt = pg_insert(Draw).values(
        round_no=round_no, draw_date=datetime.strptime(draw_date, "%Y-%m-%d").date(),
        num1=nums[0], num2=nums[1], num3=nums[2], num4=nums[3], num5=nums[4], num6=nums[5],
        bonus=bonus,
    ).on_conflict_do_update(
        index_elements=["round_no"],
        set_={"num1": nums[0], "num2": nums[1], "num3": nums[2], "num4": nums[3], "num5": nums[4], "num6": nums[5], "bonus": bonus},
    )
    await db.execute(stmt)
    await db.commit()
    if background_tasks:
        background_tasks.add_task(_update_all_stats_background)
    return {"message": f"{round_no}회차 저장 완료", "numbers": nums, "bonus": bonus}


@router.post(
    "/upload-csv",
    summary="CSV 파일 업로드",
    description="CSV 파일로 여러 회차를 한 번에 업로드합니다. 형식: round_no,draw_date,num1,num2,num3,num4,num5,num6,bonus",
)
async def upload_csv(
    file: UploadFile = File(...),
    background_tasks: BackgroundTasks = None,
    db: AsyncSession = Depends(get_db),
):
    from app.models.draw import Draw
    content = (await file.read()).decode("utf-8-sig")
    reader = csv.DictReader(io.StringIO(content))

    inserted = 0
    errors = []
    for i, row in enumerate(reader):
        try:
            rn = int(row.get("round_no") or row.get("회차"))
            dd = row.get("draw_date") or row.get("추첨일") or ""
            nums = sorted([int(row.get(f"num{j}") or row.get(f"번호{j}")) for j in range(1, 7)])
            bn = int(row.get("bonus") or row.get("보너스"))

            draw_date = datetime.strptime(dd.strip(), "%Y-%m-%d").date() if dd.strip() else None
            stmt = pg_insert(Draw).values(
                round_no=rn, draw_date=draw_date,
                num1=nums[0], num2=nums[1], num3=nums[2], num4=nums[3], num5=nums[4], num6=nums[5],
                bonus=bn,
            ).on_conflict_do_nothing(index_elements=["round_no"])
            result = await db.execute(stmt)
            if result.rowcount > 0:
                inserted += 1
        except Exception as e:
            errors.append(f"행 {i+1}: {str(e)}")

    await db.commit()
    if inserted > 0 and background_tasks:
        background_tasks.add_task(_update_all_stats_background)
    return {"message": f"업로드 완료: {inserted}개 신규 저장", "inserted": inserted, "errors": errors[:10]}
