
/**
 * 결제 가맹점(Merchant) API 설정 가이드
 * Fonepay, Khalti, eSewa 등 결제사로부터 승인을 받은 후 아래 정보를 업데이트하세요.
 */

export const PAYMENT_CONFIG = {
  // 1. 결제사 이름
  provider: 'Fonepay',
  
  // 2. 가맹점 식별 번호 (결제사로부터 받음)
  merchantId: 'YOUR_MERCHANT_ID_HERE', 
  
  // 3. API 비밀 키 (결제사로부터 받음 - 절대 공개 금지)
  secretKey: 'YOUR_SECRET_KEY_HERE',
  
  // 4. 웹훅 주소 (결제사 관리자 페이지에 등록해야 하는 주소)
  // 이 주소로 결제사가 "결제 완료" 신호를 보냅니다.
  webhookUrl: 'https://eps-topik-mate.firebaseapp.com/api/payment-webhook',
  
  // 5. 테스트 모드 여부
  isTestMode: true
};

/**
 * 나중에 실제 API를 호출할 함수입니다.
 * 지금은 시뮬레이션으로 작동합니다.
 */
export const verifyPaymentWithServer = async (paymentId: string): Promise<boolean> => {
  console.log(`Verifying payment ${paymentId} with ${PAYMENT_CONFIG.provider} API...`);
  
  // 실제 연동 시: fetch(PAYMENT_CONFIG.webhookUrl, { ... }) 로직이 들어갑니다.
  return new Promise((resolve) => {
    setTimeout(() => {
      // 90% 확률로 성공 시뮬레이션
      resolve(true);
    }, 3000);
  });
};
