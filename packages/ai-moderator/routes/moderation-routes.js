const express = require("express");
const multer = require("multer");
const { moderateText, moderateImage } = require("../controllers/moderation-controller");

const upload = multer();
const router = express.Router();

router.post('/text', moderateText);
router.post('/image', upload.single('image'), moderateImage);

module.exports = router;