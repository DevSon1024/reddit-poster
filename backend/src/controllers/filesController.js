const fs = require("fs");
const path = require("path");
const multer = require("multer");
const {
  IMAGES_DIR,
  VIDEOS_DIR,
  DELETED_DIR,
  ALLOWED_IMAGES,
  ALLOWED_VIDEOS,
  BACKEND_ROOT,
} = require("../config/constants");
const { sanitizeFilename } = require("../utils/fileHelper");

// Configure multer to temporarily stream uploads to .tmp_uploads
const tmpDir = path.join(BACKEND_ROOT, ".tmp_uploads");
if (!fs.existsSync(tmpDir)) {
  fs.mkdirSync(tmpDir, { recursive: true });
}

const uploadMiddleware = multer({
  dest: tmpDir,
  limits: {
    fileSize: 1024 * 1024 * 1024, // 1GB max limit
  },
}).array("files");

async function deleteFile(req, res) {
  const { filename, type } = req.body || {};

  if (!filename) {
    return res.status(400).json({ message: "Filename is required." });
  }

  let sourceDir;
  if (type === "image" || type === "images") {
    sourceDir = IMAGES_DIR;
  } else if (type === "video" || type === "videos") {
    sourceDir = VIDEOS_DIR;
  } else {
    return res.status(400).json({ message: "Invalid file type." });
  }

  const sourcePath = path.join(sourceDir, filename);
  const destinationPath = path.join(DELETED_DIR, filename);

  try {
    if (!fs.existsSync(DELETED_DIR)) {
      fs.mkdirSync(DELETED_DIR, { recursive: true });
    }

    if (fs.existsSync(sourcePath)) {
      fs.renameSync(sourcePath, destinationPath);
      console.log(`>> Moved ${filename} to ${DELETED_DIR}`);
      return res.json({
        success: true,
        message: `${filename} deleted successfully.`,
      });
    } else {
      return res.status(404).json({ message: "File not found." });
    }
  } catch (err) {
    console.error(`Error deleting file:`, err);
    return res
      .status(500)
      .json({ message: `Failed to delete file: ${err.message}` });
  }
}

async function uploadFiles(req, res) {
  uploadMiddleware(req, res, async (err) => {
    if (err) {
      return res.status(400).json({ message: `Upload error: ${err.message}` });
    }

    const files = req.files || [];
    const username = req.body.username;
    const uploadType = req.body.type; // 'images' or 'videos'

    console.log(
      `>> Received upload request for user: ${username}, type: ${uploadType}, files: ${files.length}`,
    );

    if (!files.length) {
      return res
        .status(400)
        .json({
          message:
            "No files part in the request. Make sure to use 'files' key.",
        });
    }

    if (!username || !uploadType) {
      // Clean up tmp files
      files.forEach((f) => {
        if (fs.existsSync(f.path)) fs.unlinkSync(f.path);
      });
      return res
        .status(400)
        .json({ message: "Username and type are required." });
    }

    let targetDir;
    let allowedExts;

    if (uploadType === "images") {
      targetDir = IMAGES_DIR;
      allowedExts = ALLOWED_IMAGES;
    } else if (uploadType === "videos") {
      targetDir = VIDEOS_DIR;
      allowedExts = ALLOWED_VIDEOS;
    } else {
      files.forEach((f) => {
        if (fs.existsSync(f.path)) fs.unlinkSync(f.path);
      });
      return res
        .status(400)
        .json({ message: "Invalid upload type. Use 'images' or 'videos'." });
    }

    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    let uploadedCount = 0;
    const errors = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const ext = path.extname(file.originalname).toLowerCase();

      if (!allowedExts.has(ext)) {
        errors.push(`File type ${ext} not allowed for ${uploadType}.`);
        if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
        continue;
      }

      // Filename format: {username}_176_{timestamp}_{safe_name}
      const timestamp = `${Math.floor(Date.now() / 1000)}_${(Date.now() % 1000) + i}`;
      const safeName = sanitizeFilename(file.originalname);
      const newFilename = `${username}_176_${timestamp}_${safeName}`;
      const destinationPath = path.join(targetDir, newFilename);

      try {
        fs.renameSync(file.path, destinationPath);
        uploadedCount++;
        console.log(`>> Saved file: ${newFilename}`);
      } catch (saveErr) {
        console.error(`!! Failed to save file ${file.originalname}:`, saveErr);
        errors.push(`Failed to save ${file.originalname}: ${saveErr.message}`);
        if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
      }
    }

    if (uploadedCount === 0 && errors.length) {
      return res.status(400).json({ message: "Upload failed.", errors });
    }

    return res.json({
      success: true,
      message: `Successfully uploaded ${uploadedCount} files.`,
      errors: errors.length ? errors : null,
    });
  });
}

module.exports = {
  deleteFile,
  uploadFiles,
};
