const express = require('express');
const { ApolloServer } = require('apollo-server-express');
const { buildSchema } = require('graphql');
const { Kafka } = require('kafkajs');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
app.use(cors());
app.use(express.json());

let moderationResults = [];

async function setupKafkaConsumer() {
  let attempts = 0;
  const maxAttempts = 10;
  const retryInterval = 5000;

  while (attempts < maxAttempts) {
    try {
      const kafka = new Kafka({ 
        clientId: 'dashboard-service', 
        brokers: ['kafka:9092'],
        retry: {
          initialRetryTime: 1000,
          retries: 10
        }
      });
      
      const consumer = kafka.consumer({ groupId: 'dashboard-group' });
      
      await consumer.connect();
      console.log('Connected to Kafka');
      
      await consumer.subscribe({ topic: 'moderation-results', fromBeginning: true });
      console.log('Subscribed to moderation-results topic');
        await consumer.run({
      eachMessage: async ({ message }) => {        try {
          const data = JSON.parse(message.value.toString());
          console.log('Received moderation result:', JSON.stringify(data, null, 2));
          
          const normalizedData = {
            text: data.text || 'Unknown content',
            isToxic: data.isToxic || false,
            username: data.username || 'Anonymous User',
            scores: Array.isArray(data.scores) ? data.scores : []
          };
          
          console.log('Normalized data for dashboard:', JSON.stringify(normalizedData, null, 2));
          moderationResults.push(normalizedData);
          
          if (moderationResults.length > 100) {
            moderationResults = moderationResults.slice(-100);
          }
        } catch (err) {
          console.error('Error processing message:', err);
        }
      },
    });
    
    console.log('Kafka consumer set up successfully');
    return consumer;
    } catch (error) {
      console.error(`Error setting up Kafka consumer (attempt ${attempts + 1}/${maxAttempts}):`, error);
      attempts++;
        if (attempts >= maxAttempts) {
        console.error('Maximum Kafka connection attempts reached.');
        return null;
      }
      
      console.log(`Waiting ${retryInterval/1000} seconds before retrying...`);
      await new Promise(resolve => setTimeout(resolve, retryInterval));
    }
  }
}

const schema = buildSchema(`
  type ModerationResult {
    text: String
    username: String
    isToxic: Boolean
    scores: [Score]
  }
  
  type Score {
    label: String
    score: Float
  }
  
  type Query {
    moderationResults: [ModerationResult]
    moderationResultsCount: Int
    toxicContentCount: Int
    moderationResultsByUser(username: String!): [ModerationResult]
    latestSubmissions(count: Int): [ModerationResult]
  }
`);

const resolvers = {
  Query: {
    moderationResults: () => {
      console.log('GraphQL query for moderationResults, returning:', 
        JSON.stringify(moderationResults, null, 2));
      return moderationResults;
    },
    moderationResultsCount: () => {
      return moderationResults.length;
    },
    toxicContentCount: () => {
      return moderationResults.filter(result => result.isToxic).length;
    },
    moderationResultsByUser: (args) => {
      const { username } = args;
      return moderationResults.filter(result => result.username === username);
    },
    latestSubmissions: (args) => {
      const count = args.count || 10;
      return moderationResults.slice(-count).reverse();
    }
  }
};

const server = new ApolloServer({ 
  typeDefs: schema,
  resolvers,
  introspection: true,
  playground: true
});


async function startServer() {
  await server.start();
  server.applyMiddleware({ app, path: '/graphql' });
  app.get('/', (req, res) => {
    res.json({ 
      status: 'Dashboard Service is running', 
      endpoints: ['/graphql'],
      dataCount: moderationResults.length
    });
  });
  
  app.listen(3002, () => {
    console.log(`Dashboard Service (GraphQL) running on port 3002, GraphQL at ${server.graphqlPath}`);
      setupKafkaConsumer().catch(err => {
      console.error('Failed to set up Kafka consumer:', err);
    });
  });
}

startServer().catch(console.error);