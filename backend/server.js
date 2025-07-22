const express = require('express');
const { ApolloServer } = require('apollo-server-express');
const { createServer } = require('http');
const { SubscriptionServer } = require('subscriptions-transport-ws');
const { execute, subscribe } = require('graphql');
const { makeExecutableSchema } = require('@graphql-tools/schema');
const { PubSub } = require('graphql-subscriptions');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { MongoClient } = require('mongodb');
const jwt = require('jsonwebtoken');
const path = require('path');
const fs = require('fs');

// Load environment variables
require('dotenv').config();

// Import GraphQL schema and resolvers
const typeDefs = require('./api/schema');
const resolvers = require('./resolvers');

// Import services
const UserService = require('./services/UserService');
const ProjectService = require('./services/ProjectService');
const DatasetService = require('./services/DatasetService');
const AnalysisService = require('./services/AnalysisService');
const PipelineService = require('./services/PipelineService');

// Import utilities
const logger = require('./utils/logger');
const FileService = require('./utils/fileService');

class PrairieGenomicsServer {
  constructor() {
    this.app = express();
    this.pubsub = new PubSub();
    this.db = null;
    this.services = {};
    this.httpServer = null;
    this.apolloServer = null;
  }

  async initialize() {
    try {
      // Connect to database
      await this.connectDatabase();
      
      // Initialize services
      this.initializeServices();
      
      // Setup Express middleware
      this.setupMiddleware();
      
      // Create GraphQL schema
      const schema = this.createSchema();
      
      // Setup Apollo Server
      await this.setupApolloServer(schema);
      
      // Setup subscription server
      this.setupSubscriptionServer(schema);
      
      logger.info('Server initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize server:', error);
      process.exit(1);
    }
  }

  async connectDatabase() {
    const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/prairie-genomics';
    
    try {
      const client = new MongoClient(uri);
      await client.connect();
      this.db = client.db();
      logger.info(`Connected to MongoDB: ${uri}`);
      
      // Test the connection
      await this.db.admin().ping();
      logger.info('MongoDB connection verified');
      
    } catch (error) {
      logger.error('MongoDB connection failed:', error);
      throw error;
    }
  }

  initializeServices() {
    const fileService = new FileService();
    
    // Initialize all services with dependencies
    this.services = {
      user: new UserService(this.db, logger),
      pipeline: new PipelineService(this.db, logger, null), // Will set user service after creation
      file: fileService
    };

    // Set user service reference in pipeline service
    this.services.pipeline.userService = this.services.user;
    
    // Initialize remaining services with dependencies
    this.services.project = new ProjectService(this.db, logger, this.services.user);
    this.services.dataset = new DatasetService(this.db, logger, this.services.project, this.services.file);
    this.services.analysis = new AnalysisService(
      this.db, 
      logger, 
      this.services.project, 
      this.services.dataset, 
      this.services.pipeline
    );

    // Setup analysis event listeners for real-time updates
    this.services.analysis.on('analysisProgress', (data) => {
      this.pubsub.publish(`ANALYSIS_PROGRESS_${data.analysisId}`, {
        analysisProgress: data
      });
    });

    this.services.analysis.on('analysisCompleted', (data) => {
      this.pubsub.publish('ANALYSIS_COMPLETED', {
        analysisCompleted: data.analysis
      });
    });

    logger.info('Services initialized');
  }

  setupMiddleware() {
    // Security middleware
    this.app.use(helmet({
      contentSecurityPolicy: process.env.NODE_ENV === 'production' ? undefined : false,
      crossOriginEmbedderPolicy: false
    }));

    // CORS
    this.app.use(cors({
      origin: process.env.FRONTEND_URL || 'http://localhost:3000',
      credentials: true
    }));

    // Rate limiting
    const limiter = rateLimit({
      windowMs: parseInt(process.env.RATE_LIMIT_WINDOW) * 60 * 1000 || 15 * 60 * 1000,
      max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
      message: 'Too many requests from this IP'
    });
    this.app.use('/graphql', limiter);

    // Body parsing
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    // Static file serving for uploads
    const uploadsDir = process.env.UPLOAD_PATH || './uploads';
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }
    this.app.use('/uploads', express.static(uploadsDir));

