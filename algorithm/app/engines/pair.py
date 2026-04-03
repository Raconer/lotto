"""쌍 동시출현 기반 알고리즘: 자주 함께 나오는 번호 쌍을 기반으로 번호를 구성합니다."""

import numpy as np
from itertools import combinations
from collections import Counter


def predict(draws: list[list[int]], n_sets: int = 5) -> list[dict]:
    """
    쌍(pair) 동시출현 기반 예측.
    시드 번호를 빈도 기반으로 선택한 후,
    그 번호와 가장 자주 함께 나온 번호들로 나머지를 채웁니다.
    """
    if not draws:
        return []

    # 쌍별 동시출현 빈도
    pair_freq = Counter()
    for nums in draws:
        for pair in combinations(sorted(nums), 2):
            pair_freq[pair] += 1

    # 번호별 출현 빈도
    all_numbers = [n for nums in draws for n in nums]
    number_freq = Counter(all_numbers)

    # 각 번호의 "동반자" 점수
    companion_score = {n: {} for n in range(1, 46)}
    for (a, b), freq in pair_freq.items():
        companion_score[a][b] = freq
        companion_score[b][a] = freq

    results = []
    for _ in range(n_sets):
        # 시드: 빈도 상위에서 랜덤 2개 선택
        top_numbers = [n for n, _ in number_freq.most_common(20)]
        seeds = list(np.random.choice(top_numbers, size=2, replace=False))
        selected = set(seeds)

        # 나머지 4개: 시드와의 동반자 점수 합산으로 선택
        while len(selected) < 6:
            candidates = {}
            for num in range(1, 46):
                if num in selected:
                    continue
                score = sum(companion_score.get(s, {}).get(num, 0) for s in selected)
                candidates[num] = score

            if not candidates:
                break

            # 상위 후보 중 가중치 랜덤 선택
            sorted_cands = sorted(candidates.items(), key=lambda x: x[1], reverse=True)[:15]
            cand_nums = [c[0] for c in sorted_cands]
            cand_weights = np.array([max(c[1], 0.1) for c in sorted_cands])
            cand_weights = cand_weights / cand_weights.sum()

            pick = np.random.choice(cand_nums, p=cand_weights)
            selected.add(pick)

        top_pairs = pair_freq.most_common(10)
        results.append({
            "numbers": sorted(list(selected)),
            "algorithm": "pair",
            "detail": {
                "method": "쌍 동시출현 기반 (시드 + 동반자 점수)",
                "seeds": sorted(seeds),
                "top_pairs": [(list(p), f) for p, f in top_pairs],
            },
        })

    return results
