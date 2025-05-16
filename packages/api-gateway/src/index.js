const express = require('express');
const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const { Kafka } = require('kafkajs');
const routes = require('./routes');
const swaggerDocs = require('./swagger');
const { createTopics } = require('./kafkaSetup');

const app = express();
app.use(express.json());

app.use('/api', routes);


swaggerDocs(app);

app.get('/routes', (req, res) => {
  const availableRoutes = [];
  app._router.stack.forEach((middleware) => {
    if (middleware.route) {
      // routes registered directly on the app
      availableRoutes.push({
        path: middleware.route.path,
        methods: Object.keys(middleware.route.methods)
      });
    } else if (middleware.name === 'router') {
      // router middleware
      middleware.handle.stack.forEach((handler) => {
        if (handler.route) {
          const path = handler.route.path;
          availableRoutes.push({
            path: '/api' + path,
            methods: Object.keys(handler.route.methods)
          });
        }
      });
    }
  });
  res.json(availableRoutes);
});

const kafka = new Kafka({
  clientId: 'api-gateway',
  brokers: ['kafka:9092'],
});
const producer = kafka.producer();

const protoPath = './shared/moderation.proto';
const packageDefinition = protoLoader.loadSync(protoPath, {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true,
});
const protoDescriptor = grpc.loadPackageDefinition(packageDefinition);
const moderationProto = protoDescriptor.moderationPackage;

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`API Gateway REST server running on port ${PORT}`);
  
  createTopics().then(success => {
    if (success) {
      console.log('[API Gateway] Kafka initialized successfully');
    } else {
      console.warn('[API Gateway] Kafka initialization had some issues, but service will continue');
    }
  }).catch(err => {
    console.error('[API Gateway] Failed to initialize Kafka:', err.message);
    console.warn('[API Gateway] Service will continue without guaranteed Kafka connectivity');
  });
});

const grpcServer = new grpc.Server();
grpcServer.addService(moderationProto.ModerationService.service, {
  ModerateText: (call, callback) => {
    callback(null, { isToxic: false, scores: [] });
  },
});
grpcServer.bindAsync(`0.0.0.0:50051`, grpc.ServerCredentials.createInsecure(), () => {
  console.log(`gRPC server running on port 50051`);
  grpcServer.start();
});