    // Health check endpoint
    this.app.get('/health', (req, res) => {
      res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        version: process.env.APP_VERSION || '1.0.0'
      });
    });

    logger.info('Middleware configured');
  }

  createSchema() {
    return makeExecutableSchema({
      typeDefs,
      resolvers
    });
  }

  async setupApolloServer(schema) {
    this.apolloServer = new ApolloServer({
      schema,
      context: ({ req, connection }) => {
        if (connection) {
          // WebSocket connection (subscriptions)
          return {
            ...connection.context,
            db: this.db,
            services: this.services,
            pubsub: this.pubsub
          };
        } else {
          // HTTP request (queries/mutations)
          return {
            req,
            db: this.db,
            services: this.services,
            pubsub: this.pubsub,
            user: this.getUserFromRequest(req)
          };
        }
      },
      plugins: [
        {
          requestDidStart() {
            return {
              didResolveOperation(requestContext) {
                logger.info('GraphQL Operation:', {
                  operationName: requestContext.request.operationName,
                  query: requestContext.request.query?.substring(0, 200)
                });
              },
              didEncounterErrors(requestContext) {
                requestContext.errors.forEach(error => {
                  logger.error('GraphQL Error:', error);
                });
              }
            };
          }
        }
      ],
      introspection: process.env.ENABLE_INTROSPECTION === 'true',
      playground: process.env.ENABLE_GRAPHQL_PLAYGROUND === 'true'
    });

    await this.apolloServer.start();
    this.apolloServer.applyMiddleware({ 
      app: this.app,
      path: '/graphql',
      cors: false // We handle CORS above
    });

    logger.info('Apollo Server configured');
  }

  setupSubscriptionServer(schema) {
    this.httpServer = createServer(this.app);

    const subscriptionServer = SubscriptionServer.create({
      schema,
      execute,
      subscribe,
      onConnect: async (connectionParams, webSocket, context) => {
        logger.info('WebSocket connection established');
        
        // Authenticate WebSocket connections
        const token = connectionParams.authorization || connectionParams.Authorization;
        let user = null;
        
        if (token) {
          try {
            const decoded = jwt.verify(token.replace('Bearer ', ''), process.env.JWT_SECRET);
            user = await this.services.user.getUserById(decoded.userId);
          } catch (error) {
            logger.warn('WebSocket authentication failed:', error.message);
          }
        }

        return {
          db: this.db,
          services: this.services,
          pubsub: this.pubsub,
          user
        };
      },
      onDisconnect: (webSocket, context) => {
        logger.info('WebSocket connection closed');
      }
    }, {
      server: this.httpServer,
      path: '/graphql'
    });

    // Cleanup on server shutdown
    process.on('SIGTERM', () => {
      subscriptionServer.close();
    });

    logger.info('Subscription server configured');
  }

  getUserFromRequest(req) {
    const token = req.headers.authorization;
    if (!token) return null;

    try {
      const decoded = jwt.verify(token.replace('Bearer ', ''), process.env.JWT_SECRET);
      return decoded;
    } catch (error) {
      logger.warn('Authentication failed:', error.message);
      return null;
    }
  }

  async start() {
    const port = process.env.PORT || 4000;

    this.httpServer.listen(port, () => {
      logger.info(`🚀 Server ready at http://localhost:${port}${this.apolloServer.graphqlPath}`);
      logger.info(`🚀 Subscriptions ready at ws://localhost:${port}${this.apolloServer.graphqlPath}`);
      
      if (process.env.ENABLE_GRAPHQL_PLAYGROUND === 'true') {
        logger.info(`🎮 GraphQL Playground available at http://localhost:${port}/graphql`);
      }
    });
  }

  async shutdown() {
    logger.info('Shutting down server...');
    
    if (this.apolloServer) {
      await this.apolloServer.stop();
    }
    
    if (this.httpServer) {
      this.httpServer.close();
    }
    
    if (this.db) {
      await this.db.client.close();
    }
    
    logger.info('Server shutdown complete');
  }
}

// Initialize and start server
const server = new PrairieGenomicsServer();

async function startServer() {
  try {
    await server.initialize();
    await server.start();
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGINT', async () => {
  logger.info('Received SIGINT, shutting down gracefully');
  await server.shutdown();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  logger.info('Received SIGTERM, shutting down gracefully');
  await server.shutdown();
  process.exit(0);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Start the server
if (require.main === module) {
  startServer();
}

module.exports = server;