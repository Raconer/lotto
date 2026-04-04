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

CRAWL_STATUS_KEY = "crawl:status"


async def _set_status(status: dict):
    await redis_client.set(CRAWL_STATUS_KEY, jsonlib.dumps(status, ensure_ascii=False), ex=3600)


async def get_crawl_status() -> dict | None:
    data = await redis_client.get(CRAWL_STATUS_KEY)
    return jsonlib.loads(data) if data else None


async def get_db_status(db: AsyncSession) -> dict:
    result_max = await db.execute(select(func.max(Draw.round_no)))
    result_min = await db.execute(select(func.min(Draw.round_no)))
    result_count = await db.execute(select(func.count(Draw.id)))

    db_max = result_max.scalar() or 0
    db_min = result_min.scalar() or 0
    db_count = result_count.scalar() or 0

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
        "missing_rounds": missing[:50],
    }


async def _crawl_round_playwright(round_no: int) -> dict | None:
    """Playwright로 단일 회차를 크롤링합니다."""
    from playwright.async_api import async_playwright

    async with async_playwright() as pw:
        browser = await pw.chromium.launch(headless=True, args=['--no-sandbox', '--disable-setuid-sandbox'])
        page = await browser.new_page()

        try:
            url = f"https://dhlottery.co.kr/gameResult.do?method=byWin&drwNo={round_no}"
            await page.goto(url, wait_until="networkidle", timeout=20000)

            # 번호 추출
            balls = await page.query_selector_all('.ball_645')
            if len(balls) < 7:
                return None

            numbers = []
            for ball in balls[:6]:
                text = await ball.inner_text()
                numbers.append(int(text.strip()))

            bonus_text = await balls[6].inner_text()
            bonus = int(bonus_text.strip())

            # 추첨일
            date_el = await page.query_selector('.win_result .desc')
            draw_date = None
            if date_el:
                date_text = await date_el.inner_text()
                import re
                date_match = re.search(r'(\d{4})년\s*(\d{2})월\s*(\d{2})일', date_text)
                if date_match:
                    draw_date = datetime(int(date_match.group(1)), int(date_match.group(2)), int(date_match.group(3))).date()

            if not draw_date:
                # 회차 기반 추정 (1회차=2002-12-07, 매주 토요일)
                from datetime import timedelta
                draw_date = (datetime(2002, 12, 7) + timedelta(weeks=round_no - 1)).date()

            # 당첨금 (선택적)
            total_sales = None
            first_prize = None
            first_winners = None
            try:
                prize_el = await page.query_selector('.win_result .prize')
                if prize_el:
                    prize_text = await prize_el.inner_text()
                    import re
                    amount = re.sub(r'[^\d]', '', prize_text)
                    if amount:
                        first_prize = int(amount)

                winner_el = await page.query_selector('.win_result .num')
                if winner_el:
                    winner_text = await winner_el.inner_text()
                    amount = re.sub(r'[^\d]', '', winner_text)
                    if amount:
                        first_winners = int(amount)
            except Exception:
                pass

            numbers.sort()
            return {
                "round_no": round_no,
                "draw_date": draw_date,
                "num1": numbers[0],
                "num2": numbers[1],
                "num3": numbers[2],
                "num4": numbers[3],
                "num5": numbers[4],
                "num6": numbers[5],
                "bonus": bonus,
                "total_sales": total_sales,
                "first_prize": first_prize,
                "first_winners": first_winners,
            }
        except Exception as e:
            return None
        finally:
            await browser.close()


