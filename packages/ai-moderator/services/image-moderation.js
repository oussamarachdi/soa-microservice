const axios = require('axios');
const HUGGINGFACE_KEYS = require('../config/keys.js'); 

const analyzeImage = async (imageBuffer) => {
  try {
    const response = await axios.post(
      HUGGINGFACE_KEYS.IMAGE_API,
      imageBuffer,
      {
        headers: {
          Authorization: `Bearer ${HUGGINGFACE_KEYS.API_KEY}`,
          'Content-Type': 'image/jpeg'
        }
      }
    );
    return {
      isNSFW: response.data.some(item => item.label === 'nsfw'),
      scores: response.data
    };
  } catch (error) {
    console.error("Image Moderation Error:", error);
    throw new Error("Image analysis failed");
  }
};

module.exports = {analyzeImage};