import express from "express";
import multer from "multer";
import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";
import { createServer as createViteServer } from "vite";
import fs from "fs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const uploadDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}

const db = new Database("videos.db");
db.exec("CREATE TABLE IF NOT EXISTS videos (id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT, filename TEXT)");

// Migration: Add description and thumbnail if they don't exist
const tableInfo = db.prepare("PRAGMA table_info(videos)").all() as any[];
const columnNames = tableInfo.map(col => col.name);

if (!columnNames.includes("description")) {
  db.exec("ALTER TABLE videos ADD COLUMN description TEXT");
}
if (!columnNames.includes("thumbnail")) {
  db.exec("ALTER TABLE videos ADD COLUMN thumbnail TEXT");
}
if (!columnNames.includes("logo")) {
  db.exec("ALTER TABLE videos ADD COLUMN logo TEXT");
}
if (!columnNames.includes("trailer")) {
  db.exec("ALTER TABLE videos ADD COLUMN trailer TEXT");
}
if (!columnNames.includes("year")) {
  db.exec("ALTER TABLE videos ADD COLUMN year TEXT");
}
if (!columnNames.includes("rating")) {
  db.exec("ALTER TABLE videos ADD COLUMN rating TEXT");
}
if (!columnNames.includes("duration")) {
  db.exec("ALTER TABLE videos ADD COLUMN duration TEXT");
}
if (!columnNames.includes("quality")) {
  db.exec("ALTER TABLE videos ADD COLUMN quality TEXT");
}
if (!columnNames.includes("audio")) {
  db.exec("ALTER TABLE videos ADD COLUMN audio TEXT");
}
if (!columnNames.includes("hasSubtitles")) {
  db.exec("ALTER TABLE videos ADD COLUMN hasSubtitles INTEGER DEFAULT 0");
}
if (!columnNames.includes("hasAD")) {
  db.exec("ALTER TABLE videos ADD COLUMN hasAD INTEGER DEFAULT 0");
}

const storage = multer.diskStorage({
  destination: uploadDir,
  filename: (req, file, cb) => {
    cb(null, Date.now() + "-" + file.originalname);
  }
});
const upload = multer({ 
  storage,
  limits: { fileSize: 500 * 1024 * 1024 } // 500MB limit
});
const app = express();
const PORT = 3000;

app.use(express.json({ limit: "500mb" }));
app.use(express.urlencoded({ limit: "500mb", extended: true }));
app.use("/uploads", express.static(uploadDir));

// API routes
app.get("/api/storage-info", (req, res) => {
  try {
    const stats = fs.statSync(uploadDir);
    // On a Pi, we'd use something like 'diskusage' library for real stats, 
    // but for now we'll just return the upload folder size or a placeholder
    res.json({ 
      location: uploadDir,
      isLocal: true,
      note: "Running on local storage"
    });
  } catch (e) {
    res.status(500).json({ error: "Could not read storage info" });
  }
});

app.get("/api/videos", (req, res) => {
  const videos = db.prepare("SELECT * FROM videos").all();
  res.json(videos);
});

