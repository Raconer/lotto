"""패턴 기반 알고리즘: 연번, 홀짝, 구간 분포 패턴을 학습하여 번호를 생성합니다."""

import numpy as np
from collections import Counter


def _analyze_patterns(draws: list[list[int]]) -> dict:
    """과거 당첨번호의 패턴을 분석합니다."""
    odd_even_dist = []
    range_dist = []
    sum_dist = []
    consecutive_dist = []

    for nums in draws:
        sorted_nums = sorted(nums)
        odd_count = sum(1 for n in nums if n % 2 == 1)
        odd_even_dist.append(odd_count)

        ranges = [0] * 5
        for n in nums:
            if n <= 10: ranges[0] += 1
            elif n <= 20: ranges[1] += 1
            elif n <= 30: ranges[2] += 1
            elif n <= 40: ranges[3] += 1
            else: ranges[4] += 1
        range_dist.append(tuple(ranges))

        sum_dist.append(sum(nums))

        consec = sum(1 for i in range(len(sorted_nums) - 1) if sorted_nums[i + 1] - sorted_nums[i] == 1)
        consecutive_dist.append(consec)

    return {
        "odd_count_mode": Counter(odd_even_dist).most_common(3),
        "range_mode": Counter(range_dist).most_common(5),
        "sum_mean": np.mean(sum_dist),
        "sum_std": np.std(sum_dist),
        "consec_mode": Counter(consecutive_dist).most_common(3),
    }


def predict(draws: list[list[int]], n_sets: int = 5) -> list[dict]:
    """패턴 기반 예측. 과거 패턴에 맞는 번호 조합을 생성합니다."""
    if not draws:
        return []

    patterns = _analyze_patterns(draws)
    target_odd = patterns["odd_count_mode"][0][0]
    target_sum_mean = patterns["sum_mean"]
    target_sum_std = patterns["sum_std"]

    # 전체 빈도
    all_numbers = [n for nums in draws for n in nums]
    freq = Counter(all_numbers)
    weights = np.array([freq.get(i, 1) for i in range(1, 46)], dtype=float)
    weights = weights / weights.sum()

    results = []
    for _ in range(n_sets):
        best = None
        best_score = -1

        for _attempt in range(500):
            selected = sorted(np.random.choice(range(1, 46), size=6, replace=False, p=weights).tolist())
            odd_count = sum(1 for n in selected if n % 2 == 1)
            num_sum = sum(selected)

            # 점수: 홀짝 패턴 일치 + 합계 범위 일치
            score = 0
            if odd_count == target_odd:
                score += 50
            elif abs(odd_count - target_odd) == 1:
                score += 30

            sum_z = abs(num_sum - target_sum_mean) / target_sum_std if target_sum_std > 0 else 0
            if sum_z < 0.5:
                score += 50
            elif sum_z < 1.0:
                score += 30
            elif sum_z < 1.5:
                score += 10

            if score > best_score:
                best_score = score
                best = selected

        results.append({
            "numbers": best,
            "algorithm": "pattern",
            "detail": {
                "method": "패턴 매칭 (홀짝/합계/구간 분포)",
                "target_odd_count": target_odd,
                "target_sum_range": f"{target_sum_mean - target_sum_std:.0f}~{target_sum_mean + target_sum_std:.0f}",
                "patterns": {
                    "odd_modes": [(k, v) for k, v in patterns["odd_count_mode"]],
                    "sum_mean": round(target_sum_mean, 1),
                },
            },
        })

    return results
