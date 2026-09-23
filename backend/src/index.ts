import { fileURLToPath } from "node:url";
import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import { logger } from "./logger.js";
import agentRouter from "./routes/agent.js";
import calibrationRouter from "./routes/calibration.js";
import datasetRouter from "./routes/dataset.js";
import walkForwardRouter from "./routes/walkForward.js";

dotenv.config({
  path: fileURLToPath(new URL("../.env", import.meta.url)),
});

const app = express();
const port = Number(process.env.PORT ?? 3000);
const allowedOrigins = ["http://localhost:5173", process.env.FRONTEND_URL].filter(
  (origin: string | undefined): origin is string => origin !== undefined,
);

app.use(
  cors({
    origin: allowedOrigins,
    methods: ["GET", "POST"],
    credentials: false,
  }),
);
app.use(express.json());

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", service: "backend" });
});

app.use("/api/dataset", datasetRouter);
app.use("/api/calibrate", calibrationRouter);
app.use("/api/walk-forward-simulate", walkForwardRouter);
app.use("/api/agent", agentRouter);

app.listen(port, () => {
  logger.info("Backend started", {
    port,
    url: `http://localhost:${port}`,
  });
});
