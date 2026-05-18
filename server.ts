import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import multer from "multer";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { Upload } from "@aws-sdk/lib-storage";
import axios from "axios";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '50mb' }));

// Multer for memory storage
const upload = multer({ storage: multer.memoryStorage() });

// Cloudflare R2 Client
const r2Client = new S3Client({
  region: "auto",
  endpoint: `https://${process.env.CF_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.CF_R2_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.CF_R2_SECRET_ACCESS_KEY || "",
  },
});

// API: Health Check
app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

// API: Upload to R2
app.post("/api/upload", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });
    
    const fileName = `${Date.now()}-${req.file.originalname}`;
    const params = {
      Bucket: process.env.CF_R2_BUCKET_NAME,
      Key: fileName,
      Body: req.file.buffer,
      ContentType: req.file.mimetype,
    };

    const parallelUploads3 = new Upload({
      client: r2Client,
      params: params,
    });

    await parallelUploads3.done();
    
    const publicUrl = `${process.env.CF_R2_PUBLIC_URL}/${fileName}`;
    res.json({ url: publicUrl });
  } catch (error) {
    console.error("R2 Upload Error:", error);
    res.status(500).json({ error: "Failed to upload to R2" });
  }
});

// API: D1 Proxy
app.post("/api/db/query", async (req, res) => {
  const { sql, params } = req.body;
  
  if (!process.env.CF_ACCOUNT_ID || !process.env.CF_API_TOKEN || !process.env.CF_D1_DATABASE_ID) {
    return res.status(500).json({ error: "Cloudflare D1 credentials not configured" });
  }

  try {
    const response = await axios.post(
      `https://api.cloudflare.com/client/v4/accounts/${process.env.CF_ACCOUNT_ID}/d1/database/${process.env.CF_D1_DATABASE_ID}/query`,
      { sql, params },
      {
        headers: {
          "Authorization": `Bearer ${process.env.CF_API_TOKEN}`,
          "Content-Type": "application/json"
        }
      }
    );

    res.json(response.data);
  } catch (error: any) {
    console.error("D1 Query Error:", error.response?.data || error.message);
    res.status(500).json({ error: "Failed to query D1", details: error.response?.data });
  }
});

// Vite Middleware for Development
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*all", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
