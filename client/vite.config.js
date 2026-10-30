import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  // 화면 구석에 표시할 빌드 시각. 어떤 버전을 보고 있는지 구분용
  define: { __BUILD_TIME__: JSON.stringify(new Date().toLocaleString("ko-KR", { timeZone: "Asia/Seoul", hour12: false })) },
  server: {
    port: 5173,
    // 개발 중: 브라우저는 5173(Vite)에 접속하고, 소켓 통신만 3001(Node 서버)로 넘긴다.
    proxy: {
      "/socket.io": { target: "http://localhost:3001", ws: true },
    },
  },
});
