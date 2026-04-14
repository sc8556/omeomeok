# 오늘 뭐 먹지 🍽️

데이트 장소 음식점 추천 앱. 현재 위치 또는 원하는 지역을 기준으로 근처 맛집을 추천해준다.

---

## 주요 기능

- 현재 위치(GPS) 또는 직접 입력한 지역 기준 음식점 추천
- 음식 종류 / 예산 / 거리 필터 지원
- 카카오 AI 기반 추천 알고리즘 (거리·음식 종류·예산·평점 가중치 스코어링)
- 날짜별 추천 기록 조회
- 카카오맵 연동 (메뉴 보기, 위치 확인)

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

## 프로젝트 구조

```
omeomeok/
├── backend/              # FastAPI 백엔드
│   ├── app/
│   │   ├── core/         # config, dependencies
│   │   ├── db/           # session, base
│   │   ├── models/       # SQLAlchemy ORM
│   │   ├── repositories/ # DB 쿼리 레이어
│   │   ├── routes/       # API 엔드포인트
│   │   ├── schemas/      # Pydantic 스키마
│   │   ├── services/     # 비즈니스 로직 (추천 알고리즘)
│   │   └── utils/        # 유틸 함수
│   ├── bulk_sync.py      # 서울 전체 음식점 대량 동기화 스크립트
│   ├── sync_places.py    # 단일 위치 동기화 CLI
│   └── requirements.txt
└── frontend/             # Expo React Native 앱
    ├── src/
    │   ├── constants/    # API URL, 음식 종류, 예산 옵션
    │   ├── contexts/     # SessionContext
    │   ├── hooks/        # useLocation, useSessionId
    │   ├── navigation/   # 네비게이터
    │   ├── screens/      # 7개 스크린
    │   ├── services/     # API 클라이언트
    │   ├── theme/        # 색상, 타이포그래피
    │   └── types/        # TypeScript 인터페이스
    ├── app.json
    └── eas.json
```

---

## 개발 환경 실행

### 백엔드

```bash
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload
```

### 프론트엔드

```bash
cd frontend
npm install
npx expo start
```

### 환경변수 (`backend/.env`)

```
APP_ENV=development
DATABASE_URL=postgresql://<user>:<password>@<host>/<db>
SECRET_KEY=your-secret-key
ALLOWED_ORIGINS_STR=*
KAKAO_API_KEY=your-kakao-api-key
```

---

## API 엔드포인트

| 메서드 | 경로 | 설명 |
|--------|------|------|
| GET | `/health` | 헬스체크 |
| GET | `/api/v1/restaurants` | 식당 목록 |
| GET | `/api/v1/restaurants/{id}` | 식당 상세 |
| POST | `/api/v1/restaurants/sync` | Kakao 음식점 동기화 |
| POST | `/api/v1/recommendations` | 추천 생성 |
| GET | `/api/v1/history/{session_id}` | 추천 기록 |
| GET | `/api/v1/geocode/reverse` | 역지오코딩 (좌표 → 주소) |
| GET | `/api/v1/geocode/search` | 위치 검색 (키워드 → 좌표) |

---

## APK 빌드

```bash
cd frontend
eas build --platform android --profile preview --non-interactive
```

`eas.json`의 `preview` 프로필에서 `EXPO_PUBLIC_API_URL`이 빌드 타임에 자동 주입된다.

---

## 배포

- **백엔드**: [https://omeomeok.onrender.com](https://omeomeok.onrender.com)
- **GitHub**: [https://github.com/sc8556/omeomeok](https://github.com/sc8556/omeomeok)
- master 브랜치 push 시 Render에 자동 배포

> Render 무료 티어 사용으로 비활성 상태에서 첫 요청 시 약 30초의 콜드 스타트가 발생할 수 있다.

---

## 음식점 DB 동기화

서울 전체 음식점 일괄 동기화:

```bash
cd backend

# Render 백엔드 대상 (기본)
python bulk_sync.py

# 로컬 서버 대상
python bulk_sync.py --url http://localhost:8000
```

현재 DB: 약 1,700개 식당 (서울 전체)
