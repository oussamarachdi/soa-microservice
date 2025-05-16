const { Kafka } = require('kafkajs');

const kafka = new Kafka({
  clientId: 'api-gateway-setup',
  brokers: ['kafka:9092'],
  retry: {
    initialRetryTime: 300,
    retries: 5 
  }
});

const admin = kafka.admin();
const producer = kafka.producer();

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
    console.log('[API Gateway] Connecting to Kafka admin...');
    await admin.connect();
    console.log('[API Gateway] Connected to Kafka admin');
    
    console.log('[API Gateway] Creating topics if they do not exist...');
    await admin.createTopics({
      validateOnly: false,
      waitForLeaders: true,
      timeout: 10000,
      topics,
    });
    console.log('[API Gateway] Topics created or already exist');
    
    const existingTopics = await admin.listTopics();
    console.log('[API Gateway] Existing topics:', existingTopics);
    
    console.log('[API Gateway] Testing producer connection...');
    await producer.connect();
    console.log('[API Gateway] Producer connected successfully');
    await producer.disconnect();
    console.log('[API Gateway] Producer disconnected');
    
    await admin.disconnect();
    console.log('[API Gateway] Kafka setup complete');
    return true;
  } catch (error) {
    console.error('[API Gateway] Error in Kafka setup:', error.message);
    
    if (error.name === 'KafkaJSNumberOfRetriesExceeded') {
      console.error('[API Gateway] Failed to connect to Kafka broker. Check if Kafka is running.');
    } else if (error.name === 'KafkaJSProtocolError') {
      console.error('[API Gateway] Protocol error. Topics may already exist. Continuing...');
      return true;
    } else {
      console.error('[API Gateway] Error stack:', error.stack);
    }
    return false;
  } finally {
    try {
      await admin.disconnect();
    } catch (e) {
    }
  }
};

module.exports = { createTopics };
