import multer from "multer";
import DataParser from "datauri/parser.js";
import path from "path";

const storage = multer.memoryStorage();

const allowedMimeTypes = ["image/png", "image/jpeg", "image/webp"];
export const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 },
  fileFilter: (req, file, cb) => {
    if (!allowedMimeTypes.includes(file.mimetype)) {
      return cb(new Error("Only PNG, Webp, JPEG files are allowed"), false);
    }
    cb(null, true);
  },
});
const parser = new DataParser();
export const formatImage = (file) => {
  const fileExtension = path.extname(file.originalname).toString();
  return parser.format(fileExtension, file.buffer).content;
};
