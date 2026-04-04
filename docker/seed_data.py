#!/usr/bin/env python3
"""
로또 6/45 전체 당첨번호 → seed_data.sql 생성 스크립트

사용법:
    pip install httpx  (선택 사항)
    python3 seed_data.py

동작:
  1) lotto_raw.csv 파일에서 기존 데이터 로드 (1~913회)
  2) 빠진 회차(914~1167)는 동행복권 API로 수집 시도
     - httpx (verify=False, follow_redirects)
     - urllib (ssl 검증 비활성화)
     - HTML 스크래핑
  3) 모든 데이터를 seed_data.sql로 출력

날짜 계산:
  - 1회차: 2002-12-07 (토요일)
  - 이후 매주 토요일 (예외 있음: 추석/설날 등으로 1~2일 밀리는 경우)
  - 알려진 예외 날짜는 하드코딩
"""

import csv
import json
import os
import re
import ssl
import sys
import time
from datetime import datetime, timedelta
from pathlib import Path

# ---------------------------------------------------------------------------
# 설정
# ---------------------------------------------------------------------------
MAX_ROUND = 1205
OUTPUT_FILE = Path(__file__).parent / "seed_data.sql"
CSV_FILE = Path(__file__).parent / "lotto_raw.csv"
DELAY = 0.2  # API 요청 간 대기(초)

# ---------------------------------------------------------------------------
# 날짜 계산
# ---------------------------------------------------------------------------
ROUND_1_DATE = datetime(2002, 12, 7)  # 1회차 추첨일 (토요일)

# 알려진 예외 추첨일 (설/추석 등으로 토요일이 아닌 날에 추첨)
# 형식: {회차: "YYYY-MM-DD"}
EXCEPTION_DATES = {
    # 2004년 설날 (1/21~23) → 1/24(토) 정상
    # 2005년 설날 (2/8~10) → 예외 없음
    # 대부분의 경우 토요일 추첨이 유지됨
    # 필요시 추가
}


def get_draw_date(round_no: int) -> str:
    """회차에 해당하는 추첨일 계산"""
    if round_no in EXCEPTION_DATES:
        return EXCEPTION_DATES[round_no]
    # 기본: 1회차 날짜 + (round_no - 1) * 7일
    d = ROUND_1_DATE + timedelta(weeks=round_no - 1)
    return d.strftime("%Y-%m-%d")


# ---------------------------------------------------------------------------
# SSL 컨텍스트
# ---------------------------------------------------------------------------
def _insecure_ssl_context():
    ctx = ssl.create_default_context()
    ctx.check_hostname = False
    ctx.verify_mode = ssl.CERT_NONE
    return ctx


# ---------------------------------------------------------------------------
# API 호출 함수들
# ---------------------------------------------------------------------------
def fetch_with_httpx(round_no: int) -> dict | None:
    """httpx로 동행복권 API 호출"""
    try:
        import httpx
    except ImportError:
        return None

    url = f"https://www.dhlottery.co.kr/common.do?method=getLottoNumber&drwNo={round_no}"
    headers = {
        "User-Agent": (
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
            "AppleWebKit/537.36 (KHTML, like Gecko) "
            "Chrome/120.0.0.0 Safari/537.36"
        ),
        "Referer": "https://www.dhlottery.co.kr/gameResult.do?method=byWin",
        "Accept": "application/json, text/javascript, */*; q=0.01",
        "X-Requested-With": "XMLHttpRequest",
    }
    try:
        with httpx.Client(verify=False, follow_redirects=False, timeout=10) as client:
            # 세션 쿠키 획득
            client.get(
                "https://www.dhlottery.co.kr/gameResult.do?method=byWin",
                headers={"User-Agent": headers["User-Agent"]},
            )
            resp = client.get(url, headers=headers)
            if resp.status_code == 200:
                ct = resp.headers.get("content-type", "")
                if "json" in ct or "javascript" in ct:
                    data = resp.json()
                    if data.get("returnValue") == "success":
                        return data
    except Exception:
        pass
    return None


