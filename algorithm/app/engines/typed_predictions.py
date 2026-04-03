"""5종류 타입별 추천 번호 생성 엔진"""

import numpy as np
from collections import Counter
from itertools import combinations


def _get_freq(draws: list[list[int]]) -> Counter:
    return Counter(n for nums in draws for n in nums)


def _get_recent_freq(draws: list[list[int]], recent: int = 20) -> Counter:
    return Counter(n for nums in draws[-recent:] for n in nums)


def _validate_set(numbers: list[int], draws: list[list[int]]) -> dict:
    """번호 세트의 품질 점수를 계산합니다."""
    nums = sorted(numbers)
    odd = sum(1 for n in nums if n % 2 == 1)
    even = 6 - odd
    total = sum(nums)
    ranges_hit = len(set(
        0 if n <= 10 else 1 if n <= 20 else 2 if n <= 30 else 3 if n <= 40 else 4
        for n in nums
    ))
    consec = sum(1 for i in range(5) if nums[i + 1] - nums[i] == 1)

    return {
        "odd_even": f"{odd}:{even}",
        "sum": total,
        "range_coverage": f"{ranges_hit}/5",
        "consecutive_pairs": consec,
    }


def predict_hot(draws: list[list[int]]) -> dict:
    """
    타입1: 핫넘버 - 최근 20회차에서 자주 나온 번호 위주
    전략: 최근 트렌드를 따라가는 공격적 전략
    """
    recent_freq = _get_recent_freq(draws, 20)
    all_freq = _get_freq(draws)

    # 최근 빈도 70% + 전체 빈도 30%
    weights = np.zeros(45)
    for i in range(1, 46):
        r = recent_freq.get(i, 0) / 20
        a = all_freq.get(i, 0) / len(draws)
        weights[i - 1] = r * 0.7 + a * 0.3

    weights = weights / weights.sum() if weights.sum() > 0 else np.ones(45) / 45

    best = None
    best_score = -1
    for _ in range(1000):
        sel = sorted(np.random.choice(range(1, 46), size=6, replace=False, p=weights).tolist())
        score = sum(weights[n - 1] for n in sel)
        # 구간 분포 보너스
        ranges = len(set(0 if n <= 10 else 1 if n <= 20 else 2 if n <= 30 else 3 if n <= 40 else 4 for n in sel))
        score += ranges * 0.5
        if score > best_score:
            best_score = score
            best = sel

    hot_nums = [n for n, _ in recent_freq.most_common(10)]
    return {
        "type": "hot",
        "type_name": "핫넘버",
        "type_desc": "최근 20회차에서 자주 출현한 번호 위주의 공격적 전략",
        "numbers": best,
        "analysis": _validate_set(best, draws),
        "detail": {
            "hot_numbers": hot_nums,
            "strategy": "최근 빈도 70% + 전체 빈도 30% 가중치",
        },
    }


def predict_cold(draws: list[list[int]]) -> dict:
    """
    타입2: 콜드넘버 - 오래 안 나온 번호 위주
    전략: 평균 회귀를 노리는 역발상 전략
    """
    latest = len(draws)
    last_seen = {n: 0 for n in range(1, 46)}
    intervals = {n: [] for n in range(1, 46)}
    prev = {n: 0 for n in range(1, 46)}

    for idx, nums in enumerate(draws, 1):
        for n in nums:
            if prev[n] > 0:
                intervals[n].append(idx - prev[n])
            prev[n] = idx
            last_seen[n] = idx

    # 오버듀 비율 = 현재간격 / 평균간격
    weights = np.zeros(45)
    overdue_info = {}
    for n in range(1, 46):
        gap = latest - last_seen[n]
        avg = np.mean(intervals[n]) if intervals[n] else latest
        ratio = gap / avg if avg > 0 else 1.0
        weights[n - 1] = max(ratio, 0.1)
        overdue_info[n] = {"gap": gap, "avg_interval": round(avg, 1), "overdue_ratio": round(ratio, 2)}

    weights = weights / weights.sum()

    best = None
    best_score = -1
    for _ in range(1000):
        sel = sorted(np.random.choice(range(1, 46), size=6, replace=False, p=weights).tolist())
        score = sum(weights[n - 1] for n in sel)
        odd = sum(1 for n in sel if n % 2 == 1)
        if 2 <= odd <= 4:
            score += 0.3
        total = sum(sel)
        if 100 <= total <= 175:
            score += 0.3
        if score > best_score:
            best_score = score
            best = sel

    top_overdue = sorted(range(1, 46), key=lambda n: weights[n - 1], reverse=True)[:10]
    return {
        "type": "cold",
        "type_name": "콜드넘버",
        "type_desc": "오래 미출현한 번호 위주 - 평균 회귀를 노리는 역발상 전략",
        "numbers": best,
        "analysis": _validate_set(best, draws),
        "detail": {
            "top_overdue": top_overdue,
            "overdue_info": {str(n): overdue_info[n] for n in best},
            "strategy": "미출현간격 / 평균간격 비율 가중치",
        },
    }


