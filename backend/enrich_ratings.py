#!/usr/bin/env python
"""
음식점 평점 보강 스크립트
카카오맵 내부 API에서 평점을 가져와 DB에 업데이트합니다.

Usage:
    python enrich_ratings.py
    python enrich_ratings.py --url http://localhost:8000  # 로컬 서버 사용 시
"""

import argparse
import time
import httpx

DEFAULT_URL = "https://omeomeok.onrender.com"


def enrich_ratings(base_url: str) -> dict:
    with httpx.Client() as client:
        resp = client.post(
            f"{base_url}/api/v1/restaurants/enrich/ratings",
            timeout=300,
        )
        resp.raise_for_status()
        return resp.json()


def main():
    parser = argparse.ArgumentParser(description="음식점 평점 보강")
    parser.add_argument("--url", default=DEFAULT_URL, help="백엔드 URL")
    args = parser.parse_args()

    base_url = args.url.rstrip("/")
    print(f"대상 서버: {base_url}")
    print("평점 보강 시작...")

    try:
        result = enrich_ratings(base_url)
        print(f"완료: 업데이트 {result.get('updated', 0)}개, "
              f"건너뜀 {result.get('skipped', 0)}개, "
              f"오류 {result.get('errors', 0)}개")
    except Exception as e:
        print(f"오류: {e}")


if __name__ == "__main__":
    main()
