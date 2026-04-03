import httpx
from datetime import datetime
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.dialects.postgresql import insert

from app.models.draw import Draw
from app.core.config import get_settings

settings = get_settings()


async def get_latest_round_from_api() -> int:
    """동행복권 API에서 최신 회차 번호를 조회합니다."""
    async with httpx.AsyncClient(timeout=10) as client:
        resp = await client.get(f"{settings.DHLOTTERY_API_URL}1")
        data = resp.json()
        if data.get("returnValue") == "success":
            # 최신 회차를 찾기 위해 큰 번호로 시도
            round_no = 1200
            while True:
                resp = await client.get(f"{settings.DHLOTTERY_API_URL}{round_no}")
                data = resp.json()
                if data.get("returnValue") == "success":
                    round_no += 1
                else:
                    return round_no - 1
    return 1


async def fetch_draw_from_api(round_no: int) -> dict | None:
    """동행복권 API에서 특정 회차 당첨번호를 조회합니다."""
    async with httpx.AsyncClient(timeout=10) as client:
        resp = await client.get(f"{settings.DHLOTTERY_API_URL}{round_no}")
        data = resp.json()

        if data.get("returnValue") != "success":
            return None

        return {
            "round_no": data["drwNo"],
            "draw_date": datetime.strptime(data["drwNoDate"], "%Y-%m-%d").date(),
            "num1": data["drwtNo1"],
            "num2": data["drwtNo2"],
            "num3": data["drwtNo3"],
            "num4": data["drwtNo4"],
            "num5": data["drwtNo5"],
            "num6": data["drwtNo6"],
            "bonus": data["bnusNo"],
            "total_sales": data.get("totSellamnt"),
            "first_prize": data.get("firstWinamnt"),
            "first_winners": data.get("firstPrzwnerCo"),
        }


async def crawl_all_draws(db: AsyncSession) -> dict:
    """전체 회차 크롤링 후 DB에 저장합니다."""
    # DB에 저장된 최신 회차 조회
    result = await db.execute(select(func.max(Draw.round_no)))
    db_latest = result.scalar() or 0

    # API에서 최신 회차 조회
    api_latest = await get_latest_round_from_api()

    new_count = 0
    total_crawled = 0

    # 1회차부터 누락된 회차 모두 수집
    if db_latest == 0:
        start = 1
    else:
        start = db_latest + 1

    for round_no in range(start, api_latest + 1):
        draw_data = await fetch_draw_from_api(round_no)
        if draw_data:
            total_crawled += 1
            stmt = insert(Draw).values(**draw_data).on_conflict_do_nothing(index_elements=["round_no"])
            result = await db.execute(stmt)
            if result.rowcount > 0:
                new_count += 1

    await db.commit()

    return {
        "message": f"크롤링 완료: {total_crawled}개 수집, {new_count}개 신규 저장",
        "total_crawled": total_crawled,
        "new_rounds": new_count,
        "latest_round": api_latest,
    }


async def crawl_latest_draw(db: AsyncSession) -> dict:
    """최신 회차만 크롤링합니다."""
    api_latest = await get_latest_round_from_api()
    draw_data = await fetch_draw_from_api(api_latest)

    if not draw_data:
        return {
            "message": "최신 회차 데이터를 가져올 수 없습니다.",
            "total_crawled": 0,
            "new_rounds": 0,
            "latest_round": api_latest,
        }

    stmt = insert(Draw).values(**draw_data).on_conflict_do_nothing(index_elements=["round_no"])
    result = await db.execute(stmt)
    await db.commit()

    new_count = 1 if result.rowcount > 0 else 0
    return {
        "message": f"최신 {api_latest}회차 {'저장 완료' if new_count else '이미 존재'}",
        "total_crawled": 1,
        "new_rounds": new_count,
        "latest_round": api_latest,
    }
