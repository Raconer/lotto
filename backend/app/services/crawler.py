import httpx
import asyncio
import json as jsonlib
from datetime import datetime
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.dialects.postgresql import insert

from app.models.draw import Draw
from app.core.config import get_settings
from app.core.redis import redis_client

settings = get_settings()

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Accept": "application/json, text/javascript, */*; q=0.01",
    "Accept-Language": "ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7",
    "Referer": "https://dhlottery.co.kr/gameResult.do?method=byWin",
}

CRAWL_STATUS_KEY = "crawl:status"


async def _set_status(status: dict):
    await redis_client.set(CRAWL_STATUS_KEY, jsonlib.dumps(status, ensure_ascii=False), ex=3600)


async def get_crawl_status() -> dict | None:
    data = await redis_client.get(CRAWL_STATUS_KEY)
    return jsonlib.loads(data) if data else None


async def _create_session() -> httpx.AsyncClient:
    client = httpx.AsyncClient(timeout=20, follow_redirects=True, verify=False)
    try:
        await client.get("https://dhlottery.co.kr/common.do?method=main", headers={"User-Agent": HEADERS["User-Agent"]})
    except Exception:
        pass
    return client


async def _fetch_round(client: httpx.AsyncClient, round_no: int) -> dict | None:
    try:
        resp = await client.get(
            f"https://www.dhlottery.co.kr/common.do?method=getLottoNumber&drwNo={round_no}",
            headers=HEADERS,
        )
        if resp.status_code != 200:
            return None
        text = resp.text.strip()
        if not text.startswith("{"):
            return None
        data = jsonlib.loads(text)
        if data.get("returnValue") == "success":
            return data
    except Exception:
        pass
    return None


async def get_latest_round_from_api() -> int:
    client = await _create_session()
    try:
        low, high = 1, 1250
        while low < high:
            mid = (low + high + 1) // 2
            data = await _fetch_round(client, mid)
            if data:
                low = mid
            else:
                high = mid - 1
        return low
    finally:
        await client.aclose()


async def get_db_status(db: AsyncSession) -> dict:
    """DB에 저장된 데이터 현황을 반환합니다."""
    result_max = await db.execute(select(func.max(Draw.round_no)))
    result_min = await db.execute(select(func.min(Draw.round_no)))
    result_count = await db.execute(select(func.count(Draw.id)))

    db_max = result_max.scalar() or 0
    db_min = result_min.scalar() or 0
    db_count = result_count.scalar() or 0

    # 누락 회차 찾기
    if db_count > 0:
        all_rounds_result = await db.execute(select(Draw.round_no))
        existing = set(r[0] for r in all_rounds_result.fetchall())
        missing = [r for r in range(db_min, db_max + 1) if r not in existing]
    else:
        missing = []

    return {
        "db_min": db_min,
        "db_max": db_max,
        "db_count": db_count,
        "missing_count": len(missing),
        "missing_rounds": missing[:50],  # 최대 50개만
    }


async def fetch_draw_from_api(client: httpx.AsyncClient, round_no: int) -> dict | None:
    data = await _fetch_round(client, round_no)
    if not data:
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


async def crawl_range(db: AsyncSession, start: int, end: int) -> dict:
    """지정 범위 크롤링 + 진행 상황 Redis 저장"""
    total = end - start + 1
    new_count = 0
    crawled = 0
    failed = 0

    await _set_status({
        "state": "running",
        "start": start, "end": end, "total": total,
        "current": start, "crawled": 0, "new": 0, "failed": 0,
        "progress": 0,
        "message": f"{start}~{end}회차 수집 시작",
    })

    client = await _create_session()
    try:
        for round_no in range(start, end + 1):
            draw_data = await fetch_draw_from_api(client, round_no)
            if draw_data:
                crawled += 1
                stmt = insert(Draw).values(**draw_data).on_conflict_do_nothing(index_elements=["round_no"])
                result = await db.execute(stmt)
                if result.rowcount > 0:
                    new_count += 1
            else:
                failed += 1

            progress = round((round_no - start + 1) / total * 100, 1)
            await _set_status({
                "state": "running",
                "start": start, "end": end, "total": total,
                "current": round_no, "crawled": crawled, "new": new_count, "failed": failed,
                "progress": progress,
                "message": f"{round_no}/{end} 수집 중... ({progress}%)",
            })

            if round_no % 10 == 0:
                await asyncio.sleep(0.3)
    finally:
        await client.aclose()

    await db.commit()

    await _set_status({
        "state": "done",
        "start": start, "end": end, "total": total,
        "current": end, "crawled": crawled, "new": new_count, "failed": failed,
        "progress": 100,
        "message": f"완료: {crawled}개 수집, {new_count}개 신규, {failed}개 실패",
    })

    return {
        "message": f"{start}~{end}회차 수집 완료: {crawled}개 수집, {new_count}개 신규 저장",
        "total_crawled": crawled,
        "new_rounds": new_count,
        "failed": failed,
        "latest_round": end,
    }


async def crawl_all_draws(db: AsyncSession) -> dict:
    result = await db.execute(select(func.max(Draw.round_no)))
    db_latest = result.scalar() or 0
    api_latest = await get_latest_round_from_api()
    start = 1 if db_latest == 0 else db_latest + 1

    if start > api_latest:
        return {"message": "이미 최신 데이터입니다.", "total_crawled": 0, "new_rounds": 0, "latest_round": api_latest}

    return await crawl_range(db, start, api_latest)


async def crawl_latest_draw(db: AsyncSession) -> dict:
    api_latest = await get_latest_round_from_api()
    client = await _create_session()
    try:
        draw_data = await fetch_draw_from_api(client, api_latest)
    finally:
        await client.aclose()

    if not draw_data:
        return {"message": "최신 회차 데이터를 가져올 수 없습니다.", "total_crawled": 0, "new_rounds": 0, "latest_round": api_latest}

    stmt = insert(Draw).values(**draw_data).on_conflict_do_nothing(index_elements=["round_no"])
    result = await db.execute(stmt)
    await db.commit()

    new_count = 1 if result.rowcount > 0 else 0
    return {
        "message": f"최신 {api_latest}회차 {'저장 완료' if new_count else '이미 존재'}",
        "total_crawled": 1, "new_rounds": new_count, "latest_round": api_latest,
    }
