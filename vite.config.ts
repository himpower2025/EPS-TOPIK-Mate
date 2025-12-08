import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  return {
    plugins: [react()],
    // [중요] 빌드 시점에 process.env를 객체로 정의하여 브라우저에서 'process is not defined' 에러 방지
    define: {
      'process.env': {
        API_KEY: JSON.stringify(env.API_KEY || '')
      }
    }
  };
});