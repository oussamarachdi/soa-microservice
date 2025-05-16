const { Kafka } = require('kafkajs');
const axios = require('axios');
const HUGGINGFACE_KEYS = require('../config/keys');  // Fix import to match keys.js export



const kafka = new Kafka({
  clientId: 'ai-moderator',
  brokers: ['kafka:9092'],
});
const consumer = kafka.consumer({ groupId: 'ai-moderator-group' });

const runConsumer = async () => {
  try {
    console.log('[AI Moderator] Attempting to connect to Kafka...');
    await consumer.connect();
    console.log('[AI Moderator] Successfully connected to Kafka!');
    
    console.log('[AI Moderator] Subscribing to content-to-moderate topic');
    await consumer.subscribe({ topic: 'content-to-moderate', fromBeginning: true });
    console.log('[AI Moderator] Successfully subscribed to content-to-moderate topic');

    await consumer.run({
      eachMessage: async ({ topic, partition, message }) => {
        try {
          console.log(`[AI Moderator] Received message from topic: ${topic}, partition: ${partition}`);
          console.log(`[AI Moderator] Message key: ${message.key?.toString()}`);
            const messageValue = message.value.toString();
          console.log(`[AI Moderator] Raw message: ${messageValue.substring(0, 100)}...`);
          
          const parsedMessage = JSON.parse(messageValue);
          const { content, type, username, timestamp } = parsedMessage;
          console.log(`[AI Moderator] Processing ${type} content from ${username || 'Anonymous User'} at ${timestamp}`);
          
          let url = type === 'text' ? 'http://ai-moderator:3003/api/moderation/text' : 'http://ai-moderator:3003/api/moderation/image';
          let payload = type === 'text' ? 
            { text: content, username: username || 'Anonymous User' } : 
            { image: content, username: username || 'Anonymous User' };
          
          console.log(`[AI Moderator] Sending moderation request to ${url}`);
          const response = await axios.post(url, payload);
          console.log('[AI Moderator] Moderation result:', JSON.stringify(response.data).substring(0, 100));          // Forward result to Kafka for dashboard-service
          console.log('[AI Moderator] Connecting producer to send results');
          const producer = kafka.producer();
          await producer.connect();
          const moderationData = response.data;
          
          const dashboardMessage = {
            text: content,
            isToxic: moderationData.isToxic || false,
            username: username || moderationData.username || 'Anonymous User',
            scores: moderationData.scores || []
          };
            console.log('[AI Moderator] Sending to dashboard:', JSON.stringify(dashboardMessage, null, 2));
          
          await producer.send({
            topic: 'moderation-results',
            messages: [{ 
              key: type === 'text' ? 'text-result' : 'image-result', 
              value: JSON.stringify(dashboardMessage)
            }],
          });
          console.log('[AI Moderator] Result sent to moderation-results topic');
          
          try {
            console.log('[AI Moderator] Sending result directly to dashboard service via HTTP');
            await axios.post(DASHBOARD_SERVICE_URL, dashboardMessage);
            console.log('[AI Moderator] Successfully sent to dashboard via HTTP');
          } catch (dashboardError) {
            console.error('[AI Moderator] Failed to send directly to dashboard:', dashboardError.message);
          }
          
          await producer.disconnect();
        } catch (error) {
          console.error('[AI Moderator] Error processing message:', error.message);
          if (error.response) {
            console.error('[AI Moderator] Response status:', error.response.status);
            console.error('[AI Moderator] Response data:', error.response.data);
          }
          console.error('[AI Moderator] Error stack:', error.stack);
        }
      },
    });
    
    console.log('[AI Moderator] Kafka consumer is running and waiting for messages');
  } catch (error) {
    console.error('[AI Moderator] Kafka consumer error:', error.message);
    if (error.name === 'KafkaJSNumberOfRetriesExceeded') {
      console.error('[AI Moderator] Failed to connect to Kafka broker. Check if Kafka is running.');
    }
    console.error('[AI Moderator] Error stack:', error.stack);
        console.log('[AI Moderator] Attempting to reconnect in 5 seconds...');
    setTimeout(() => {
      runConsumer().catch(console.error);
    }, 5000);
  }
};

module.exports = { runConsumer };
