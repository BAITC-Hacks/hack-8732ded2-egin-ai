import "dotenv/config";
import cors from "cors";
import express from "express";
import { logger } from "./logger.js";

const app = express();
const port = Number(process.env.PORT ?? 3000);

app.use(cors({ origin: process.env.FRONTEND_URL ?? "http://localhost:5173" }));
app.use(express.json());

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", service: "backend" });
});

app.listen(port, () => {
  logger.info("Backend started", {
    port,
    url: `http://localhost:${port}`,
  });
});
