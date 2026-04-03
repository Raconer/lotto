"""앙상블 엔진: 5개 알고리즘의 결과를 종합하여 최종 추천 번호를 생성합니다."""

import numpy as np
from collections import Counter

from app.engines import frequency, overdue, pattern, pair, hybrid


def predict(draws: list[list[int]], n_sets: int = 5) -> list[dict]:
    """
    앙상블 예측.
    5개 알고리즘 각각 n_sets * 2개의 번호 세트를 생성한 뒤,
    각 번호의 출현 빈도를 집계하여 가중 투표로 최종 번호를 결정합니다.
    """
    if not draws:
        return []

    # 각 엔진에서 후보 생성 (각 10세트)
    candidates_per_engine = n_sets * 2
    all_candidates = []

    engines = [
        ("frequency", frequency, 1.0),
        ("overdue", overdue, 0.8),
        ("pattern", pattern, 1.2),
        ("pair", pair, 0.9),
        ("hybrid", hybrid, 1.5),  # 하이브리드에 가장 높은 가중치
    ]

    engine_results = {}
    for name, engine, weight in engines:
        results = engine.predict(draws, candidates_per_engine)
        engine_results[name] = results
        for r in results:
            for num in r["numbers"]:
                all_candidates.append((num, weight))

    # 가중 투표: 각 번호의 가중 출현 횟수
    vote_scores = Counter()
    for num, weight in all_candidates:
        vote_scores[num] += weight

    # 정규화하여 확률 분포 생성
    total_score = sum(vote_scores.values())
    vote_weights = np.array([vote_scores.get(i, 0.01) / total_score for i in range(1, 46)])
    vote_weights = vote_weights / vote_weights.sum()

    # 패턴 제약 조건
    sum_values = [sum(nums) for nums in draws]
    target_sum_mean = np.mean(sum_values)
    target_sum_std = np.std(sum_values)
    odd_counts = [sum(1 for n in nums if n % 2 == 1) for nums in draws]
    target_odd = int(np.median(odd_counts))

    results = []
    used_sets = set()

    for set_idx in range(n_sets):
        best = None
        best_score = -1

        for _attempt in range(2000):
            selected = sorted(np.random.choice(range(1, 46), size=6, replace=False, p=vote_weights).tolist())
            key = tuple(selected)
            if key in used_sets:
                continue

            score = 0

            # 투표 점수
            vote_sum = sum(vote_scores.get(n, 0) for n in selected)
            score += vote_sum

            # 패턴 보너스
            odd_count = sum(1 for n in selected if n % 2 == 1)
            if abs(odd_count - target_odd) <= 1:
                score += 20

            num_sum = sum(selected)
            if abs(num_sum - target_sum_mean) <= target_sum_std:
                score += 20

            covered = len(set(
                0 if n <= 10 else 1 if n <= 20 else 2 if n <= 30 else 3 if n <= 40 else 4
                for n in selected
            ))
            score += covered * 5

            if score > best_score:
                best_score = score
                best = selected

        if best:
            used_sets.add(tuple(best))
            confidence = min(best_score / 100, 99.9)

            results.append({
                "numbers": best,
                "confidence": round(confidence, 1),
                "algorithm": "ensemble",
                "detail": {
                    "method": "5-엔진 앙상블 (가중 투표 + 패턴 제약)",
                    "engine_weights": {name: w for name, _, w in engines},
                    "vote_scores": {n: round(vote_scores.get(n, 0), 2) for n in best},
                },
            })

    return results