def predict_balanced(draws: list[list[int]]) -> dict:
    """
    타입3: 균형 조합 - 구간/홀짝/합계 최적 균형
    전략: 통계적으로 가장 이상적인 분포를 만족하는 조합
    """
    all_freq = _get_freq(draws)
    weights = np.array([all_freq.get(i, 1) for i in range(1, 46)], dtype=float)
    weights = weights / weights.sum()

    # 이상적 패턴
    sum_values = [sum(nums) for nums in draws]
    target_sum = np.mean(sum_values)
    target_std = np.std(sum_values)
    odd_counts = [sum(1 for n in nums if n % 2 == 1) for nums in draws]
    target_odd = int(np.median(odd_counts))  # 보통 3

    best = None
    best_score = -1
    for _ in range(3000):
        sel = sorted(np.random.choice(range(1, 46), size=6, replace=False, p=weights).tolist())

        score = 0
        # 홀짝 균형 (3:3 최고)
        odd = sum(1 for n in sel if n % 2 == 1)
        if odd == 3:
            score += 40
        elif odd in (2, 4):
            score += 25

        # 합계 범위
        total = sum(sel)
        z = abs(total - target_sum) / target_std if target_std > 0 else 0
        if z < 0.5:
            score += 40
        elif z < 1.0:
            score += 25

        # 구간 커버리지 (5구간 중 4~5개 커버)
        ranges = len(set(
            0 if n <= 10 else 1 if n <= 20 else 2 if n <= 30 else 3 if n <= 40 else 4
            for n in sel
        ))
        score += ranges * 8

        # 연번 적절 (0~1개)
        consec = sum(1 for i in range(5) if sel[i + 1] - sel[i] == 1)
        if consec <= 1:
            score += 10

        if score > best_score:
            best_score = score
            best = sel

    return {
        "type": "balanced",
        "type_name": "균형 조합",
        "type_desc": "홀짝 3:3, 합계 100~175, 구간 균등 분포의 이상적 조합",
        "numbers": best,
        "analysis": _validate_set(best, draws),
        "detail": {
            "target_odd_even": f"{target_odd}:{6 - target_odd}",
            "target_sum_range": f"{target_sum - target_std:.0f}~{target_sum + target_std:.0f}",
            "strategy": "홀짝/합계/구간/연번 종합 최적화",
        },
    }


def predict_rare(draws: list[list[int]]) -> dict:
    """
    타입4: 희소 조합 - 최근에 잘 안 나오는 패턴 조합
    전략: 남들이 안 고르는 번호대, 인기 없는 조합으로 1등 독식 노림
    """
    # 최근 50회 번호 패턴 분석
    recent = draws[-50:]
    recent_freq = Counter(n for nums in recent for n in nums)

    # 최근 빈도 낮은 번호에 가중치
    weights = np.zeros(45)
    for i in range(1, 46):
        freq = recent_freq.get(i, 0)
        weights[i - 1] = max(1.0 / (freq + 1), 0.01)
    weights = weights / weights.sum()

    # 쌍 빈도도 고려 (자주 나오는 쌍 회피)
    pair_freq = Counter()
    for nums in recent:
        for pair in combinations(sorted(nums), 2):
            pair_freq[pair] += 1

    best = None
    best_score = -1
    for _ in range(2000):
        sel = sorted(np.random.choice(range(1, 46), size=6, replace=False, p=weights).tolist())

        score = 0
        # 희소성 점수 (최근에 적게 나온 번호일수록 높음)
        for n in sel:
            score += weights[n - 1] * 100

        # 쌍 희소성 (최근에 잘 안 같이 나온 쌍)
        for pair in combinations(sel, 2):
            pf = pair_freq.get(pair, 0)
            score += max(5 - pf, 0)

        # 최소 균형 보장
        odd = sum(1 for n in sel if n % 2 == 1)
        if 2 <= odd <= 4:
            score += 5
        total = sum(sel)
        if 80 <= total <= 200:
            score += 5

        if score > best_score:
            best_score = score
            best = sel

    rare_nums = sorted(range(1, 46), key=lambda n: recent_freq.get(n, 0))[:10]
    return {
        "type": "rare",
        "type_name": "희소 조합",
        "type_desc": "최근 50회차에서 빈도가 낮은 번호 + 흔치 않은 쌍 조합 (1등 독식 전략)",
        "numbers": best,
        "analysis": _validate_set(best, draws),
        "detail": {
            "rare_numbers": rare_nums,
            "strategy": "최근 저빈도 번호 + 저빈도 쌍 조합",
        },
    }


def predict_ensemble(draws: list[list[int]]) -> dict:
    """
    타입5: AI 앙상블 - 5개 엔진 가중 투표 종합
    """
    from app.engines.ensemble import predict as ensemble_predict
    results = ensemble_predict(draws, n_sets=1)
    if not results:
        return None

    r = results[0]
    return {
        "type": "ensemble",
        "type_name": "AI 앙상블",
        "type_desc": "빈도/오버듀/패턴/쌍/하이브리드 5개 엔진 가중 투표 종합",
        "numbers": r["numbers"],
        "confidence": r.get("confidence"),
        "analysis": _validate_set(r["numbers"], draws),
        "detail": r.get("detail", {}),
    }


def generate_all_types(draws: list[list[int]]) -> list[dict]:
    """5종류 추천 번호를 모두 생성합니다."""
    results = []

    generators = [
        predict_hot,
        predict_cold,
        predict_balanced,
        predict_rare,
        predict_ensemble,
    ]

    for gen in generators:
        try:
            result = gen(draws)
            if result:
                results.append(result)
        except Exception as e:
            results.append({
                "type": gen.__name__.replace("predict_", ""),
                "type_name": "오류",
                "type_desc": str(e),
                "numbers": [],
                "analysis": {},
                "detail": {},
            })

    return results
