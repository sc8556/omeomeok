# 오늘 뭐 먹지 — CLAUDE.md

데이트 장소 음식점 추천 앱. 현재 위치 또는 원하는 지역을 기준으로 근처 맛집을 추천해준다.

---

## 프로젝트 구조

```
omeomeok/
├── backend/          # FastAPI 백엔드
│   ├── app/
│   │   ├── core/         # config, dependencies
│   │   ├── db/           # session, base
│   │   ├── models/       # SQLAlchemy ORM (restaurant, recommendation, preference)
│   │   ├── repositories/ # DB 쿼리 레이어
│   │   ├── routes/       # API 엔드포인트
│   │   ├── schemas/      # Pydantic 스키마
│   │   ├── services/     # 비즈니스 로직
│   │   └── utils/        # haversine_distance
│   ├── bulk_sync.py      # 서울 전체 음식점 대량 동기화 스크립트
│   ├── sync_places.py    # 단일 위치 동기화 CLI
│   └── requirements.txt
└── frontend/         # Expo React Native 앱
    ├── src/
    │   ├── constants/    # API URL, FOOD_TYPES, BUDGET_OPTIONS 등
    │   ├── contexts/     # SessionContext (AsyncStorage 기반 session_id)
    │   ├── hooks/        # useLocation, useSessionId
    │   ├── navigation/   # RootStack + MainTab 네비게이터
    │   ├── screens/      # 7개 스크린
    │   ├── services/     # axios API 클라이언트
    │   ├── theme/        # colors, spacing, typography
    │   ├── types/        # TypeScript 인터페이스
    │   └── utils/        # formatKRW, extractDistance, groupItemsByDate 등
    ├── app.json
    └── eas.json
```

---

## 기술 스택

| 레이어 | 기술 |
|--------|------|
| 백엔드 | Python 3.11 / FastAPI 0.111 / SQLAlchemy 2.0 |
| DB | PostgreSQL (Render 무료 티어) |
| 프론트엔드 | React Native / Expo SDK 51 / TypeScript |
| 빌드 | EAS Build (Expo Application Services) |
| 배포 | Render (백엔드 자동 배포, GitHub 연동) |
| 외부 API | 카카오 로컬 API (음식점 검색, 역지오코딩, 위치 검색) |

---

## 배포 정보

- **백엔드 URL**: `https://omeomeok.onrender.com`
- **GitHub**: `https://github.com/sc8556/omeomeok`
- **Render 서비스**: master 브랜치 push 시 자동 배포
- **EAS 프로젝트**: `@jay-cho/date-meal-recommender` (projectId: `7a1e7365-8bb0-45a3-9c7b-baf1efe73072`)

### APK 빌드

```bash
cd frontend
eas build --platform android --profile preview --non-interactive
```

`eas.json`의 `preview` 프로필에서 `EXPO_PUBLIC_API_URL=https://omeomeok.onrender.com` 환경변수가 APK에 빌드 타임에 주입된다.

---

## 환경변수 (backend/.env)

```
APP_ENV=development
DATABASE_URL=postgresql://omeomeok_db_user:...@dpg-d71mih63jp1c739eb410-a/omeomeok_db
SECRET_KEY=change-me-in-production
ALLOWED_ORIGINS_STR=*
KAKAO_API_KEY=29ee1bd5bd8891543e3e902103b15547
SEOUL_API_KEY=           # 서울시 열린 데이터 광장 API 키 (미설정)
```

Render 환경변수에도 동일하게 설정 필요. `DATABASE_URL`은 내부 URL(`postgres://`) 사용, SQLAlchemy가 `postgresql://`로 자동 변환.

---

## 핵심 기능

### 추천 알고리즘 (`recommendation_service.py`)
1. DB에서 최대 2,000개 식당 로드
2. 사용자 위치 기준 `distance_km` 반경으로 필터링
   - 좌표 없거나 (0,0)인 식당은 필터에서 제외
   - 반경 내 결과 없으면 빈 리스트 반환 → 프론트에서 "근처 맛집 없음" 표시
3. 남은 후보 스코어링:
   - 음식 종류 일치: +30
   - 예산 적합: +15
   - 평점 보너스: rating × 2 (최대 10점)
   - 거리 근접: 1km 이내 +10 / 3km +6 / 5km +3
