"""하이브리드 알고리즘: 빈도 + 오버듀 + 패턴 + 쌍 점수를 종합합니다."""

import numpy as np
from collections import Counter
from itertools import combinations


def predict(draws: list[list[int]], n_sets: int = 5) -> list[dict]:
    """
    4가지 관점의 점수를 종합하여 번호를 선택합니다.
    - 빈도 점수 (25%)
    - 오버듀 점수 (25%)
    - 최근 트렌드 점수 (25%)
    - 균형 보정 (25%)
    """
    if not draws:
        return []

    latest_round = len(draws)
    all_numbers = [n for nums in draws for n in nums]
    freq = Counter(all_numbers)

    # 1. 빈도 점수
    freq_scores = np.array([freq.get(i, 0) for i in range(1, 46)], dtype=float)
    freq_scores = freq_scores / freq_scores.max() if freq_scores.max() > 0 else freq_scores

    # 2. 오버듀 점수
    last_seen = {n: 0 for n in range(1, 46)}
    intervals = {n: [] for n in range(1, 46)}
    prev = {n: 0 for n in range(1, 46)}
    for idx, nums in enumerate(draws, 1):
        for n in nums:
            if prev[n] > 0:
                intervals[n].append(idx - prev[n])
            prev[n] = idx
            last_seen[n] = idx

    overdue_scores = np.zeros(45)
    for n in range(1, 46):
        gap = latest_round - last_seen[n]
        avg = np.mean(intervals[n]) if intervals[n] else latest_round
        overdue_scores[n - 1] = gap / avg if avg > 0 else 1.0
    overdue_scores = overdue_scores / overdue_scores.max() if overdue_scores.max() > 0 else overdue_scores

    # 3. 최근 트렌드 (최근 10회차 빈도 증가율)
    recent_freq = Counter(n for nums in draws[-10:] for n in nums)
    older_freq = Counter(n for nums in draws[-30:-10] for n in nums)
    trend_scores = np.zeros(45)
    for n in range(1, 46):
        recent_rate = recent_freq.get(n, 0) / 10
        older_rate = older_freq.get(n, 0) / 20 if len(draws) > 10 else recent_rate
        trend_scores[n - 1] = recent_rate / older_rate if older_rate > 0 else recent_rate
    trend_scores = trend_scores / trend_scores.max() if trend_scores.max() > 0 else trend_scores

    # 4. 균형 보정 (구간별 고른 분포 유도)
    balance_scores = np.ones(45)
    range_weights = {
        (1, 10): 10 / 45,
        (11, 20): 10 / 45,
        (21, 30): 10 / 45,
        (31, 40): 10 / 45,
        (41, 45): 5 / 45,
    }

    # 종합 점수
    final_scores = (
        freq_scores * 0.25
        + overdue_scores * 0.25
        + trend_scores * 0.25
        + balance_scores * 0.25
    )
    weights = final_scores / final_scores.sum()

    # 패턴 분석 정보
    sum_values = [sum(nums) for nums in draws]
    target_sum_mean = np.mean(sum_values)
    target_sum_std = np.std(sum_values)
    odd_counts = [sum(1 for n in nums if n % 2 == 1) for nums in draws]
    target_odd = int(np.median(odd_counts))

    results = []
    for _ in range(n_sets):
        best = None
        best_score = -1

        for _attempt in range(1000):
            selected = sorted(np.random.choice(range(1, 46), size=6, replace=False, p=weights).tolist())

            # 후처리 점수
            score = 0
            odd_count = sum(1 for n in selected if n % 2 == 1)
            if abs(odd_count - target_odd) <= 1:
                score += 30

            num_sum = sum(selected)
            if abs(num_sum - target_sum_mean) <= target_sum_std:
                score += 30

            # 구간 커버리지
            covered = len(set(
                0 if n <= 10 else 1 if n <= 20 else 2 if n <= 30 else 3 if n <= 40 else 4
                for n in selected
            ))
            score += covered * 8

            if score > best_score:
                best_score = score
                best = selected

        results.append({
            "numbers": best,
            "algorithm": "hybrid",
            "detail": {
                "method": "하이브리드 (빈도25% + 오버듀25% + 트렌드25% + 균형25%)",
                "weights": {
                    "frequency": 0.25,
                    "overdue": 0.25,
                    "trend": 0.25,
                    "balance": 0.25,
                },
                "target_sum_range": f"{target_sum_mean - target_sum_std:.0f}~{target_sum_mean + target_sum_std:.0f}",
                "target_odd_count": target_odd,
            },
        })

    return results
