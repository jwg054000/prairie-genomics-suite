const { GraphQLScalarType } = require('graphql');
const { Kind } = require('graphql/language');
// const { GraphQLUpload } = require('graphql-upload'); // Temporarily disabled due to version compatibility

// Import service-specific resolvers
const userResolvers = require('./userResolvers');
const projectResolvers = require('./projectResolvers');
const datasetResolvers = require('./datasetResolvers');
const analysisResolvers = require('./analysisResolvers');
const pipelineResolvers = require('./pipelineResolvers');
const visualizationResolvers = require('./visualizationResolvers');

// Custom scalar resolvers
const scalarResolvers = {
  DateTime: new GraphQLScalarType({
    name: 'DateTime',
    description: 'Date and time as ISO string',
    serialize: (value) => {
      if (value instanceof Date) {
        return value.toISOString();
      }
      if (typeof value === 'string') {
        return new Date(value).toISOString();
      }
      throw new Error('DateTime must be a Date object or ISO string');
    },
    parseValue: (value) => {
      if (typeof value === 'string') {
        return new Date(value);
      }
      throw new Error('DateTime must be provided as a string');
    },
    parseLiteral: (ast) => {
      if (ast.kind === Kind.STRING) {
        return new Date(ast.value);
      }
      throw new Error('DateTime must be provided as a string');
    }
  }),

  JSON: new GraphQLScalarType({
    name: 'JSON',
    description: 'JSON object',
    serialize: (value) => value,
    parseValue: (value) => value,
    parseLiteral: (ast) => {
      switch (ast.kind) {
        case Kind.STRING:
        case Kind.BOOLEAN:
          return ast.value;
        case Kind.INT:
        case Kind.FLOAT:
          return parseFloat(ast.value);
        case Kind.OBJECT:
          return parseObject(ast);
        case Kind.LIST:
          return ast.values.map(parseLiteral);
        default:
          return null;
      }
    }
  }),

  // Upload: GraphQLUpload // Temporarily disabled due to version compatibility
};

// Helper function for parsing GraphQL AST objects
function parseObject(ast) {
  const value = Object.create(null);
  ast.fields.forEach((field) => {
    value[field.name.value] = parseLiteral(field.value);
  });
  return value;
}

function parseLiteral(ast) {
  switch (ast.kind) {
    case Kind.STRING:
    case Kind.BOOLEAN:
      return ast.value;
    case Kind.INT:
    case Kind.FLOAT:
      return parseFloat(ast.value);
    case Kind.OBJECT:
      return parseObject(ast);
    case Kind.LIST:
      return ast.values.map(parseLiteral);
    default:
      return null;
  }
}

// Root resolvers that delegate to service-specific resolvers
const rootResolvers = {
  Query: {
    // User queries
    ...userResolvers.Query,
    
    // Project queries
    ...projectResolvers.Query,
    
    // Dataset queries
    ...datasetResolvers.Query,
    
    // Analysis queries
    ...analysisResolvers.Query,
    
    // Pipeline queries
    ...pipelineResolvers.Query,
    
    // Visualization queries
    ...visualizationResolvers.Query,

    // System queries
    systemStatus: async (parent, args, context) => {
      // In real implementation, would check actual system status
      const queueLength = await context.services.analysis.db.collection('analyses').countDocuments({ 
        status: { $in: ['QUEUED', 'RUNNING'] } 
      });

      return {
        status: 'operational',
        version: process.env.APP_VERSION || '1.0.0',
        queueLength,
        averageWaitTime: Math.max(0, queueLength * 120), // Rough estimate: 2 minutes per queued job
        uptime: process.uptime(),
        maintenanceWindow: null
      };
    },

    usage: async (parent, args, context) => {
      const { userId } = context.user;
      return await context.services.user.getUsageStats(userId);
    },

    billing: async (parent, args, context) => {
      const { userId } = context.user;
      const user = await context.services.user.getUserById(userId);
      
      if (!user.organizationId) {
        return null;
      }

      // Get organization billing info
      const org = await context.db.collection('organizations').findOne({ 
        _id: user.organizationId 
      });

      return org?.billing || null;
    }
  },

  Mutation: {
    // User mutations
    ...userResolvers.Mutation,
    
    // Project mutations
    ...projectResolvers.Mutation,
    
    // Dataset mutations
    ...datasetResolvers.Mutation,
    
    // Analysis mutations
    ...analysisResolvers.Mutation,
    
    // Pipeline mutations
    ...pipelineResolvers.Mutation,
    
    // Visualization mutations
    ...visualizationResolvers.Mutation
  },

  Subscription: {
    // Analysis subscriptions
    ...analysisResolvers.Subscription,
    
    // Project subscriptions
    ...projectResolvers.Subscription,

    // System notifications
    systemNotification: {
      subscribe: async (parent, args, context) => {
        const { userId } = args;
        
        if (context.user.userId !== userId && context.user.role !== 'ADMIN') {
          throw new ForbiddenError('Cannot subscribe to another user\'s notifications');
        }

        return context.pubsub.asyncIterator(`SYSTEM_NOTIFICATION_${userId}`);
      }
    },

    maintenanceAlert: {
      subscribe: (parent, args, context) => {
        return context.pubsub.asyncIterator('MAINTENANCE_ALERT');
      }
    }
  },

  // Type resolvers for complex types
  User: userResolvers.User,
  Project: projectResolvers.Project,
  Dataset: datasetResolvers.Dataset,
  Analysis: analysisResolvers.Analysis,
  AnalysisPipeline: pipelineResolvers.AnalysisPipeline,
  Visualization: visualizationResolvers.Visualization
};

// Combine all resolvers
const resolvers = {
  ...scalarResolvers,
  ...rootResolvers
};

module.exports = resolvers;