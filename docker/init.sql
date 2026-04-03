-- ─── 로또 당첨번호 테이블 ───
CREATE TABLE IF NOT EXISTS draws (
    id SERIAL PRIMARY KEY,
    round_no INTEGER UNIQUE NOT NULL,
    draw_date DATE NOT NULL,
    num1 INTEGER NOT NULL,
    num2 INTEGER NOT NULL,
    num3 INTEGER NOT NULL,
    num4 INTEGER NOT NULL,
    num5 INTEGER NOT NULL,
    num6 INTEGER NOT NULL,
    bonus INTEGER NOT NULL,
    total_sales BIGINT,
    first_prize BIGINT,
    first_winners INTEGER,
    created_at TIMESTAMP DEFAULT NOW()
);

-- ─── 번호별 통계 테이블 ───
CREATE TABLE IF NOT EXISTS number_stats (
    id SERIAL PRIMARY KEY,
    number INTEGER UNIQUE NOT NULL CHECK (number BETWEEN 1 AND 45),
    frequency INTEGER DEFAULT 0,
    last_appeared INTEGER,
    avg_interval FLOAT,
    is_hot BOOLEAN DEFAULT FALSE,
    is_cold BOOLEAN DEFAULT FALSE,
    updated_at TIMESTAMP DEFAULT NOW()
);

-- ─── 조합 통계 테이블 (2~6개 조합) ───
CREATE TABLE IF NOT EXISTS combination_stats (
    id SERIAL PRIMARY KEY,
    combination INTEGER[] NOT NULL,
    combo_size INTEGER NOT NULL CHECK (combo_size BETWEEN 2 AND 6),
    frequency INTEGER DEFAULT 0,
    probability FLOAT DEFAULT 0,
    last_appeared INTEGER,
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(combination)
);

-- ─── 구간별 통계 ───
CREATE TABLE IF NOT EXISTS range_stats (
    id SERIAL PRIMARY KEY,
    round_no INTEGER NOT NULL,
    range_1_10 INTEGER DEFAULT 0,
    range_11_20 INTEGER DEFAULT 0,
    range_21_30 INTEGER DEFAULT 0,
    range_31_40 INTEGER DEFAULT 0,
    range_41_45 INTEGER DEFAULT 0,
    odd_count INTEGER DEFAULT 0,
    even_count INTEGER DEFAULT 0,
    sum_total INTEGER DEFAULT 0,
    consecutive_pairs INTEGER DEFAULT 0,
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(round_no)
);

-- ─── 추천 번호 저장 ───
CREATE TABLE IF NOT EXISTS predictions (
    id SERIAL PRIMARY KEY,
    target_round INTEGER NOT NULL,
    set_number INTEGER NOT NULL CHECK (set_number BETWEEN 1 AND 5),
    num1 INTEGER NOT NULL,
    num2 INTEGER NOT NULL,
    num3 INTEGER NOT NULL,
    num4 INTEGER NOT NULL,
    num5 INTEGER NOT NULL,
    num6 INTEGER NOT NULL,
    confidence FLOAT,
    algorithm_detail JSONB,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(target_round, set_number)
);

-- ─── 백테스트 결과 ───
CREATE TABLE IF NOT EXISTS backtest_results (
    id SERIAL PRIMARY KEY,
    algorithm_name VARCHAR(100) NOT NULL,
    test_round INTEGER NOT NULL,
    predicted INTEGER[] NOT NULL,
    actual INTEGER[] NOT NULL,
    matched INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW()
);

-- ─── 인덱스 ───
CREATE INDEX idx_draws_round ON draws(round_no);
CREATE INDEX idx_draws_date ON draws(draw_date);
CREATE INDEX idx_number_stats_number ON number_stats(number);
CREATE INDEX idx_combo_stats_size ON combination_stats(combo_size);
CREATE INDEX idx_combo_stats_freq ON combination_stats(frequency DESC);
CREATE INDEX idx_predictions_round ON predictions(target_round);
CREATE INDEX idx_range_stats_round ON range_stats(round_no);
CREATE INDEX idx_backtest_algo ON backtest_results(algorithm_name);

-- ─── 1~45 번호 초기 데이터 ───
INSERT INTO number_stats (number, frequency)
SELECT generate_series(1, 45), 0
ON CONFLICT (number) DO NOTHING;
