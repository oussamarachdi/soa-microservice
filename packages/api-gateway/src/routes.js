const express = require('express');
const axios = require('axios');
const { Kafka } = require('kafkajs');

const router = express.Router();
const kafka = new Kafka({
  clientId: 'api-gateway',
  brokers: ['kafka:9092'],
  retry: {
    initialRetryTime: 300, // 300ms
    retries: 5 // Retry 5 times
  }
});
const producer = kafka.producer();

const AI_MODERATOR_TEXT_URL = 'http://ai-moderator:3003/api/moderation/text';
const AI_MODERATOR_IMAGE_URL = 'http://ai-moderator:3003/api/moderation/image';
const USER_SERVICE_URL = 'http://user-service:3001/api/users';
const DASHBOARD_SERVICE_URL = 'http://dashboard-service:3002/graphql';

// Add health check route
/**
 * @swagger
 * /api/health:
 *   get:
 *     summary: Check API Gateway health status
 *     description: Returns the operational status of the API Gateway and its connected services
 *     tags:
 *       - Health
 *     responses:
 *       200:
 *         description: API Gateway is operational
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: API Gateway is operational
 *                 services:
 *                   type: object
 */
router.get('/health', (req, res) => {
  res.json({ status: 'API Gateway is operational', services: {
    'ai-moderator': AI_MODERATOR_TEXT_URL,
    'user-service': USER_SERVICE_URL,
    'dashboard-service': DASHBOARD_SERVICE_URL
  }});
});

