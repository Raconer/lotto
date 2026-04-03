from pydantic import BaseModel, Field
from datetime import date, datetime
from typing import Optional


class DrawBase(BaseModel):
    round_no: int = Field(..., description="회차 번호")
    draw_date: date = Field(..., description="추첨일")
    num1: int = Field(..., ge=1, le=45, description="당첨번호 1")
    num2: int = Field(..., ge=1, le=45, description="당첨번호 2")
    num3: int = Field(..., ge=1, le=45, description="당첨번호 3")
    num4: int = Field(..., ge=1, le=45, description="당첨번호 4")
    num5: int = Field(..., ge=1, le=45, description="당첨번호 5")
    num6: int = Field(..., ge=1, le=45, description="당첨번호 6")
    bonus: int = Field(..., ge=1, le=45, description="보너스 번호")


class DrawResponse(DrawBase):
    id: int
    numbers: list[int] = Field(..., description="당첨번호 6개 리스트")
    total_sales: Optional[int] = Field(None, description="총 판매금액")
    first_prize: Optional[int] = Field(None, description="1등 당첨금")
    first_winners: Optional[int] = Field(None, description="1등 당첨자 수")
    created_at: datetime

    model_config = {"from_attributes": True}


class DrawListResponse(BaseModel):
    total: int = Field(..., description="전체 회차 수")
    draws: list[DrawResponse] = Field(..., description="당첨번호 목록")


class CrawlResponse(BaseModel):
    message: str = Field(..., description="크롤링 결과 메시지")
    total_crawled: int = Field(..., description="수집된 회차 수")
    new_rounds: int = Field(..., description="신규 저장된 회차 수")
    latest_round: int = Field(..., description="최신 회차 번호")


class NumberStatResponse(BaseModel):
    number: int = Field(..., description="번호 (1~45)")
    frequency: int = Field(..., description="출현 횟수")
    probability: float = Field(..., description="출현 확률 (%)")
    last_appeared: Optional[int] = Field(None, description="마지막 출현 회차")
    overdue: int = Field(0, description="미출현 회차 수")
    avg_interval: Optional[float] = Field(None, description="평균 출현 간격")
    is_hot: bool = Field(False, description="핫 번호 여부")
    is_cold: bool = Field(False, description="콜드 번호 여부")

    model_config = {"from_attributes": True}


class CombinationStatResponse(BaseModel):
    combination: list[int] = Field(..., description="번호 조합")
    combo_size: int = Field(..., description="조합 크기 (2~6)")
    frequency: int = Field(..., description="동시 출현 횟수")
    probability: float = Field(..., description="동시 출현 확률 (%)")
    last_appeared: Optional[int] = Field(None, description="마지막 동시 출현 회차")

    model_config = {"from_attributes": True}


class RangeStatResponse(BaseModel):
    round_no: int
    range_1_10: int = Field(..., description="1~10 구간 개수")
    range_11_20: int = Field(..., description="11~20 구간 개수")
    range_21_30: int = Field(..., description="21~30 구간 개수")
    range_31_40: int = Field(..., description="31~40 구간 개수")
    range_41_45: int = Field(..., description="41~45 구간 개수")
    odd_count: int = Field(..., description="홀수 개수")
    even_count: int = Field(..., description="짝수 개수")
    sum_total: int = Field(..., description="번호 합계")
    consecutive_pairs: int = Field(..., description="연속번호 쌍 수")

    model_config = {"from_attributes": True}


class PredictionResponse(BaseModel):
    target_round: int = Field(..., description="대상 회차")
    set_number: int = Field(..., description="세트 번호 (1~5)")
    numbers: list[int] = Field(..., description="추천 번호 6개")
    confidence: Optional[float] = Field(None, description="신뢰도 (%)")
    algorithm_detail: Optional[dict] = Field(None, description="알고리즘 상세")
    created_at: datetime

    model_config = {"from_attributes": True}


class PredictionListResponse(BaseModel):
    target_round: int = Field(..., description="대상 회차")
    predictions: list[PredictionResponse] = Field(..., description="추천 번호 5세트")


class BacktestResultResponse(BaseModel):
    algorithm_name: str
    test_round: int
    predicted: list[int]
    actual: list[int]
    matched: int
    created_at: datetime

    model_config = {"from_attributes": True}


class BacktestSummaryResponse(BaseModel):
    algorithm_name: str = Field(..., description="알고리즘명")
    total_tests: int = Field(..., description="테스트 회차 수")
    avg_matched: float = Field(..., description="평균 적중 개수")
    max_matched: int = Field(..., description="최대 적중 개수")
    match_distribution: dict = Field(..., description="적중 분포 {0: n, 1: n, ...}")


class NumberValidationRequest(BaseModel):
    numbers: list[int] = Field(..., min_length=6, max_length=6, description="검증할 번호 6개")


class NumberValidationResponse(BaseModel):
    numbers: list[int] = Field(..., description="입력 번호")
    score: float = Field(..., description="종합 점수 (0~100)")
    frequency_score: float = Field(..., description="빈도 기반 점수")
    combination_score: float = Field(..., description="조합 기반 점수")
    balance_score: float = Field(..., description="균형 점수 (구간/홀짝)")
    past_matches: list[dict] = Field(..., description="과거 당첨 이력 대비 매칭")
    details: dict = Field(..., description="상세 분석")
