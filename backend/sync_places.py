#!/usr/bin/env python
"""
CLI script to sync nearby restaurants from Kakao Local API into the database.

Usage:
    python sync_places.py --lat 37.5172 --lng 127.0473
    python sync_places.py --lat 37.5172 --lng 127.0473 --radius 3000 --pages 10

Requires KAKAO_API_KEY to be set in backend/.env (or as an environment variable).
"""

import argparse
import sys
import os

# Ensure the app package is importable when run from backend/
sys.path.insert(0, os.path.dirname(__file__))

from app.core.config import get_settings
from app.db.session import SessionLocal
from app.services.place_sync_service import PlaceSyncService


def main() -> None:
    parser = argparse.ArgumentParser(description="Kakao 음식점 동기화")
    parser.add_argument("--lat", type=float, required=True, help="위도 (예: 37.5172)")
    parser.add_argument("--lng", type=float, required=True, help="경도 (예: 127.0473)")
    parser.add_argument("--radius", type=int, default=2000, help="검색 반경 미터 (기본값: 2000)")
    parser.add_argument("--pages", type=int, default=5, help="최대 페이지 수 (기본값: 5, 최대 45)")
    args = parser.parse_args()

    settings = get_settings()
    if not settings.kakao_api_key:
        print("오류: KAKAO_API_KEY가 설정되지 않았습니다.")
        print("  backend/.env 파일에 KAKAO_API_KEY=your_key 를 추가하세요.")
        print("  카카오 REST API 키는 https://developers.kakao.com 에서 발급받으세요.")
        sys.exit(1)

    print(f"카카오 로컬 API로 음식점 동기화 중...")
    print(f"  위치: ({args.lat}, {args.lng}), 반경: {args.radius}m, 최대 {args.pages}페이지")

    db = SessionLocal()
    try:
        service = PlaceSyncService(db, api_key=settings.kakao_api_key)
        result = service.sync(
            lat=args.lat,
            lng=args.lng,
            radius_m=args.radius,
            max_pages=args.pages,
        )
    except Exception as exc:
        print(f"오류 발생: {exc}")
        sys.exit(1)
    finally:
        db.close()

    print("\n동기화 완료!")
    print(f"  신규 추가:  {result['created']}개")
    print(f"  업데이트:  {result['updated']}개")
    print(f"  건너뜀:    {result['skipped']}개")
    print(f"  오류:      {result['errors']}개")


if __name__ == "__main__":
    main()
