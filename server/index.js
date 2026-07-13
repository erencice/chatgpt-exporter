import express from "express";
import cors from "cors";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { scrapeChatGPT } from "../core/scraper.js";
import { enqueue, getJob } from "./queue.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3001;
const DIST_DIR = path.join(__dirname, "..", "dist");

app.use(cors());
app.use(express.json());

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", distExists: fs.existsSync(path.join(DIST_DIR, "index.html")) });
});

app.get("/api/debug", async (_req, res) => {
  try {
    const { chromium } = await import("playwright");
    const browser = await chromium.launch({
      headless: true,
      args: ["--disable-dev-shm-usage", "--disable-gpu", "--no-sandbox", "--disable-setuid-sandbox"],
    });
    const page = await browser.newPage();
    await page.goto("https://chatgpt.com/share/6a5522a8-e9fc-83ed-8a8c-2c46e8c50bae", { waitUntil: "load", timeout: 15000 });
    const title = await page.title();
    const sections = await page.evaluate(() =>
      document.querySelectorAll('[data-testid^="conversation-turn-"]').length
    );
    const bodyText = await page.evaluate(() => document.body.innerText.substring(0, 500));
    await browser.close();
    res.json({ title, sections, bodyPreview: bodyText });
  } catch (e) {
    res.json({ error: e.message });
  }
});

app.post("/api/jobs", (req, res) => {
  const { url } = req.body;
  if (!url || !url.includes("chatgpt.com/share/")) {
    return res.status(400).json({ error: "Valid ChatGPT share URL required." });
  }
  const jobId = enqueue(url.trim());
  res.json({ jobId, status: "queued" });
});

app.get("/api/jobs/:jobId", (req, res) => {
  const job = getJob(req.params.jobId);
  if (!job) return res.status(404).json({ error: "Job not found" });
  res.json(job);
});

app.post("/api/scrape", async (req, res) => {
  const { url } = req.body;
  if (!url || !url.includes("chatgpt.com/share/")) {
    return res.status(400).json({ error: "Valid ChatGPT share URL required." });
  }
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();
  const send = (data) => res.write(`data: ${JSON.stringify(data)}\n\n`);
  try {
    const result = await scrapeChatGPT(url, send);
    send({ type: "done", ...result });
  } catch (e) {
    send({ type: "error", error: e.message });
  } finally {
    res.end();
  }
});

app.use(express.static(DIST_DIR));

app.use((_req, res) => {
  res.sendFile(path.join(DIST_DIR, "index.html"));
});

app.listen(PORT, () => {
  console.log(`ChatGPT Exporter → :${PORT}`);
});
