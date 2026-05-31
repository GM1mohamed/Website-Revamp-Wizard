import { defineConfig } from "vite";
import path from "path";

const rawPort = process.env.PORT;
if (!rawPort) throw new Error("PORT environment variable is required but was not provided.");
const port = Number(rawPort);
if (Number.isNaN(port) || port <= 0) throw new Error(`Invalid PORT value: "${rawPort}"`);

const basePath = process.env.BASE_PATH || "/";

export default defineConfig({
  base: basePath,
  plugins: [],
  root: path.resolve(import.meta.dirname),
  publicDir: "public",
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: path.resolve(import.meta.dirname, "index.html"),
        login: path.resolve(import.meta.dirname, "login.html"),
        watch: path.resolve(import.meta.dirname, "pages/watch.html"),
        teachers: path.resolve(import.meta.dirname, "pages/teachers.html"),
        teacher: path.resolve(import.meta.dirname, "pages/teacher.html"),
        channel: path.resolve(import.meta.dirname, "pages/channel.html"),
        profile: path.resolve(import.meta.dirname, "pages/profile.html"),
        playlist: path.resolve(import.meta.dirname, "pages/playlist.html"),
        admin: path.resolve(import.meta.dirname, "pages/admin.html"),
      },
    },
  },
  server: {
    port,
    strictPort: true,
    host: "0.0.0.0",
    allowedHosts: true,
  },
  preview: {
    port,
    host: "0.0.0.0",
    allowedHosts: true,
  },
});
