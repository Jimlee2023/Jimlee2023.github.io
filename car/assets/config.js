/**
 * 만기콕 설정 파일 — 이 파일만 고치면 문구·연락처·기능을 바꿀 수 있습니다.
 */
window.MANGIKOK_CONFIG = {
  appName: "만기콕",
  message: "잊으셔도 괜찮아요.\n제가 먼저 챙기겠습니다.",

  // FC 정보 (공개 범위: 실명 + 소속 + 사진. 전화번호는 공개하지 않음)
  fcName: "이진현",
  company: "우리금융 ABL생명",
  branch: "서울지점",
  registrationNo: "202501-1020-1114", // 생명보험협회 조회 '고유번호' — 지점장님 확인 후 확정
  reviewNo: "", // 심의필 번호 — 받으면 입력 (예: "ABL생명 준법감시인 심의필 제2026-000호")

  // 연결 주소
  homeUrl: "https://jimlee2023.github.io/", // 기존 상담 페이지
  openChatUrl: "https://open.kakao.com/o/sLpaz9Pi", // 카카오톡 오픈채팅

  // 데이터 저장 주소 (Google Apps Script 웹앱 URL). 비어 있으면 '미리보기 모드'로 동작
  endpoint: "",

  // 기능 스위치
  features: {
    autoInsurance: false, // 손해보험 교차모집 등록 확인 후 true로 변경 → 자동차·운전자보험 상담 항목 표시
  },
};
