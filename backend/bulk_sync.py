#!/usr/bin/env python
"""
서울 전체 음식점 대량 동기화 스크립트
Render 백엔드 API를 통해 서울 25개 구 + 주요 상권 동기화

Usage:
    python bulk_sync.py
    python bulk_sync.py --url http://localhost:8000  # 로컬 서버 사용 시
"""

import argparse
import time
import httpx

# 서울 25개 구 중심 좌표 + 주요 상권
LOCATIONS = [
    # ── 서울 25개 구 ──────────────────────────────────────
    ("강남구",    37.5172, 127.0473),
    ("강동구",    37.5301, 127.1238),
    ("강북구",    37.6396, 127.0256),
    ("강서구",    37.5509, 126.8495),
    ("관악구",    37.4784, 126.9516),
    ("광진구",    37.5384, 127.0822),
    ("구로구",    37.4954, 126.8874),
    ("금천구",    37.4569, 126.8956),
    ("노원구",    37.6541, 127.0561),
    ("도봉구",    37.6688, 127.0471),
    ("동대문구",  37.5744, 127.0396),
    ("동작구",    37.5124, 126.9393),
    ("마포구",    37.5663, 126.9014),
    ("서대문구",  37.5791, 126.9368),
    ("서초구",    37.4837, 127.0324),
    ("성동구",    37.5634, 127.0369),
    ("성북구",    37.5894, 127.0167),
    ("송파구",    37.5145, 127.1058),
    ("양천구",    37.5270, 126.8561),
    ("영등포구",  37.5264, 126.8962),
    ("용산구",    37.5324, 126.9904),
    ("은평구",    37.6026, 126.9292),
    ("종로구",    37.5730, 126.9794),
    ("중구",      37.5636, 126.9976),
    ("중랑구",    37.6063, 127.0928),
    # ── 주요 상권 ─────────────────────────────────────────
    ("홍대",      37.5563, 126.9237),
    ("이태원",    37.5345, 126.9942),
    ("건대입구",  37.5403, 127.0694),
    ("신촌",      37.5596, 126.9427),
    ("혜화_대학로", 37.5822, 127.0021),
    ("성수",      37.5448, 127.0556),
    ("잠실",      37.5130, 127.1002),
    ("여의도",    37.5217, 126.9244),
    ("사당",      37.4763, 126.9813),
    ("노량진",    37.5135, 126.9427),
    ("수유",      37.6382, 127.0257),
    ("청량리",    37.5801, 127.0453),
    ("목동",      37.5289, 126.8744),
    ("신림",      37.4842, 126.9293),
    ("왕십리",    37.5614, 127.0385),
]

def sync_location(client: httpx.Client, base_url: str, name: str, lat: float, lng: float) -> dict:
    resp = client.post(
        f"{base_url}/api/v1/restaurants/sync",
        json={"lat": lat, "lng": lng, "radius_m": 2000, "max_pages": 10},
        timeout=60,
    )
    resp.raise_for_status()
    return resp.json()


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--url", default="https://omeomeok.onrender.com", help="백엔드 URL")
    args = parser.parse_args()

    base_url = args.url.rstrip("/")
    print(f"동기화 대상: {base_url}")
    print(f"총 {len(LOCATIONS)}개 지역\n")

    total = {"created": 0, "updated": 0, "skipped": 0, "errors": 0}

    with httpx.Client() as client:
        for i, (name, lat, lng) in enumerate(LOCATIONS, 1):
            print(f"[{i:02d}/{len(LOCATIONS)}] {name} ({lat}, {lng}) 동기화 중...", end=" ", flush=True)
            try:
                result = sync_location(client, base_url, name, lat, lng)
                print(f"OK 신규 {result['created']}개 / 업데이트 {result['updated']}개")
                for k in total:
                    total[k] += result.get(k, 0)
            except httpx.HTTPStatusError as e:
                print(f"ERR HTTP {e.response.status_code}: {e.response.text[:80]}")
            except Exception as e:
                print(f"ERR {e}")

            # Render free tier & Kakao API rate limit 고려
            if i < len(LOCATIONS):
                time.sleep(1)

    print("\n" + "=" * 50)
    print("전체 완료!")
    print(f"  신규 추가:  {total['created']}개")
    print(f"  업데이트:  {total['updated']}개")
    print(f"  건너뜀:    {total['skipped']}개")
    print(f"  오류:      {total['errors']}개")


if __name__ == "__main__":
    main()
