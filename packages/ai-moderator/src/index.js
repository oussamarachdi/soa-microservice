const app = require('../app');
const { runConsumer } = require('./KafkaConsumer');
const { createTopics } = require('./KafkaSetup');

const PORT = process.env.PORT || 3003;

app.listen(PORT, () => {
  console.log(`[AI Moderator] Service running on port ${PORT}`);
  
  setTimeout(() => {
    console.log('[AI Moderator] Starting Kafka consumer...');
    runConsumer().catch(err => {
      console.error('[AI Moderator] Failed to start Kafka consumer:', err.message);
    });
  }, 10000); 
});