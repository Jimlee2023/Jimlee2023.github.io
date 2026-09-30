# 만기콕 — 1단계 MVP

자동차보험·검사·엔진오일 만기 알림 웹앱(PWA)입니다. 고객이 등록하거나 상담을 신청하면 FC 이진현에게 연결됩니다.

## 구성

| 파일 | 역할 |
|---|---|
| `index.html` | 랜딩 + 차량 등록 |
| `my.html` | 내 차 만기 현황 (D-day, 휴대폰 달력 알림 저장, 가족·친구 공유) |
| `consult.html` | 무료 점검 상담 신청 |
| `privacy.html` | 개인정보처리방침 (준법감시 확인 필요) |
| `assets/config.js` | **이름, 소속, 등록번호, 심의필, 오픈채팅 주소, 기능 스위치를 여기서 수정** |
| `apps-script/Code.gs` | 구글 시트 저장, 상담 신청 이메일 알림, 매일 9시 만기 고객 목록 이메일 |

서버 비용은 0원입니다 (GitHub Pages + Google 스프레드시트).

## 배포 순서

1. **구글 시트 연결**
   1. Google 스프레드시트를 새로 만들고 `확장 프로그램 → Apps Script`를 엽니다.
   2. `Code.gs` 내용을 붙여넣고 `FC_EMAIL`을 본인 이메일로 바꿉니다.
   3. 함수 `setup`을 한 번 실행하고 권한을 허용합니다.
   4. `배포 → 새 배포 → 웹 앱`을 선택합니다. 실행 사용자는 **나**, 액세스 권한은 **모든 사용자**로 설정합니다.
   5. 발급된 URL을 `assets/config.js`의 `endpoint`에 넣습니다.
2. **GitHub Pages 올리기**: `mangikok` 폴더 내용을 `jimlee2023.github.io` 저장소의 `car/` 폴더에 올립니다.
   → 주소: `https://jimlee2023.github.io/car/`
3. **기존 상담 페이지에 연결**: 기존 페이지에 `https://jimlee2023.github.io/car/?utm_source=home` 버튼을 추가합니다.

`endpoint`가 비어 있으면 **미리보기 모드**로 동작합니다. 화면은 모두 작동하지만 데이터는 전송되지 않습니다.

## ⚠️ 공개 배포 전 체크리스트

- [ ] 심의필 번호를 `reviewNo`에 입력 (**심의필 전에는 고객에게 링크를 보내지 마세요**)
- [ ] 설계사 등록번호 확인 (`registrationNo`)
- [ ] 개인정보처리방침 문구를 준법감시에서 확인
- [ ] 오픈채팅 주소 입력 (`openChatUrl`, 비어 있으면 버튼이 숨겨짐)
- [ ] 손보 교차모집 등록이 확인되면 `features.autoInsurance: true` (운전자보험·자동차보험 상담 항목 표시)

## 유입 경로 추적

링크 뒤에 `?utm_source=` 를 붙이면 시트의 '유입경로' 칸에 기록됩니다.

| 용도 | 링크 |
|---|---|
| 카톡 1:1 발송 | `https://jimlee2023.github.io/car/?utm_source=kakao` |
| 명함 QR | `https://jimlee2023.github.io/car/?utm_source=card` |
| 블로그 | `https://jimlee2023.github.io/car/?utm_source=blog` |
