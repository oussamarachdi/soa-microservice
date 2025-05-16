# Content Moderation Pipeline

A microservices-based real-time content moderation system for text, built with Node.js, Kafka, and Docker.

## 📋 Project Overview

This project is a comprehensive content moderation pipeline designed to analyze and filter potentially harmful content in real-time. It utilizes a microservices architecture where each component has a specific role in the moderation process.

### Key Features

- **Real-time moderation** of text content
- **API Gateway** for unified access to all services
- **User management** for authentication and authorization
- **Dashboard** with GraphQL for visualization of moderation results
- **Kafka-based messaging** for reliable communication between services
- **Containerized deployment** with Docker

## 🏗️ Architecture

The system is composed of several interconnected microservices:

- **API Gateway**: Entry point for client applications, routes requests to appropriate services
- **User Service**: Handles user management and authentication
- **AI Moderator**: Performs content analysis and toxicity detection
- **Dashboard Service**: Provides GraphQL API for monitoring and visualizing moderation results

### Communication Flow

1. Client sends content to the API Gateway
2. API Gateway forwards the content to the AI Moderator service
3. AI Moderator analyzes the content and publishes results to Kafka
4. Dashboard Service consumes moderation results from Kafka for visualization
5. User Service manages authentication and access to moderation features

## 🚀 Getting Started

### Prerequisites

- [Docker](https://www.docker.com/get-started) and Docker Compose
- [Node.js](https://nodejs.org/) (v14 or later)
- [npm](https://www.npmjs.com/) (v6 or later)

### Installation

1. Clone the repository:
   ```
   git clone https://github.com/yourusername/content-moderation-pipeline.git
   cd content-moderation-pipeline
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Start the services using Docker Compose:
   ```
   docker-compose up --build
   ```

### Service Endpoints

- **API Gateway**: http://localhost:3000
- **User Service**: http://localhost:3001
- **Dashboard Service (GraphQL)**: http://localhost:3002/graphql
- **AI Moderator Service**: http://localhost:3003

## 🔧 Services

### API Gateway

The API Gateway serves as the entry point for all client requests and routes them to the appropriate services. It also handles gRPC communication.

```
# Key Dependencies
- Express.js
- grpc-js
- Kafka.js
```

### User Service

Manages user accounts, authentication, and authorization.

```
# Key Dependencies
- Express.js
```

### Dashboard Service

Provides a GraphQL API for retrieving and visualizing moderation results.

```
# Key Dependencies
- Express.js
- Apollo Server (GraphQL)
- Kafka.js for consuming moderation results
```

### AI Moderator Service

Analyzes content for toxicity and inappropriate material, publishing results to Kafka.

```
# Key Dependencies
- Express.js
- Kafka.js for producing moderation results
- Moderation algorithms and APIs
```

## 📊 Data Flow

1. Content submission:
   - Text is submitted through the API Gateway

2. Moderation process:
   - AI Moderator analyzes content for toxicity
   - Each piece of content receives scores for different categories of harmful content
   - Results include a binary "toxic" flag and detailed category scores

3. Result storage and visualization:
   - Moderation results are published to Kafka
   - Dashboard Service consumes these results for visualization
   - Results can be queried via GraphQL based on various criteria

## 🛠️ Development

### Project Structure

```
content-moderation-pipeline/
├── packages/
│   ├── api-gateway/
│   ├── user-service/
│   ├── dashboard-service/
│   ├── ai-moderator/
│   └── shared/
├── docker-compose.yml
└── package.json
```

### Running Services Individually

You can run each service individually during development:

```
# API Gateway
npm run start:api-gateway

# User Service
npm run start:user-service

# Dashboard Service
npm run start:dashboard-service

# AI Moderator
npm run start:ai-moderator
```

## 📝 GraphQL Schema

The Dashboard Service exposes a GraphQL API with the following schema:

```graphql
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
```

## 🔌 Kafka Topics

The system uses the following Kafka topics:

- `moderation-results`: Contains the results of content moderation analysis

## 🐳 Docker Configuration

The project includes a complete Docker setup for easy deployment:

- Each service has its own Dockerfile
- docker-compose.yml coordinates all services
- Includes Kafka and Zookeeper containers

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.