/**
 * @swagger
 * /api/moderate/text:
 *   post:
 *     summary: Moderate text content
 *     description: Analyzes text for toxic or harmful content
 *     tags:
 *       - Moderation
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - text
 *             properties:
 *               text:
 *                 type: string
 *                 description: The text content to moderate
 *                 example: This is a sample text for moderation
 *     responses:
 *       200:
 *         description: Text moderation results
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ModerationResult'
 *       400:
 *         description: Missing required parameters
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/moderate/text', async (req, res) => {
  const { text, username } = req.body;
  
  if (!text) {
    return res.status(400).json({ error: 'Text content is required' });
  }

  const userIdentifier = username || 'Anonymous User';

  try {
    console.log('[API Gateway] Text moderation request received:', text.substring(0, 30) + '...');
    console.log('[API Gateway] Username:', userIdentifier);
    
    console.log('[API Gateway] Sending request to AI Moderator service');
    const response = await axios.post(AI_MODERATOR_TEXT_URL, { 
      text, 
      username: userIdentifier 
    });
    
    const moderationResult = response.data;
    console.log('[API Gateway] Received moderation result:', JSON.stringify(moderationResult).substring(0, 100) + '...');

    console.log('[API Gateway] Connecting to Kafka producer');
    await producer.connect();
    
    console.log('[API Gateway] Sending message to content-to-moderate topic');
    const message = { 
      content: text, 
      username: userIdentifier,
      type: 'text', 
      timestamp: new Date().toISOString() 
    };
    
    await producer.send({
      topic: 'content-to-moderate',
      messages: [{ 
        key: 'text-content', 
        value: JSON.stringify(message)
      }],
    });
    
    console.log('[API Gateway] Message sent to Kafka');
    await producer.disconnect();

    res.json(moderationResult);
  } catch (error) {
    console.error('[API Gateway] Error moderating text:', error.message);
    if (error.response) {
      console.error('[API Gateway] Response status:', error.response.status);
      console.error('[API Gateway] Response data:', JSON.stringify(error.response.data));
    }
    res.status(500).json({ error: 'Text moderation failed', details: error.message });
  }
});

/**
 * @swagger
 * /api/moderate/image:
 *   post:
 *     summary: Moderate image content
 *     description: Analyzes images for inappropriate or harmful content
 *     tags:
 *       - Moderation
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - imageBuffer
 *             properties:
 *               imageBuffer:
 *                 type: string
 *                 format: byte
 *                 description: Base64 encoded image data
 *     responses:
 *       200:
 *         description: Image moderation results
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ModerationResult'
 *       400:
 *         description: Missing required parameters
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/moderate/image', async (req, res) => {
  const { imageBuffer } = req.body; 
  if (!imageBuffer) {
    return res.status(400).json({ error: 'Image buffer is required' });
  }

  try {
    const response = await axios.post(AI_MODERATOR_IMAGE_URL, { image: imageBuffer }, {
      headers: { 'Content-Type': 'application/json' },
    });
    const moderationResult = response.data;

    await producer.connect();
    await producer.send({
      topic: 'content-to-moderate',
      messages: [
        { 
          key: 'image-content', 
          value: JSON.stringify({ 
            content: imageBuffer, 
            type: 'image', 
            timestamp: new Date().toISOString() 
          })
        }
      ],
    });
    await producer.disconnect();

    res.json(moderationResult);
  } catch (error) {
    console.error('Error moderating image:', error.message);
    res.status(500).json({ error: 'Image moderation failed' });  }
});

/**
 * @swagger
 * /api/users/register:
 *   post:
 *     summary: Register a new user
 *     description: Create a new user account in the system
 *     tags:
 *       - Users
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - username
 *             properties:
 *               username:
 *                 type: string
 *                 description: User's unique username
 *                 example: john_doe
 *     responses:
 *       201:
 *         description: User successfully registered
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   description: Success message
 *                   example: User registered
 *                 username:
 *                   type: string
 *                   description: User's username
 *                   example: john_doe
 *       400:
 *         description: Invalid request parameters
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/users/register', async (req, res) => {
  try {
    const response = await axios.post(`${USER_SERVICE_URL}/register`, req.body);
    res.status(response.status).json(response.data);
  } catch (error) {
    console.error('Error registering user:', error.message);
    res.status(error.response?.status || 500).json({ error: 'User registration failed' });
  }
});

/**
 * @swagger
 * /api/users/submit-content:
 *   post:
 *     summary: Submit content for moderation
 *     description: Users can submit text content for moderation
 *     tags:
 *       - Users
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - username
 *               - text
 *             properties:
 *               username:
 *                 type: string
 *                 description: Username of the submitter
 *                 example: "john_doe"
 *               text:
 *                 type: string
 *                 description: Text content to be moderated
 *                 example: "This is my submission text"
 *     responses:
 *       200:
 *         description: Content successfully submitted
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   description: Success message
 *                   example: "Content submitted for moderation"
 *                 result:
 *                   type: object
 *                   description: Moderation result
 *       400:
 *         description: Invalid request parameters
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: User not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/users/submit-content', async (req, res) => {
  try {
    console.log('[API Gateway] Submitting content to User Service:', JSON.stringify(req.body).substring(0, 100));
    
    // Make sure we have the required fields
    if (!req.body.username || !req.body.text) {
      return res.status(400).json({ 
        error: 'Bad request', 
        message: 'Both username and text are required' 
      });
    }
    
    const response = await axios.post(`${USER_SERVICE_URL}/submit-content`, req.body);
    console.log('[API Gateway] Response from User Service:', response.status);
    res.status(response.status).json(response.data);
  } catch (error) {
    console.error('[API Gateway] Error submitting content:', error.message);
    if (error.response) {
      console.error('[API Gateway] Response status:', error.response.status);
      console.error('[API Gateway] Response data:', JSON.stringify(error.response.data));
    }
    res.status(error.response?.status || 500).json({ error: 'Content submission failed', message: error.response.data });
  }
});

/**
 * @swagger
 * /api/dashboard/graphql:
 *   post:
 *     summary: GraphQL interface for the Dashboard service
 *     description: Execute GraphQL queries to fetch moderation results and statistics
 *     tags:
 *       - Dashboard
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - query
 *             properties:
 *               query:
 *                 type: string
 *                 description: GraphQL query
 *                 example: "{ moderationResults { text username isToxic scores { label score } } moderationResultsCount toxicContentCount }"
 *     responses:
 *       200:
 *         description: GraphQL query results
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *       400:
 *         description: Invalid GraphQL query
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/dashboard/graphql', async (req, res) => {
  try {
    console.log('Forwarding GraphQL query to dashboard service:', req.body);
    
    let queryBody = req.body;
    
    if (typeof queryBody === 'object' && queryBody.query) {
    } else if (typeof queryBody === 'string') {
      try {
        queryBody = JSON.parse(queryBody);
      } catch (e) {
        queryBody = { query: queryBody };
      }
    } else {
      queryBody = {
        query: "{ moderationResults { text username isToxic scores { label score } } }" 
      };
    }
    
    console.log('Formatted query:', queryBody);
    
    const response = await axios.post(DASHBOARD_SERVICE_URL, queryBody, {
      headers: { 'Content-Type': 'application/json' }
    });
    res.json(response.data);
  } catch (error) {
    console.error('Error accessing dashboard GraphQL:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
    res.status(error.response?.status || 500).json({ 
      error: 'Dashboard GraphQL service access failed',
      details: error.message
    });
  }
});

module.exports = router;