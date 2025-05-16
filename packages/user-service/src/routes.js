const express = require('express');
const axios = require('axios');
const { Kafka } = require('kafkajs');

const router = express.Router();

const kafka = new Kafka({
  clientId: 'user-service',
  brokers: ['kafka:9092']
});
const producer = kafka.producer();
const users = [];
const AI_MODERATOR_URL = 'http://ai-moderator:3003/api/moderation/text';

router.post('/register', (req, res) => {
  const { username } = req.body;
  if (!username) {
    return res.status(400).json({ error: 'Username is required' });
  }
  users.push({ username, content: [] });
  res.status(201).json({ message: 'User registered', username });
});

router.post('/submit-content', async (req, res) => {
  const { username, text } = req.body;
  if (!username || !text) {
    return res.status(400).json({ error: 'Username and text are required' });
  }

  let user = users.find(u => u.username === username);
  if (!user) {
    user = { username, content: [] };
    users.push(user);
    console.log(`[User Service] Auto-registered user: ${username}`);
  }

  try {
    console.log(`[User Service] Sending content from ${username} to AI Moderator`);
    const response = await axios.post(AI_MODERATOR_URL, { 
      text, 
      username
    });
    
    user.content.push({ text, moderationResult: response.data });
    console.log(`[User Service] Stored moderation result for ${username}`);
    
    try {
      await producer.connect();
      console.log(`[User Service] Connected to Kafka producer`);
      
      const message = { 
        content: text, 
        username: username,
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
      
      console.log(`[User Service] Sent message to Kafka topic: content-to-moderate`);
      await producer.disconnect();
    } catch (kafkaError) {
      console.error(`[User Service] Kafka error: ${kafkaError.message}`);
    }
    
    res.json({ message: 'Content submitted for moderation', result: response.data });
  } catch (error) {
    console.error('[User Service] Error submitting content:', error.message);
    if (error.response) {
      console.error('[User Service] Response data:', error.response.data);
      console.error('[User Service] Response status:', error.response.status);
    }
    res.status(500).json({ error: 'Content moderation failed' });
  }

});

module.exports = router;