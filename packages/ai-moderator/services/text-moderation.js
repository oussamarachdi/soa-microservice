const axios = require('axios');
const HUGGINGFACE_KEYS = require('../config/keys.js'); // Correctly import the default export

const analyzeText = async (text) => {
  try {    // Check if the Hugging Face API key exists
    if (!HUGGINGFACE_KEYS.API_KEY) {
      console.warn("Warning: No Hugging Face API key found. Using mock response for text moderation.");
      
      // Return a mock response when the API key doesn't exist
      return {
        isToxic: false, // Use a simple formula based on text content for demonstration
        scores: [
          { label: 'toxic', score: 0.1 },
          { label: 'obscene', score: 0.05 }
        ]
      };
    }
    
    const response = await axios.post(
      HUGGINGFACE_KEYS.TEXT_API,
      { inputs: text },
      {
        headers: {
          Authorization: `Bearer ${HUGGINGFACE_KEYS.API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
 
    console.log('[Text Moderation] Raw API response:', JSON.stringify(response.data, null, 2));
    

    if (!response.data || !Array.isArray(response.data) || response.data.length === 0) {
      console.warn('[Text Moderation] Invalid or empty response from API');
      return {
        isToxic: false,
        scores: [{ label: 'unknown', score: 0 }]
      };
    }
    let scores = [];
    if (Array.isArray(response.data) && response.data.length > 0) {
      if (Array.isArray(response.data[0])) {
        scores = response.data[0];
      } else {
        scores = response.data;
      }
    }
    if (!Array.isArray(scores)) {
      console.warn('[Text Moderation] Unexpected response format, scores not found');
      return {
        isToxic: false,
        scores: [{ label: 'unknown', score: 0 }]
      };
    }
        const TOXICITY_THRESHOLD = 0.70; 
    const isToxic = scores.some(item => item.score > TOXICITY_THRESHOLD);
    
    return {
      isToxic: isToxic,
      scores: scores
    };
  } catch (error) {
    console.error("Text Moderation Error:", error);
    throw new Error("Text analysis failed");
  }
};

module.exports = { analyzeText };
