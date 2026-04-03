"""백테스트 엔진: 각 알고리즘의 과거 적중률을 검증합니다."""

from collections import Counter
from app.engines import frequency, overdue, pattern, pair, hybrid, ensemble


def run_backtest(draws: list[list[int]], test_rounds: int = 10) -> list[dict]:
    """
    최근 N회차를 테스트 데이터로 사용하여 각 알고리즘의 적중률을 측정합니다.

    예: test_rounds=10이면
      - 학습: 1 ~ (전체-10)회차
      - 테스트: (전체-9) ~ 전체 회차
    """
    if len(draws) < test_rounds + 30:
        return []

    engines = {
        "frequency": frequency,
        "overdue": overdue,
        "pattern": pattern,
        "pair": pair,
        "hybrid": hybrid,
        "ensemble": ensemble,
    }

    results = {name: {"matches": [], "details": []} for name in engines}

    for i in range(test_rounds):
        split = len(draws) - test_rounds + i
        train = [d for d in draws[:split]]
        actual = set(draws[split])
        actual_round = split + 1

        for name, engine in engines.items():
            predictions = engine.predict(train, n_sets=1)
            if predictions:
                predicted = set(predictions[0]["numbers"])
                matched = len(predicted & actual)
                results[name]["matches"].append(matched)
                results[name]["details"].append({
                    "test_round": actual_round,
                    "predicted": sorted(list(predicted)),
                    "actual": sorted(list(actual)),
                    "matched": matched,
                })

    summaries = []
    for name, data in results.items():
        matches = data["matches"]
        if not matches:
            continue

        distribution = Counter(matches)
        summaries.append({
            "algorithm_name": name,
            "total_tests": len(matches),
            "avg_matched": round(sum(matches) / len(matches), 2),
            "max_matched": max(matches),
            "match_distribution": {str(k): v for k, v in sorted(distribution.items())},
            "details": data["details"],
        })

    # 평균 적중 개수로 정렬
    summaries.sort(key=lambda x: x["avg_matched"], reverse=True)
    return summaries