def fetch_with_urllib(round_no: int) -> dict | None:
    """urllib으로 동행복권 API 호출"""
    import urllib.request

    url = f"https://www.dhlottery.co.kr/common.do?method=getLottoNumber&drwNo={round_no}"
    headers = {
        "User-Agent": (
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
            "AppleWebKit/537.36 (KHTML, like Gecko) "
            "Chrome/120.0.0.0 Safari/537.36"
        ),
        "Referer": "https://www.dhlottery.co.kr/gameResult.do?method=byWin",
        "Accept": "application/json, text/javascript, */*; q=0.01",
        "X-Requested-With": "XMLHttpRequest",
    }
    ctx = _insecure_ssl_context()
    try:
        req = urllib.request.Request(url, headers=headers)
        with urllib.request.urlopen(req, context=ctx, timeout=10) as resp:
            ct = resp.headers.get("Content-Type", "")
            if "json" in ct or "javascript" in ct:
                data = json.loads(resp.read())
                if data.get("returnValue") == "success":
                    return data
    except Exception:
        pass
    return None


def fetch_by_scraping(round_no: int) -> dict | None:
    """결과 페이지 HTML 파싱"""
    try:
        import httpx
    except ImportError:
        return None

    url = f"https://www.dhlottery.co.kr/gameResult.do?method=byWin&drwNo={round_no}"
    headers = {
        "User-Agent": (
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
            "AppleWebKit/537.36 (KHTML, like Gecko) "
            "Chrome/120.0.0.0 Safari/537.36"
        ),
    }
    try:
        with httpx.Client(verify=False, follow_redirects=True, timeout=15) as client:
            resp = client.get(url, headers=headers)
            html = resp.text

            balls = re.findall(r'class="ball_645 lrg ball\d+">(\d+)</span>', html)
            bonus_match = re.search(
                r'bonus_ball.*?class="ball_645 lrg ball\d+">(\d+)</span>',
                html,
                re.DOTALL,
            )
            date_match = re.search(
                r"(\d{4})년\s*(\d{1,2})월\s*(\d{1,2})일\s*추첨", html
            )

            if len(balls) >= 6:
                nums = [int(b) for b in balls[:6]]
                bonus = (
                    int(bonus_match.group(1))
                    if bonus_match
                    else (int(balls[6]) if len(balls) > 6 else 0)
                )
                draw_date = (
                    f"{date_match.group(1)}-{int(date_match.group(2)):02d}-{int(date_match.group(3)):02d}"
                    if date_match
                    else get_draw_date(round_no)
                )
                return {
                    "drwNo": round_no,
                    "drwtNo1": nums[0],
                    "drwtNo2": nums[1],
                    "drwtNo3": nums[2],
                    "drwtNo4": nums[3],
                    "drwtNo5": nums[4],
                    "drwtNo6": nums[5],
                    "bnusNo": bonus,
                    "drwNoDate": draw_date,
                    "totSellamnt": None,
                    "firstWinamnt": None,
                    "firstPrzwnerCo": None,
                    "returnValue": "success",
                }
    except Exception:
        pass
    return None


# ---------------------------------------------------------------------------
# CSV 데이터 로드
# ---------------------------------------------------------------------------
def load_csv_data() -> dict[int, tuple]:
    """
    lotto_raw.csv 로드.

    지원하는 CSV 형식:
      A) 헤더 포함 (godmode2k 형식):
         No, 회차, n1, n2, n3, n4, n5, n6, bonus, 순위, 당첨게임수, 당첨금액
      B) 헤더 없음 (단순 형식):
         n1, n2, n3, n4, n5, n6, bonus  (역순, round 번호 없음)

    반환: {round_no: (num1, num2, num3, num4, num5, num6, bonus)}
    """
    data = {}
    if not CSV_FILE.exists():
        print(f"  CSV 파일 없음: {CSV_FILE}")
        return data

    with open(CSV_FILE, "r", encoding="utf-8-sig") as f:
        rows = list(csv.reader(f))

    if not rows:
        return data

    # 형식 자동 감지
    first = rows[0]
    has_header = any("회차" in cell or "No" in cell for cell in first)

    if has_header:
        # 형식 A: No, 회차, n1..n6, bonus, ...
        for row in rows[1:]:  # 헤더 스킵
            if len(row) < 9:
                continue
            try:
                round_no = int(row[1].replace(",", "").strip())
                nums = tuple(int(row[i].strip()) for i in range(2, 9))
                data[round_no] = nums
            except (ValueError, IndexError):
                continue
    else:
        # 형식 B: n1..n6, bonus (역순)
        rows.reverse()
        for i, row in enumerate(rows):
            if len(row) >= 7:
                try:
                    round_no = i + 1
                    nums = tuple(int(x.strip()) for x in row[:7])
                    data[round_no] = nums
                except ValueError:
                    continue

    return data