app.post("/api/videos", upload.fields([{ name: "video", maxCount: 1 }, { name: "thumbnail", maxCount: 1 }, { name: "logo", maxCount: 1 }, { name: "trailer", maxCount: 1 }]), (req, res) => {
  try {
    console.log("Upload request received", {
      body: req.body,
      files: req.files ? Object.keys(req.files) : 'none'
    });
    
    const { title, description, year, rating, duration, quality, audio, hasSubtitles, hasAD } = req.body;
    const files = req.files as { [fieldname: string]: Express.Multer.File[] };
    const filename = files["video"]?.[0]?.filename;
    const thumbnail = files["thumbnail"]?.[0]?.filename;
    const logo = files["logo"]?.[0]?.filename;
    const trailer = files["trailer"]?.[0]?.filename;

    if (!title || !filename) {
      console.warn("Missing required fields", { title, filename });
      return res.status(400).json({ error: "Title and video file are required" });
    }
    
    const stmt = db.prepare("INSERT INTO videos (title, description, filename, thumbnail, logo, trailer, year, rating, duration, quality, audio, hasSubtitles, hasAD) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
    const info = stmt.run(
      title, 
      description || "", 
      filename, 
      thumbnail || "", 
      logo || "", 
      trailer || "",
      year || "",
      rating || "",
      duration || "",
      quality || "",
      audio || "",
      hasSubtitles === "true" || hasSubtitles === "1" ? 1 : 0,
      hasAD === "true" || hasAD === "1" ? 1 : 0
    );
    
    console.log("Upload successful", { id: info.lastInsertRowid });
    res.json({ id: info.lastInsertRowid, title, description, filename, thumbnail, logo, trailer });
  } catch (error) {
    console.error("Error in POST /api/videos:", error);
    res.status(500).json({ error: error instanceof Error ? error.message : "Internal Server Error" });
  }
});

app.put("/api/videos/:id", upload.fields([{ name: "video", maxCount: 1 }, { name: "thumbnail", maxCount: 1 }, { name: "logo", maxCount: 1 }, { name: "trailer", maxCount: 1 }]), (req, res) => {
  const { id } = req.params;
  const { title, description, year, rating, duration, quality, audio, hasSubtitles, hasAD } = req.body;
  const files = req.files as { [fieldname: string]: Express.Multer.File[] };
  
  const existing = db.prepare("SELECT * FROM videos WHERE id = ?").get(id) as any;
  if (!existing) return res.status(404).json({ error: "Video not found" });

  const filename = files["video"]?.[0]?.filename || existing.filename;
  const thumbnail = files["thumbnail"]?.[0]?.filename || existing.thumbnail;
  const logo = files["logo"]?.[0]?.filename || existing.logo;
  const trailer = files["trailer"]?.[0]?.filename || existing.trailer;

  // Delete old files if replaced
  if (files["video"]?.[0] && existing.filename) {
    try { fs.unlinkSync(path.join(uploadDir, existing.filename)); } catch (e) {}
  }
  if (files["thumbnail"]?.[0] && existing.thumbnail) {
    try { fs.unlinkSync(path.join(uploadDir, existing.thumbnail)); } catch (e) {}
  }
  if (files["logo"]?.[0] && existing.logo) {
    try { fs.unlinkSync(path.join(uploadDir, existing.logo)); } catch (e) {}
  }
  if (files["trailer"]?.[0] && existing.trailer) {
    try { fs.unlinkSync(path.join(uploadDir, existing.trailer)); } catch (e) {}
  }

  const stmt = db.prepare("UPDATE videos SET title = ?, description = ?, filename = ?, thumbnail = ?, logo = ?, trailer = ?, year = ?, rating = ?, duration = ?, quality = ?, audio = ?, hasSubtitles = ?, hasAD = ? WHERE id = ?");
  stmt.run(
    title || existing.title, 
    description || existing.description, 
    filename, 
    thumbnail, 
    logo, 
    trailer,
    year !== undefined ? year : existing.year,
    rating !== undefined ? rating : existing.rating,
    duration !== undefined ? duration : existing.duration,
    quality !== undefined ? quality : existing.quality,
    audio !== undefined ? audio : existing.audio,
    hasSubtitles !== undefined ? (hasSubtitles === "true" || hasSubtitles === "1" ? 1 : 0) : existing.hasSubtitles,
    hasAD !== undefined ? (hasAD === "true" || hasAD === "1" ? 1 : 0) : existing.hasAD,
    id
  );
  
  res.json({ id, title, description, filename, thumbnail, logo, trailer });
});

app.delete("/api/videos/:id", (req, res) => {
  const { id } = req.params;
  const video = db.prepare("SELECT filename, thumbnail, logo, trailer FROM videos WHERE id = ?").get(id) as { filename: string, thumbnail: string, logo: string, trailer: string } | undefined;
  if (video) {
    try {
      if (video.filename) fs.unlinkSync(path.join(uploadDir, video.filename));
      if (video.thumbnail) fs.unlinkSync(path.join(uploadDir, video.thumbnail));
      if (video.logo) fs.unlinkSync(path.join(uploadDir, video.logo));
      if (video.trailer) fs.unlinkSync(path.join(uploadDir, video.trailer));
    } catch (e) {}
    db.prepare("DELETE FROM videos WHERE id = ?").run(id);
    res.json({ success: true });
  } else {
    res.status(404).json({ error: "Video not found" });
  }
});

// Global error handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error("Server Error:", err);
  res.status(err.status || 500).json({ 
    error: err.message || "Internal Server Error" 
  });
});

// Vite middleware for development
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