4. 상위 5개 반환, `recommendations` 테이블에 저장

### 음식점 동기화
- **Kakao API** (`/api/v1/restaurants/sync`): 특정 좌표 주변 음식점 동기화
- **서울 열린 데이터** (`/api/v1/restaurants/sync/seoul`): SEOUL_API_KEY 필요 (미설정)
- **bulk_sync.py**: 서울 25개 구 + 주요 상권 40곳 일괄 동기화
  ```bash
  cd backend
  python bulk_sync.py                          # Render 백엔드 대상
  python bulk_sync.py --url http://localhost:8000  # 로컬 서버 대상
  ```

현재 DB: 약 1,700개 식당 (서울 전체)

---

## API 엔드포인트

| 메서드 | 경로 | 설명 |
|--------|------|------|
| GET | `/health` | 헬스체크 |
| GET | `/api/v1/restaurants` | 식당 목록 (`?limit=2000`) |
| GET | `/api/v1/restaurants/{id}` | 식당 상세 |
| POST | `/api/v1/restaurants/sync` | Kakao 동기화 |
| POST | `/api/v1/restaurants/sync/seoul` | 서울 API 동기화 |
| POST | `/api/v1/recommendations` | 추천 생성 |
| GET | `/api/v1/history/{session_id}` | 추천 기록 |
| GET | `/api/v1/geocode/reverse` | 역지오코딩 (좌표 → 주소) |
| GET | `/api/v1/geocode/search` | 위치 검색 (키워드 → 좌표 목록) |

---

## DB 스키마 주요 사항

### restaurants 테이블
- `kakao_id`: Kakao 장소 ID (unique). 서울 데이터는 `seoul_{MGTNO}` 형식으로 저장
- `place_url`: 카카오맵 장소 URL (`https://place.map.kakao.com/...`). 메뉴 확인용
- `rating`: 기본값 0.0 (Kakao API가 평점 미제공). 프론트에서 0.0이면 표시 숨김
- `price_range`: 1=저렴, 2=보통, 3=고급. 0이면 프론트에서 "₩₩"으로 표시

### DB 마이그레이션
`main.py` 시작 시 `Base.metadata.create_all()` + `ALTER TABLE IF NOT EXISTS`로 새 컬럼 자동 추가. Alembic 미사용.

---

## 프론트엔드 스크린

| 스크린 | 설명 |
|--------|------|
| `OnboardingScreen` | 앱 시작 화면 |
| `HomeScreen` | 메인: 음식 종류 / 예산 / 거리 필터 + 위치 검색 |
| `RecommendationResultsScreen` | 추천 결과 (상위 5개, 점수 표시) |
| `RestaurantDetailScreen` | 식당 상세: 지도, 전화, 카카오맵 메뉴 보기 |
| `RestaurantListScreen` | 전체 식당 목록 + 검색 |
| `HistoryScreen` | 날짜별 추천 기록 |
| `SettingsScreen` | 세션 ID, 앱 버전 정보 |

### 위치 처리 (`useLocation`)
- GPS 허용 시: 실제 좌표 사용
- GPS 거부 시: 서울 시청(37.5665, 126.9780) 기본 위치
- 홈 화면에서 "다른 위치로 검색" 버튼으로 임의 지역 검색 가능
- 위치 카드 탭 → GPS 재요청

---

## 알려진 제약사항 및 결정사항

1. **Render 무료 티어**: 비활성 후 cold start 약 30초. 프론트에서 catch 시 기존 데이터 유지 (빈 화면 방지)
2. **별점 없음**: Kakao 키워드 검색 API가 평점 미제공. 별점 0.0인 식당은 UI에서 표시 숨김
3. **분위기 필터 제거**: UX 단순화를 위해 제거 (백엔드 `mood` 필드는 optional로 유지)
4. **세션 기반**: 로그인 없음. AsyncStorage에 UUID 저장, 추천 기록은 session_id로 관리
5. **PostgreSQL 전환**: 초기 SQLite → Render 재배포 시 데이터 초기화 문제로 PostgreSQL 이전

---

## 개발 환경 실행

```bash
# 백엔드
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload

# 프론트엔드
cd frontend
npm install
npx expo start
```
