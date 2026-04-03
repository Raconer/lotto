from sqlalchemy import select, func, desc
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.dialects.postgresql import insert
from itertools import combinations

from app.models.draw import Draw, NumberStat, CombinationStat, RangeStat


async def update_number_stats(db: AsyncSession) -> None:
    """번호별 통계를 갱신합니다."""
    result = await db.execute(select(Draw).order_by(Draw.round_no))
    draws = result.scalars().all()

    if not draws:
        return

    latest_round = draws[-1].round_no
    freq = {n: 0 for n in range(1, 46)}
    last_seen = {n: 0 for n in range(1, 46)}
    intervals = {n: [] for n in range(1, 46)}
    prev_seen = {n: 0 for n in range(1, 46)}

    for draw in draws:
        for num in draw.numbers:
            freq[num] += 1
            if prev_seen[num] > 0:
                intervals[num].append(draw.round_no - prev_seen[num])
            prev_seen[num] = draw.round_no
            last_seen[num] = draw.round_no

    # 핫/콜드 기준: 최근 20회차
    recent_draws = draws[-20:] if len(draws) >= 20 else draws
    recent_freq = {n: 0 for n in range(1, 46)}
    for draw in recent_draws:
        for num in draw.numbers:
            recent_freq[num] += 1

    avg_recent = sum(recent_freq.values()) / 45
    hot_threshold = avg_recent * 1.5
    cold_threshold = avg_recent * 0.5

    for num in range(1, 46):
        avg_int = sum(intervals[num]) / len(intervals[num]) if intervals[num] else None
        stmt = (
            insert(NumberStat)
            .values(
                number=num,
                frequency=freq[num],
                last_appeared=last_seen[num] if last_seen[num] > 0 else None,
                avg_interval=avg_int,
                is_hot=recent_freq[num] >= hot_threshold,
                is_cold=recent_freq[num] <= cold_threshold,
            )
            .on_conflict_do_update(
                index_elements=["number"],
                set_={
                    "frequency": freq[num],
                    "last_appeared": last_seen[num] if last_seen[num] > 0 else None,
                    "avg_interval": avg_int,
                    "is_hot": recent_freq[num] >= hot_threshold,
                    "is_cold": recent_freq[num] <= cold_threshold,
                },
            )
        )
        await db.execute(stmt)

    await db.commit()


async def update_combination_stats(db: AsyncSession, max_combo_size: int = 3) -> None:
    """조합 통계를 갱신합니다. (2~max_combo_size, 기본 3까지. 4이상은 알고리즘 서버에서)"""
    result = await db.execute(select(Draw).order_by(Draw.round_no))
    draws = result.scalars().all()

    if not draws:
        return

    total_draws = len(draws)
    combo_freq: dict[tuple, dict] = {}

    for draw in draws:
        nums = sorted(draw.numbers)
        for size in range(2, max_combo_size + 1):
            for combo in combinations(nums, size):
                key = combo
                if key not in combo_freq:
                    combo_freq[key] = {"freq": 0, "last": 0}
                combo_freq[key]["freq"] += 1
                combo_freq[key]["last"] = draw.round_no

    for combo, data in combo_freq.items():
        stmt = (
            insert(CombinationStat)
            .values(
                combination=list(combo),
                combo_size=len(combo),
                frequency=data["freq"],
                probability=round(data["freq"] / total_draws * 100, 4),
                last_appeared=data["last"],
            )
            .on_conflict_do_update(
                index_elements=["combination"],
                set_={
                    "frequency": data["freq"],
                    "probability": round(data["freq"] / total_draws * 100, 4),
                    "last_appeared": data["last"],
                },
            )
        )
        await db.execute(stmt)

    await db.commit()


async def update_range_stats(db: AsyncSession) -> None:
    """구간별 통계를 갱신합니다."""
    result = await db.execute(select(Draw).order_by(Draw.round_no))
    draws = result.scalars().all()

    for draw in draws:
        nums = draw.numbers
        sorted_nums = sorted(nums)

        consecutive = 0
        for i in range(len(sorted_nums) - 1):
            if sorted_nums[i + 1] - sorted_nums[i] == 1:
                consecutive += 1

        stmt = (
            insert(RangeStat)
            .values(
                round_no=draw.round_no,
                range_1_10=sum(1 for n in nums if 1 <= n <= 10),
                range_11_20=sum(1 for n in nums if 11 <= n <= 20),
                range_21_30=sum(1 for n in nums if 21 <= n <= 30),
                range_31_40=sum(1 for n in nums if 31 <= n <= 40),
                range_41_45=sum(1 for n in nums if 41 <= n <= 45),
                odd_count=sum(1 for n in nums if n % 2 == 1),
                even_count=sum(1 for n in nums if n % 2 == 0),
                sum_total=sum(nums),
                consecutive_pairs=consecutive,
            )
            .on_conflict_do_update(
                index_elements=["round_no"],
                set_={
                    "range_1_10": sum(1 for n in nums if 1 <= n <= 10),
                    "range_11_20": sum(1 for n in nums if 11 <= n <= 20),
                    "range_21_30": sum(1 for n in nums if 21 <= n <= 30),
                    "range_31_40": sum(1 for n in nums if 31 <= n <= 40),
                    "range_41_45": sum(1 for n in nums if 41 <= n <= 45),
                    "odd_count": sum(1 for n in nums if n % 2 == 1),
                    "even_count": sum(1 for n in nums if n % 2 == 0),
                    "sum_total": sum(nums),
                    "consecutive_pairs": consecutive,
                },
            )
        )
        await db.execute(stmt)

    await db.commit()


async def get_number_stats(db: AsyncSession) -> list[dict]:
    """번호별 통계를 조회합니다."""
    result = await db.execute(select(Draw))
    draws = result.scalars().all()
    latest_round = max(d.round_no for d in draws) if draws else 0
    total_draws = len(draws)

    stats_result = await db.execute(select(NumberStat).order_by(NumberStat.number))
    stats = stats_result.scalars().all()

    return [
        {
            "number": s.number,
            "frequency": s.frequency,
            "probability": round(s.frequency / total_draws * 100, 2) if total_draws else 0,
            "last_appeared": s.last_appeared,
            "overdue": latest_round - s.last_appeared if s.last_appeared else latest_round,
            "avg_interval": round(s.avg_interval, 2) if s.avg_interval else None,
            "is_hot": s.is_hot,
            "is_cold": s.is_cold,
        }
        for s in stats
    ]


async def get_combination_stats(db: AsyncSession, combo_size: int, limit: int = 50, order: str = "desc") -> list:
    """조합 통계를 조회합니다."""
    query = select(CombinationStat).where(CombinationStat.combo_size == combo_size)

    if order == "desc":
        query = query.order_by(desc(CombinationStat.frequency))
    else:
        query = query.order_by(CombinationStat.frequency)

    query = query.limit(limit)
    result = await db.execute(query)
    return result.scalars().all()


async def get_range_stats(db: AsyncSession, limit: int = 50) -> list:
    """구간별 통계를 조회합니다."""
    result = await db.execute(
        select(RangeStat).order_by(desc(RangeStat.round_no)).limit(limit)
    )
    return result.scalars().all()
