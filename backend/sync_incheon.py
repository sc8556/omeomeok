#!/usr/bin/env python
"""
인천 주요 지역의 음식점을 카카오 로컬 API로 동기화합니다.
각 구/지역별로 반경 1.5km 이내 식당을 최대 3페이지(45개) 가져옵니다.

Usage:
    python sync_incheon.py
"""

import sys
import os

sys.path.insert(0, os.path.dirname(__file__))

from app.core.config import get_settings
from app.db.session import SessionLocal
from app.services.place_sync_service import PlaceSyncService

# 인천 주요 지역 좌표 (구/동 중심부)
INCHEON_AREAS = [
    {"name": "인천 중구 (개항장·차이나타운)", "lat": 37.4756, "lng": 126.6175},
    {"name": "인천 중구 (신포동·동인천)",     "lat": 37.4734, "lng": 126.6431},
    {"name": "인천 미추홀구 (주안)",           "lat": 37.4638, "lng": 126.6514},
    {"name": "인천 미추홀구 (용현동)",         "lat": 37.4500, "lng": 126.6550},
    {"name": "인천 남동구 (구월동)",           "lat": 37.4492, "lng": 126.7316},
    {"name": "인천 남동구 (논현동)",           "lat": 37.4100, "lng": 126.7340},
    {"name": "인천 부평구 (부평역)",           "lat": 37.5062, "lng": 126.7224},
    {"name": "인천 부평구 (산곡동)",           "lat": 37.5200, "lng": 126.7100},
    {"name": "인천 계양구 (계산동)",           "lat": 37.5372, "lng": 126.7378},
    {"name": "인천 서구 (검단)",               "lat": 37.5880, "lng": 126.6800},
    {"name": "인천 서구 (청라)",               "lat": 37.5484, "lng": 126.6680},
    {"name": "인천 서구 (가좌동)",             "lat": 37.5050, "lng": 126.6900},
    {"name": "인천 연수구 (연수동)",           "lat": 37.4100, "lng": 126.6780},
    {"name": "인천 연수구 (송도 1공구)",       "lat": 37.3830, "lng": 126.6560},
    {"name": "인천 연수구 (송도 3공구)",       "lat": 37.3938, "lng": 126.9576},
    {"name": "인천 동구 (화수동)",             "lat": 37.4780, "lng": 126.6380},
    {"name": "인천 강화군 (강화읍)",           "lat": 37.7463, "lng": 126.4876},
    {"name": "인천 옹진군 (영흥도)",           "lat": 37.2430, "lng": 126.4900},
]


def main() -> None:
    settings = get_settings()
    if not settings.kakao_api_key:
        print("오류: KAKAO_API_KEY가 설정되지 않았습니다.")
        print("  backend/.env 파일에 KAKAO_API_KEY=your_key 를 추가하세요.")
        sys.exit(1)

    total = {"created": 0, "updated": 0, "skipped": 0, "errors": 0}

    db = SessionLocal()
    try:
        service = PlaceSyncService(db, api_key=settings.kakao_api_key)

        for area in INCHEON_AREAS:
            print(f"\n[{area['name']}] 동기화 중...")
            try:
                result = service.sync(
                    lat=area["lat"],
                    lng=area["lng"],
                    radius_m=1500,
                    max_pages=3,
                )
                print(f"   신규: {result['created']}  업데이트: {result['updated']}  건너뜀: {result['skipped']}  오류: {result['errors']}")
                for k in total:
                    total[k] += result[k]
            except Exception as exc:
                print(f"   ❌ 오류: {exc}")
    finally:
        db.close()

    print("\n" + "=" * 45)
    print("인천 전체 동기화 완료!")
    print(f"  신규 추가:  {total['created']}개")
    print(f"  업데이트:  {total['updated']}개")
    print(f"  건너뜀:    {total['skipped']}개")
    print(f"  오류:      {total['errors']}개")
    print(f"  총 신규:   {total['created']}개")


if __name__ == "__main__":
    main()
