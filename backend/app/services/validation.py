from sqlalchemy import select, desc
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.draw import Draw, NumberStat, CombinationStat
from itertools import combinations


async def validate_numbers(db: AsyncSession, numbers: list[int]) -> dict:
    """사용자 입력 번호 6개를 분석하여 점수를 매깁니다."""
    numbers = sorted(numbers)

    # 1. 번호별 빈도 점수
    stats_result = await db.execute(select(NumberStat).where(NumberStat.number.in_(numbers)))
    stats = {s.number: s for s in stats_result.scalars().all()}

    total_result = await db.execute(select(Draw))
    draws = total_result.scalars().all()
    total_draws = len(draws)
    latest_round = max(d.round_no for d in draws) if draws else 0

    freq_scores = []
    for num in numbers:
        if num in stats and total_draws > 0:
            prob = stats[num].frequency / total_draws
            freq_scores.append(min(prob * 100 / (6 / 45 * 100) * 100, 100))
        else:
            freq_scores.append(0)
    frequency_score = sum(freq_scores) / len(freq_scores) if freq_scores else 0

    # 2. 조합 점수 (2개 조합 기준)
    combo_scores = []
    for combo in combinations(numbers, 2):
        result = await db.execute(
            select(CombinationStat).where(
                CombinationStat.combination == list(combo),
                CombinationStat.combo_size == 2,
            )
        )
        cs = result.scalar_one_or_none()
        if cs and total_draws > 0:
            combo_scores.append(min(cs.frequency / total_draws * 100 / (1 / 45 * 100) * 100, 100))
        else:
            combo_scores.append(0)
    combination_score = sum(combo_scores) / len(combo_scores) if combo_scores else 0

    # 3. 균형 점수
    ranges = {
        "1-10": sum(1 for n in numbers if 1 <= n <= 10),
        "11-20": sum(1 for n in numbers if 11 <= n <= 20),
        "21-30": sum(1 for n in numbers if 21 <= n <= 30),
        "31-40": sum(1 for n in numbers if 31 <= n <= 40),
        "41-45": sum(1 for n in numbers if 41 <= n <= 45),
    }
    odd_count = sum(1 for n in numbers if n % 2 == 1)
    even_count = 6 - odd_count
    num_sum = sum(numbers)

    # 구간 분포 점수 (균등할수록 높음)
    filled_ranges = sum(1 for v in ranges.values() if v > 0)
    range_score = filled_ranges / 5 * 100

    # 홀짝 균형 (3:3이 최고)
    odd_even_score = (1 - abs(odd_count - even_count) / 6) * 100

    # 합계 범위 (100~175가 이상적)
    if 100 <= num_sum <= 175:
        sum_score = 100
    elif 80 <= num_sum <= 195:
        sum_score = 70
    else:
        sum_score = 30

    balance_score = (range_score + odd_even_score + sum_score) / 3

    # 4. 과거 매칭
    past_matches = []
    for draw in sorted(draws, key=lambda d: d.round_no, reverse=True)[:20]:
        matched = set(numbers) & set(draw.numbers)
        if len(matched) >= 3:
            past_matches.append({
                "round_no": draw.round_no,
                "draw_date": str(draw.draw_date),
                "matched_count": len(matched),
                "matched_numbers": sorted(list(matched)),
                "draw_numbers": draw.numbers,
            })

    # 종합 점수
    total_score = frequency_score * 0.3 + combination_score * 0.3 + balance_score * 0.4

    return {
        "numbers": numbers,
        "score": round(total_score, 1),
        "frequency_score": round(frequency_score, 1),
        "combination_score": round(combination_score, 1),
        "balance_score": round(balance_score, 1),
        "past_matches": past_matches,
        "details": {
            "range_distribution": ranges,
            "odd_even": {"odd": odd_count, "even": even_count},
            "sum": num_sum,
            "overdue": {
                num: latest_round - stats[num].last_appeared if num in stats and stats[num].last_appeared else None
                for num in numbers
            },
        },
    }
