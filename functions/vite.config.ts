import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// Declare process to avoid TS errors if @types/node is missing
declare const process: any;

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  return {
    plugins: [react()],
    define: {
      // process.env.API_KEY 는 더 이상 클라이언트에서 사용하지 않습니다.
      // 모든 Gemini 호출은 Firebase Functions (서버) 에서 처리합니다.
      // 혹시 남은 참조가 있을 경우를 위해 빈 문자열로 대체합니다.
      'process.env.API_KEY': JSON.stringify('')
    }
  };
});