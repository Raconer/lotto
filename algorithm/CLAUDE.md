# Algorithm Server (FastAPI)

## 스택
FastAPI + NumPy + SciPy + Pandas + SQLAlchemy(async) + PostgreSQL

## 구조
```
app/
├── main.py           # FastAPI 앱, /api/predict, /api/predict/typed, /api/backtest
├── core/             # config.py, database.py
└── engines/          # 알고리즘 엔진들
    ├── frequency.py  # 빈도 가중치 (전체60%+최근30회40%)
    ├── overdue.py    # 미출현 간격 (현재간격/평균간격)
    ├── pattern.py    # 홀짝/합계/구간 패턴 매칭
    ├── pair.py       # 동시출현 쌍 기반 확장
    ├── hybrid.py     # 4관점 종합 (빈도25%+오버듀25%+트렌드25%+균형25%)
    ├── ensemble.py   # 5엔진 가중투표 + 패턴제약
    ├── typed_predictions.py  # 5종류 타입별: hot/cold/balanced/rare/ensemble
    └── backtest.py   # N회차 시뮬레이션 적중률 검증
```

## 주요 API
- `POST /api/predict` — 앙상블 5세트 생성 → DB 저장
- `POST /api/predict/typed` — 5종류(핫/콜드/균형/희소/앙상블) 생성 → DB 저장
- `POST /api/backtest?rounds=N` — 백테스트 실행
- `GET /api/backtest/results` — 저장된 결과 조회

## 환경변수
DATABASE_URL, REDIS_URL
