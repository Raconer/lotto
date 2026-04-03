"""오버듀(미출현 간격) 기반 알고리즘: 오래 안 나온 번호에 가중치를 부여합니다."""

import numpy as np


def predict(draws: list[list[int]], n_sets: int = 5) -> list[dict]:
    """
    미출현 간격 기반 예측.
    각 번호가 마지막으로 나온 후 경과 회차가 길수록 가중치 증가.
    평균 출현 간격 대비 현재 간격 비율을 가중치로 사용.
    """
    if not draws:
        return []

    latest_round = len(draws)
    last_seen = {n: 0 for n in range(1, 46)}
    intervals = {n: [] for n in range(1, 46)}
    prev_seen = {n: 0 for n in range(1, 46)}

    for idx, nums in enumerate(draws, 1):
        for num in nums:
            if prev_seen[num] > 0:
                intervals[num].append(idx - prev_seen[num])
            prev_seen[num] = idx
            last_seen[num] = idx

    # 가중치: 현재 간격 / 평균 간격 (높을수록 "오버듀")
    weights = np.zeros(45)
    overdue_info = {}
    for n in range(1, 46):
        current_gap = latest_round - last_seen[n]
        avg_gap = np.mean(intervals[n]) if intervals[n] else latest_round
        ratio = current_gap / avg_gap if avg_gap > 0 else 1.0
        weights[n - 1] = max(ratio, 0.1)  # 최소 가중치 보장
        overdue_info[n] = {"gap": current_gap, "avg_gap": round(avg_gap, 1), "ratio": round(ratio, 2)}

    weights = weights / weights.sum()

    results = []
    for _ in range(n_sets):
        selected = np.random.choice(range(1, 46), size=6, replace=False, p=weights)
        results.append({
            "numbers": sorted(selected.tolist()),
            "algorithm": "overdue",
            "detail": {
                "method": "미출현 간격 가중치 (현재간격/평균간격)",
                "top_overdue": sorted(range(1, 46), key=lambda x: weights[x - 1], reverse=True)[:10],
            },
        })

    return results
