from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from apscheduler.schedulers.asyncio import AsyncIOScheduler

from app.core.config import get_settings
from app.core.database import async_session
from app.routers import draws, crawl, stats, predictions
from app.services.crawler import crawl_latest_draw
from app.services.stats import update_number_stats, update_combination_stats, update_range_stats

settings = get_settings()
scheduler = AsyncIOScheduler()


async def scheduled_crawl():
    """매주 토요일 22시에 최신 회차를 자동 수집합니다."""
    async with async_session() as db:
        result = await crawl_latest_draw(db)
        if result["new_rounds"] > 0:
            await update_number_stats(db)
            await update_combination_stats(db, max_combo_size=3)
            await update_range_stats(db)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # 스케줄러: 매주 토요일 22:00 (KST)
    scheduler.add_job(scheduled_crawl, "cron", day_of_week="sat", hour=22, minute=0)
    scheduler.start()
    yield
    scheduler.shutdown()


app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="""
## 로또 AI 분석 API

동행복권 당첨번호를 수집·분석하여 통계와 추천 번호를 제공합니다.

### 주요 기능
- **크롤링**: 동행복권 전 회차 데이터 수집 (자동/수동)
- **통계**: 번호별 빈도, 조합별 동시출현 확률 (2~6개), 구간별 분포
- **예측**: 5가지 알고리즘 앙상블 기반 추천 번호 5세트
- **검증**: 사용자 번호 점수 분석
- **백테스트**: 알고리즘 과거 적중률 검증
    """,
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(draws.router)
app.include_router(crawl.router)
app.include_router(stats.router)
app.include_router(predictions.router)


@app.get("/api/health", tags=["시스템"])
async def health_check():
    """서버 상태를 확인합니다."""
    return {"status": "ok", "service": "lotto-api", "version": settings.APP_VERSION}