# ---------------------------------------------------------------------------
# SQL 생성
# ---------------------------------------------------------------------------
def make_insert(round_no: int, nums: tuple, date: str,
                sales=None, prize=None, winners=None) -> str:
    """SQL INSERT 문 생성"""
    n1, n2, n3, n4, n5, n6, bonus = nums
    s = f"NULL" if sales is None else str(sales)
    p = f"NULL" if prize is None else str(prize)
    w = f"NULL" if winners is None else str(winners)
    return (
        f"INSERT INTO draws (round_no, draw_date, num1, num2, num3, num4, num5, num6, "
        f"bonus, total_sales, first_prize, first_winners) VALUES "
        f"({round_no}, '{date}', {n1}, {n2}, {n3}, {n4}, {n5}, {n6}, "
        f"{bonus}, {s}, {p}, {w}) "
        f"ON CONFLICT (round_no) DO NOTHING;"
    )


def api_to_insert(data: dict) -> str:
    """API 응답 → SQL INSERT"""
    rnd = data["drwNo"]
    d = data.get("drwNoDate", get_draw_date(rnd))
    nums = (
        data["drwtNo1"], data["drwtNo2"], data["drwtNo3"],
        data["drwtNo4"], data["drwtNo5"], data["drwtNo6"],
        data["bnusNo"],
    )
    return make_insert(
        rnd, nums, d,
        sales=data.get("totSellamnt"),
        prize=data.get("firstWinamnt"),
        winners=data.get("firstPrzwnerCo"),
    )


def write_sql(sql_lines: dict[int, str]):
    """SQL 파일 작성"""
    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        f.write("-- ═══════════════════════════════════════════════════════\n")
        f.write("-- 로또 6/45 전체 당첨번호 시드 데이터\n")
        f.write(f"-- 생성일시: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")
        f.write(f"-- 총 {len(sql_lines)}개 회차\n")
        f.write("-- ═══════════════════════════════════════════════════════\n\n")
        f.write("BEGIN;\n\n")
        for rnd in sorted(sql_lines.keys()):
            f.write(sql_lines[rnd] + "\n")
        f.write("\nCOMMIT;\n")
    print(f"  SQL 파일 저장: {OUTPUT_FILE} ({len(sql_lines)}개 회차)")


