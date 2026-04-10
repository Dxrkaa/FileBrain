import express from "express";
import cors from "cors";
import multer from "multer";
import { createServer } from "http";
import { initDb } from "./db";
import { filesRouter } from "./routes/files";
import { searchRouter } from "./routes/search";
import { statsRouter } from "./routes/stats";
import { graphRouter } from "./routes/graph";
import * as net from "net";

export const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 },
});

async function getFreePort(): Promise<number> {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.listen(0, "127.0.0.1", () => {
      const address = server.address() as net.AddressInfo;
      server.close(() => resolve(address.port));
    });
  });
}

export async function startServer(): Promise<number> {
  initDb();

  const app = express();
  app.use(cors({ origin: "*" }));
  app.use(express.json({ limit: "10mb" }));
  app.use(express.urlencoded({ extended: true }));

  app.use("/api/files", filesRouter);
  app.use("/api/search", searchRouter);
  app.use("/api/stats", statsRouter);
  app.use("/api/graph", graphRouter);

  app.get("/api/health", (_req, res) => {
    res.json({ ok: true });
  });

  const port = await getFreePort();
  const server = createServer(app);
  await new Promise<void>((resolve) => server.listen(port, "127.0.0.1", resolve));
  return port;
}
