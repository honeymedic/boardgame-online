import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // 개발 중: 브라우저는 5173(Vite)에 접속하고, 소켓 통신만 3001(Node 서버)로 넘긴다.
    proxy: {
      "/socket.io": { target: "http://localhost:3001", ws: true },
    },
  },
});
