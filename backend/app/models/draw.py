from sqlalchemy import Column, Integer, BigInteger, Date, DateTime, Float, Boolean, ARRAY, String
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.sql import func

from app.core.database import Base


class Draw(Base):
    __tablename__ = "draws"

    id = Column(Integer, primary_key=True)
    round_no = Column(Integer, unique=True, nullable=False, index=True)
    draw_date = Column(Date, nullable=False)
    num1 = Column(Integer, nullable=False)
    num2 = Column(Integer, nullable=False)
    num3 = Column(Integer, nullable=False)
    num4 = Column(Integer, nullable=False)
    num5 = Column(Integer, nullable=False)
    num6 = Column(Integer, nullable=False)
    bonus = Column(Integer, nullable=False)
    total_sales = Column(BigInteger)
    first_prize = Column(BigInteger)
    first_winners = Column(Integer)
    created_at = Column(DateTime, server_default=func.now())

    @property
    def numbers(self) -> list[int]:
        return [self.num1, self.num2, self.num3, self.num4, self.num5, self.num6]


class NumberStat(Base):
    __tablename__ = "number_stats"

    id = Column(Integer, primary_key=True)
    number = Column(Integer, unique=True, nullable=False, index=True)
    frequency = Column(Integer, default=0)
    last_appeared = Column(Integer)
    avg_interval = Column(Float)
    is_hot = Column(Boolean, default=False)
    is_cold = Column(Boolean, default=False)
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())


class CombinationStat(Base):
    __tablename__ = "combination_stats"

    id = Column(Integer, primary_key=True)
    combination = Column(ARRAY(Integer), nullable=False, unique=True)
    combo_size = Column(Integer, nullable=False)
    frequency = Column(Integer, default=0)
    probability = Column(Float, default=0)
    last_appeared = Column(Integer)
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())


class RangeStat(Base):
    __tablename__ = "range_stats"

    id = Column(Integer, primary_key=True)
    round_no = Column(Integer, unique=True, nullable=False)
    range_1_10 = Column(Integer, default=0)
    range_11_20 = Column(Integer, default=0)
    range_21_30 = Column(Integer, default=0)
    range_31_40 = Column(Integer, default=0)
    range_41_45 = Column(Integer, default=0)
    odd_count = Column(Integer, default=0)
    even_count = Column(Integer, default=0)
    sum_total = Column(Integer, default=0)
    consecutive_pairs = Column(Integer, default=0)
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())


class Prediction(Base):
    __tablename__ = "predictions"

    id = Column(Integer, primary_key=True)
    target_round = Column(Integer, nullable=False)
    set_number = Column(Integer, nullable=False)
    num1 = Column(Integer, nullable=False)
    num2 = Column(Integer, nullable=False)
    num3 = Column(Integer, nullable=False)
    num4 = Column(Integer, nullable=False)
    num5 = Column(Integer, nullable=False)
    num6 = Column(Integer, nullable=False)
    confidence = Column(Float)
    algorithm_detail = Column(JSONB)
    created_at = Column(DateTime, server_default=func.now())

    @property
    def numbers(self) -> list[int]:
        return [self.num1, self.num2, self.num3, self.num4, self.num5, self.num6]


class BacktestResult(Base):
    __tablename__ = "backtest_results"

    id = Column(Integer, primary_key=True)
    algorithm_name = Column(String(100), nullable=False)
    test_round = Column(Integer, nullable=False)
    predicted = Column(ARRAY(Integer), nullable=False)
    actual = Column(ARRAY(Integer), nullable=False)
    matched = Column(Integer, default=0)
    created_at = Column(DateTime, server_default=func.now())
