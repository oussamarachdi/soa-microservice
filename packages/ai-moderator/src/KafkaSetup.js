// Create required Kafka topics on startup
const { Kafka } = require('kafkajs');

const kafka = new Kafka({
  clientId: 'topic-creator',
  brokers: ['kafka:9092'],
});

const admin = kafka.admin();

const topics = [
  {
    topic: 'content-to-moderate',
    numPartitions: 1,
    replicationFactor: 1,
  },
  {
    topic: 'moderation-results', 
    numPartitions: 1,
    replicationFactor: 1,
  }
];

const createTopics = async () => {
  try {
    console.log('[Kafka Setup] Connecting to Kafka admin...');
    await admin.connect();
    console.log('[Kafka Setup] Connected to Kafka admin');
    
    console.log('[Kafka Setup] Creating topics if they do not exist...');
    await admin.createTopics({
      validateOnly: false,
      waitForLeaders: true,
      timeout: 10000,
      topics,
    });
    console.log('[Kafka Setup] Topics created or already exist');
    
    const existingTopics = await admin.listTopics();
    console.log('[Kafka Setup] Existing topics:', existingTopics);
    
    await admin.disconnect();
    console.log('[Kafka Setup] Done');
  } catch (error) {
    console.error('[Kafka Setup] Error creating topics:', error.message);
    
    if (error.name === 'KafkaJSNumberOfRetriesExceeded') {
      console.error('[Kafka Setup] Failed to connect to Kafka broker. Check if Kafka is running.');
      console.error('[Kafka Setup] Will exit and let the application try again on next startup');
    } else if (error.name === 'KafkaJSProtocolError') {
      console.error('[Kafka Setup] Protocol error. Topics may already exist. Continuing...');
    } else {
      console.error('[Kafka Setup] Error stack:', error.stack);
    }
  } finally {
    try {
      await admin.disconnect();
    } catch (e) {
    }
  }
};

createTopics().catch(console.error);

module.exports = { createTopics };
