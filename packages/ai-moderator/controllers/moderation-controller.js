const { analyzeText } = require("../services/text-moderation.js");
const { analyzeImage } = require("../services/image-moderation.js");
const axios = require("axios");

const DASHBOARD_SERVICE_URL = 'http://dashboard-service:3002/api/direct-submit';

const moderateText = async (req, res) => {
  try {
    const { text, username } = req.body;
    if (!text) {
      return res.status(400).json({ error: 'Text content is required' });
    }
    
    console.log(`[AI Moderator] Processing text moderation for user: ${username || 'Anonymous'}`);
    console.log(`[AI Moderator] Text to moderate: "${text}"`);
    
    const result = await analyzeText(text);

    if (!result || typeof result !== 'object') {
      console.error('[AI Moderator] Invalid result format from analyzeText');
      return res.status(500).json({ 
        error: 'Invalid moderation result format',
        isToxic: false,
        scores: [{ label: 'error', score: 0 }],
        username: username || 'Anonymous User'
      });
    }
    
    if (!result.scores || !Array.isArray(result.scores) || result.scores.length === 0) {
      console.warn('[AI Moderator] No scores in moderation result, adding default');
      result.scores = [{ label: 'unknown', score: 0 }];
    }
    
    result.scores = result.scores.map(score => {
      if (!score || typeof score !== 'object') {
        return { label: 'unknown', score: 0 };
      }
      return {
        label: score.label || 'unknown',
        score: typeof score.score === 'number' ? score.score : 0
      };
    });   
    result.username = username || 'Anonymous User';
    console.log('[AI Moderator] Final moderation result:', JSON.stringify(result, null, 2));
    
    try {
      console.log('[AI Moderator] Sending result directly to dashboard service');
      await axios.post(DASHBOARD_SERVICE_URL, result);
      console.log('[AI Moderator] Successfully sent to dashboard');
    } catch (dashboardError) {
      console.error('[AI Moderator] Failed to send to dashboard service:', dashboardError.message);
    }
    
    res.json(result);
  } catch (error) {
    console.error('[AI Moderator] Error in text moderation:', error.message);
    res.status(500).json({ 
      error: error.message,
      isToxic: false,
      scores: [{ label: 'error', score: 0 }],
      username: req.body.username || 'Anonymous User'
    });
  }
};

const moderateImage = async (req, res) => {
  try {
    const result = await analyzeImage(req.file.buffer);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  moderateText,
  moderateImage
};