async def _crawl_round_batch_playwright(round_numbers: list[int]) -> list[dict]:
    """Playwright로 여러 회차를 배치 크롤링합니다. 브라우저 1개로 여러 페이지."""
    from playwright.async_api import async_playwright
    import re

    results = []

    async with async_playwright() as pw:
        browser = await pw.chromium.launch(headless=True, args=['--no-sandbox', '--disable-setuid-sandbox'])
        page = await browser.new_page()

        for round_no in round_numbers:
            try:
                url = f"https://dhlottery.co.kr/gameResult.do?method=byWin&drwNo={round_no}"
                await page.goto(url, wait_until="networkidle", timeout=20000)

                balls = await page.query_selector_all('.ball_645')
                if len(balls) < 7:
                    results.append(None)
                    continue

                numbers = []
                for ball in balls[:6]:
                    text = await ball.inner_text()
                    numbers.append(int(text.strip()))

                bonus_text = await balls[6].inner_text()
                bonus = int(bonus_text.strip())

                # 추첨일
                date_el = await page.query_selector('.win_result .desc')
                draw_date = None
                if date_el:
                    date_text = await date_el.inner_text()
                    date_match = re.search(r'(\d{4})년\s*(\d{2})월\s*(\d{2})일', date_text)
                    if date_match:
                        draw_date = datetime(int(date_match.group(1)), int(date_match.group(2)), int(date_match.group(3))).date()

                if not draw_date:
                    from datetime import timedelta
                    draw_date = (datetime(2002, 12, 7) + timedelta(weeks=round_no - 1)).date()

                # 당첨금
                first_prize = None
                first_winners = None
                try:
                    prize_els = await page.query_selector_all('.win_result .desc + .contents .money')
                    if prize_els:
                        prize_text = await prize_els[0].inner_text()
                        amount = re.sub(r'[^\d]', '', prize_text)
                        if amount:
                            first_prize = int(amount)
                except Exception:
                    pass

                numbers.sort()
                results.append({
                    "round_no": round_no,
                    "draw_date": draw_date,
                    "num1": numbers[0], "num2": numbers[1], "num3": numbers[2],
                    "num4": numbers[3], "num5": numbers[4], "num6": numbers[5],
                    "bonus": bonus,
                    "total_sales": None,
                    "first_prize": first_prize,
                    "first_winners": first_winners,
                })
            except Exception:
                results.append(None)

            await asyncio.sleep(0.5)

        await browser.close()

    return results


async def crawl_range(db: AsyncSession, start: int, end: int) -> dict:
    """지정 범위 크롤링 (Playwright) + 진행 상황 Redis 저장"""
    total = end - start + 1
    new_count = 0
    crawled = 0
    failed = 0

    await _set_status({
        "state": "running",
        "start": start, "end": end, "total": total,
        "current": start, "crawled": 0, "new": 0, "failed": 0,
        "progress": 0,
        "message": f"{start}~{end}회차 수집 시작 (Playwright)",
    })

    # 배치 크롤링 (10개씩)
    batch_size = 10
    for batch_start in range(start, end + 1, batch_size):
        batch_end = min(batch_start + batch_size - 1, end)
        round_numbers = list(range(batch_start, batch_end + 1))

        batch_results = await _crawl_round_batch_playwright(round_numbers)

        for i, draw_data in enumerate(batch_results):
            round_no = round_numbers[i]
            if draw_data:
                crawled += 1
                stmt = insert(Draw).values(**draw_data).on_conflict_do_nothing(index_elements=["round_no"])
                result = await db.execute(stmt)
                if result.rowcount > 0:
                    new_count += 1
            else:
                failed += 1

        progress = round((batch_end - start + 1) / total * 100, 1)
        await _set_status({
            "state": "running",
            "start": start, "end": end, "total": total,
            "current": batch_end, "crawled": crawled, "new": new_count, "failed": failed,
            "progress": progress,
            "message": f"{batch_end}/{end} 수집 중... ({progress}%)",
        })

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
    # 대략적 최신 회차 추정 (2002-12-07 시작, 매주 1회)
    from datetime import date, timedelta
    weeks = (date.today() - date(2002, 12, 7)).days // 7
    estimated_latest = weeks + 1
    start = db_latest + 1 if db_latest > 0 else 1

    if start > estimated_latest:
        return {"message": "이미 최신 데이터입니다.", "total_crawled": 0, "new_rounds": 0, "latest_round": db_latest}

    return await crawl_range(db, start, estimated_latest)


async def crawl_latest_draw(db: AsyncSession) -> dict:
    from datetime import date
    weeks = (date.today() - date(2002, 12, 7)).days // 7
    latest_round = weeks + 1
    return await crawl_range(db, latest_round, latest_round)
