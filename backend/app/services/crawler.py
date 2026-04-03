import httpx
import asyncio
from datetime import datetime
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.dialects.postgresql import insert

from app.models.draw import Draw
from app.core.config import get_settings

settings = get_settings()

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Accept": "application/json, text/javascript, */*; q=0.01",
    "Accept-Language": "ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7",
    "Referer": "https://dhlottery.co.kr/gameResult.do?method=byWin",
}


async def _create_session() -> httpx.AsyncClient:
    """쿠키를 받아온 세션을 생성합니다."""
    client = httpx.AsyncClient(
        timeout=20,
        follow_redirects=True,
        verify=False,
    )
    # 메인 페이지 방문으로 쿠키 확보
    try:
        await client.get("https://dhlottery.co.kr/common.do?method=main", headers={
            "User-Agent": HEADERS["User-Agent"],
        })
    except Exception:
        pass
    return client


async def _fetch_round(client: httpx.AsyncClient, round_no: int) -> dict | None:
    """단일 회차 API 호출"""
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
        import json
        data = json.loads(text)
        if data.get("returnValue") == "success":
            return data
    except Exception:
        pass
    return None


async def get_latest_round_from_api() -> int:
    """동행복권 API에서 최신 회차 번호를 이진 탐색으로 조회합니다."""
    client = await _create_session()
    try:
        low, high = 1, 1200
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


async def fetch_draw_from_api(client: httpx.AsyncClient, round_no: int) -> dict | None:
    """동행복권 API에서 특정 회차 당첨번호를 조회합니다."""
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


async def crawl_all_draws(db: AsyncSession) -> dict:
    """전체 회차 크롤링 후 DB에 저장합니다."""
    result = await db.execute(select(func.max(Draw.round_no)))
    db_latest = result.scalar() or 0

    api_latest = await get_latest_round_from_api()

    new_count = 0
    total_crawled = 0
    start = 1 if db_latest == 0 else db_latest + 1

    client = await _create_session()
    try:
        for round_no in range(start, api_latest + 1):
            draw_data = await fetch_draw_from_api(client, round_no)
            if draw_data:
                total_crawled += 1
                stmt = insert(Draw).values(**draw_data).on_conflict_do_nothing(index_elements=["round_no"])
                result = await db.execute(stmt)
                if result.rowcount > 0:
                    new_count += 1

            # API 부하 방지
            if round_no % 10 == 0:
                await asyncio.sleep(0.5)
    finally:
        await client.aclose()

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
    client = await _create_session()
    try:
        draw_data = await fetch_draw_from_api(client, api_latest)
    finally:
        await client.aclose()

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
