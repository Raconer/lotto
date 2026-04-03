"""빈도 기반 알고리즘: 번호별 출현 빈도 가중치로 번호를 선택합니다."""

import numpy as np
from collections import Counter


def predict(draws: list[list[int]], n_sets: int = 5) -> list[dict]:
    """
    빈도 기반 예측.
    자주 나온 번호에 가중치를 부여하되, 너무 편향되지 않도록
    최근 회차와 전체 빈도를 혼합합니다.
    """
    all_numbers = []
    recent_numbers = []

    for nums in draws:
        all_numbers.extend(nums)
    for nums in draws[-30:]:
        recent_numbers.extend(nums)

    all_freq = Counter(all_numbers)
    recent_freq = Counter(recent_numbers)

    # 전체 빈도(60%) + 최근 빈도(40%) 혼합 가중치
    weights = np.zeros(45)
    for i in range(1, 46):
        all_w = all_freq.get(i, 0) / len(draws) if draws else 0
        recent_w = recent_freq.get(i, 0) / min(30, len(draws)) if draws else 0
        weights[i - 1] = all_w * 0.6 + recent_w * 0.4

    # 정규화
    weights = weights / weights.sum() if weights.sum() > 0 else np.ones(45) / 45

    results = []
    for _ in range(n_sets):
        selected = np.random.choice(range(1, 46), size=6, replace=False, p=weights)
        results.append({
            "numbers": sorted(selected.tolist()),
            "algorithm": "frequency",
            "detail": {
                "method": "빈도 가중치 (전체 60% + 최근30회 40%)",
                "top_weighted": sorted(range(1, 46), key=lambda x: weights[x - 1], reverse=True)[:10],
            },
        })

    return results
