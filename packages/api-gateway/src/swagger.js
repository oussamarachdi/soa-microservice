const swaggerJSDoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

// Swagger definition
const swaggerDefinition = {
  openapi: '3.0.0',
  info: {
    title: 'Content Moderation API',
    version: '1.0.0',
    description: 'API documentation for Content Moderation Microservices',
    contact: {
      name: 'Development Team'
    },
    servers: [
      {
        url: 'http://localhost:3000',
        description: 'Development server'
      }
    ]
  },
  components: {
    schemas: {
      ModerationResult: {
        type: 'object',
        properties: {
          text: {
            type: 'string',
            description: 'The content that was moderated'
          },
          username: {
            type: 'string',
            description: 'Username of the content creator'
          },
          isToxic: {
            type: 'boolean',
            description: 'Whether the content was flagged as toxic'
          },
          scores: {
            type: 'array',
            description: 'Detailed moderation scores',
            items: {
              type: 'object',
              properties: {
                label: {
                  type: 'string',
                  description: 'Category of moderation'
                },
                score: {
                  type: 'number',
                  description: 'Score in the range of 0-1'
                }
              }
            }
          }
        }
      },
      Error: {
        type: 'object',
        properties: {
          error: {
            type: 'string',
            description: 'Error message'
          },
          details: {
            type: 'string',
            description: 'Additional error details'
          }
        }
      }
    }
  }
};

const options = {
  swaggerDefinition,
  apis: ['./src/routes.js']
};

const swaggerSpec = swaggerJSDoc(options);

const swaggerDocs = (app) => {
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
  
  app.get('/api-docs.json', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(swaggerSpec);
  });

  console.log(`Swagger docs available at http://localhost:3000/api-docs`);
};

module.exports = swaggerDocs;