# ---------------------------------------------------------------------------
# 메인
# ---------------------------------------------------------------------------
def main():
    print(f"=== 로또 6/45 당첨번호 시드 데이터 생성 (1 ~ {MAX_ROUND}회) ===")
    print(f"출력: {OUTPUT_FILE}")
    print()

    sql_lines: dict[int, str] = {}

    # ── 1단계: CSV 데이터 로드 ──
    print("[1/3] CSV 데이터 로드...")
    csv_data = load_csv_data()
    if csv_data:
        for rnd, nums in csv_data.items():
            if rnd <= MAX_ROUND:
                sql_lines[rnd] = make_insert(rnd, nums, get_draw_date(rnd))
        print(f"  CSV에서 {len(sql_lines)}개 회차 로드 완료")
    else:
        print("  CSV 데이터 없음")

    # ── 2단계: 빠진 회차 확인 ──
    missing = sorted(set(range(1, MAX_ROUND + 1)) - set(sql_lines.keys()))
    if not missing:
        print(f"\n[2/3] 모든 {MAX_ROUND}개 회차 데이터 확보!")
    else:
        print(f"\n[2/3] 빠진 회차: {len(missing)}개 (API로 보충 시도)")
        print(f"  범위: {missing[0]} ~ {missing[-1]}")

        # API 테스트
        methods = [
            ("httpx", fetch_with_httpx),
            ("urllib", fetch_with_urllib),
            ("scraping", fetch_by_scraping),
        ]

        working = None
        test_round = missing[0]
        for name, func in methods:
            try:
                result = func(test_round)
                if result and result.get("returnValue") == "success":
                    print(f"  [OK] '{name}' 방법 작동!")
                    working = (name, func)
                    sql_lines[test_round] = api_to_insert(result)
                    break
                else:
                    print(f"  [--] '{name}' 실패")
            except Exception as e:
                print(f"  [!!] '{name}' 오류: {e}")

        if working:
            name, func = working
            remaining = [r for r in missing if r != test_round]
            fetched = 1
            failed = []

            print(f"\n  '{name}'으로 {len(remaining)}개 회차 수집 중...")
            for i, rnd in enumerate(remaining, 1):
                data = func(rnd)
                if data and data.get("returnValue") == "success":
                    sql_lines[rnd] = api_to_insert(data)
                    fetched += 1
                else:
                    failed.append(rnd)
                    # 다른 방법 시도
                    for alt_name, alt_func in methods:
                        if alt_name != name:
                            data2 = alt_func(rnd)
                            if data2 and data2.get("returnValue") == "success":
                                sql_lines[rnd] = api_to_insert(data2)
                                fetched += 1
                                failed.pop()
                                break

                if i % 50 == 0:
                    pct = i / len(remaining) * 100
                    print(f"    {i}/{len(remaining)} ({pct:.0f}%) - 성공: {fetched}")

                time.sleep(DELAY)

                # 중간 저장
                if i % 200 == 0:
                    write_sql(sql_lines)

            print(f"\n  API 수집 결과: 성공 {fetched}, 실패 {len(failed)}")
            if failed:
                print(f"  실패 회차 (처음 20개): {failed[:20]}")
        else:
            print()
            print("  *** 모든 API 방법이 실패했습니다 ***")
            print("  동행복권 사이트의 API 접근이 차단된 상태입니다.")
            print()
            print("  보충 방법:")
            print("    1. VPN/프록시 사용 후 재실행")
            print("    2. 브라우저 콘솔에서 직접 데이터 수집:")
            print("       (개발자도구 > Console)")
            print()
            print("       async function fetchAll(start, end) {")
            print("         const results = [];")
            print("         for (let i = start; i <= end; i++) {")
            print('           const r = await fetch("/common.do?method=getLottoNumber&drwNo=" + i);')
            print("           const d = await r.json();")
            print("           if (d.returnValue === 'success') {")
            print("             results.push([i, d.drwNoDate, d.drwtNo1, d.drwtNo2,")
            print("               d.drwtNo3, d.drwtNo4, d.drwtNo5, d.drwtNo6, d.bnusNo]);")
            print("           }")
            print("           await new Promise(r => setTimeout(r, 200));")
            print("         }")
            print("         console.log(JSON.stringify(results));")
            print("       }")
            print(f"       fetchAll({missing[0]}, {missing[-1]});")
            print()
            print("    3. 수집된 JSON을 lotto_supplement.json에 저장 후 재실행")

    # ── 기존 seed_data.sql에서 보충 데이터 병합 ──
    supplement_file = Path(__file__).parent / "lotto_supplement.json"
    if supplement_file.exists():
        print(f"\n  보충 데이터 파일 발견: {supplement_file}")
        try:
            with open(supplement_file, "r") as f:
                supplement = json.load(f)
            added = 0
            for entry in supplement:
                if isinstance(entry, list) and len(entry) >= 9:
                    rnd, date, n1, n2, n3, n4, n5, n6, bonus = entry[:9]
                    if rnd not in sql_lines and rnd <= MAX_ROUND:
                        nums = (n1, n2, n3, n4, n5, n6, bonus)
                        sql_lines[rnd] = make_insert(rnd, nums, date)
                        added += 1
            print(f"  보충 데이터에서 {added}개 회차 추가")
        except Exception as e:
            print(f"  보충 데이터 로드 실패: {e}")

    # ── 3단계: SQL 파일 저장 ──
    print(f"\n[3/3] SQL 파일 생성...")
    write_sql(sql_lines)

    total = len(sql_lines)
    coverage = total / MAX_ROUND * 100
    print(f"\n{'='*50}")
    print(f"  완료!")
    print(f"  총 {total}/{MAX_ROUND}개 회차 ({coverage:.1f}%)")
    print(f"  파일: {OUTPUT_FILE}")

    if total < MAX_ROUND:
        still_missing = sorted(set(range(1, MAX_ROUND + 1)) - set(sql_lines.keys()))
        print(f"\n  아직 {len(still_missing)}개 회차 부족")
        print(f"  범위: {still_missing[0]} ~ {still_missing[-1]}")
        print("  위 안내에 따라 보충 데이터를 수집하여 재실행하세요.")


if __name__ == "__main__":
    main()
