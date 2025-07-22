const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { UserInputError, AuthenticationError } = require('apollo-server-express');

class UserService {
  constructor(db, logger) {
    this.db = db;
    this.logger = logger;
  }

  async createUser(userData) {
    const { email, name, password, role = 'RESEARCHER', organizationId } = userData;

    // Check if user already exists
    const existingUser = await this.db.collection('users').findOne({ email });
    if (existingUser) {
      throw new UserInputError('User with this email already exists');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create user document
    const user = {
      email,
      name,
      password: hashedPassword,
      role,
      organizationId: organizationId || null,
      avatar: null,
      preferences: {
        theme: 'LIGHT',
        notifications: {
          email: true,
          browser: true,
          analysisComplete: true,
          collaborationUpdates: true
        },
        analysisDefaults: {
          pValueThreshold: 0.05,
          foldChangeThreshold: 1.5,
          multipleTestingCorrection: 'FDR_BH'
        }
      },
      createdAt: new Date(),
      lastLogin: null
    };

    const result = await this.db.collection('users').insertOne(user);
    
    this.logger.info('User created', { userId: result.insertedId, email });
    
    // Remove password from response
    const { password: _, ...userWithoutPassword } = user;
    return { ...userWithoutPassword, id: result.insertedId };
  }

  async authenticateUser(email, password) {
    const user = await this.db.collection('users').findOne({ email });
    if (!user) {
      throw new AuthenticationError('Invalid email or password');
    }

    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      throw new AuthenticationError('Invalid email or password');
    }

    // Update last login
    await this.db.collection('users').updateOne(
      { _id: user._id },
      { $set: { lastLogin: new Date() } }
    );

    // Generate JWT token
    const token = jwt.sign(
      { userId: user._id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    this.logger.info('User authenticated', { userId: user._id, email });
    
    const { password: _, ...userWithoutPassword } = user;
    return {
      user: { ...userWithoutPassword, id: user._id },
      token
    };
  }

  async getUserById(userId) {
    const user = await this.db.collection('users').findOne({ _id: userId });
    if (!user) {
      throw new UserInputError('User not found');
    }

    const { password: _, ...userWithoutPassword } = user;
    return { ...userWithoutPassword, id: user._id };
  }

  async updateUserProfile(userId, updates) {
    const allowedUpdates = ['name', 'avatar'];
    const filteredUpdates = {};
    
    for (const key of allowedUpdates) {
      if (updates[key] !== undefined) {
        filteredUpdates[key] = updates[key];
      }
    }

    if (Object.keys(filteredUpdates).length === 0) {
      throw new UserInputError('No valid fields to update');
    }

    const result = await this.db.collection('users').findOneAndUpdate(
      { _id: userId },
      { $set: { ...filteredUpdates, updatedAt: new Date() } },
      { returnDocument: 'after' }
    );

    if (!result.value) {
      throw new UserInputError('User not found');
    }

    this.logger.info('User profile updated', { userId, updates: Object.keys(filteredUpdates) });
    
    const { password: _, ...userWithoutPassword } = result.value;
    return { ...userWithoutPassword, id: result.value._id };
  }

  async updateUserPreferences(userId, preferences) {
    const user = await this.getUserById(userId);
    
    const updatedPreferences = {
      ...user.preferences,
      ...preferences
    };

    const result = await this.db.collection('users').findOneAndUpdate(
      { _id: userId },
      { $set: { preferences: updatedPreferences, updatedAt: new Date() } },
      { returnDocument: 'after' }
    );

    this.logger.info('User preferences updated', { userId });
    
    return result.value.preferences;
  }

  async searchUsers(query, filters = {}) {
    const searchQuery = {};
    
    if (query) {
      searchQuery.$or = [
        { name: { $regex: query, $options: 'i' } },
        { email: { $regex: query, $options: 'i' } }
      ];
    }

    if (filters.role) {
      searchQuery.role = filters.role;
    }

    if (filters.organizationId) {
      searchQuery.organizationId = filters.organizationId;
    }

    const users = await this.db.collection('users')
      .find(searchQuery, { projection: { password: 0 } })
      .limit(filters.limit || 20)
      .skip(filters.offset || 0)
      .toArray();

    return users.map(user => ({ ...user, id: user._id }));
  }

  async getUserProjects(userId) {
    // Get projects where user is owner or collaborator
    const projects = await this.db.collection('projects').find({
      $or: [
        { ownerId: userId },
        { 'collaborators.userId': userId }
      ]
    }).toArray();

    return projects.map(project => ({ ...project, id: project._id }));
  }

  async getUsageStats(userId) {
    const pipeline = [
      { $match: { ownerId: userId } },
      { $lookup: {
          from: 'datasets',
          localField: '_id',
          foreignField: 'projectId',
          as: 'datasets'
      }},
      { $lookup: {
          from: 'analyses',
          localField: '_id',
          foreignField: 'projectId',
          as: 'analyses'
      }},
      { $group: {
          _id: null,
          totalProjects: { $sum: 1 },
          totalDatasets: { $sum: { $size: '$datasets' } },
          totalAnalyses: { $sum: { $size: '$analyses' } },
          storageUsed: { $sum: { $sum: '$datasets.size' } }
      }}
    ];

    const stats = await this.db.collection('projects').aggregate(pipeline).toArray();
    
    if (stats.length === 0) {
      return {
        storageUsed: 0,
        computeHours: 0,
        analysesRun: 0,
        monthlyUsage: {}
      };
    }

    // Get compute hours from completed analyses
    const computeStats = await this.db.collection('analyses').aggregate([
      { $match: { 
          ownerId: userId, 
          status: 'COMPLETED',
          startedAt: { $exists: true },
          completedAt: { $exists: true }
      }},
      { $project: {
          duration: { $subtract: ['$completedAt', '$startedAt'] }
      }},
      { $group: {
          _id: null,
          totalDuration: { $sum: '$duration' }
      }}
    ]).toArray();

    const computeHours = computeStats.length > 0 
      ? computeStats[0].totalDuration / (1000 * 60 * 60) 
      : 0;

    return {
      storageUsed: stats[0].storageUsed || 0,
      computeHours: Math.round(computeHours * 100) / 100,
      analysesRun: stats[0].totalAnalyses || 0,
      monthlyUsage: {} // TODO: Implement monthly breakdown
    };
  }

  async deleteUser(userId) {
    // Check if user has projects
    const userProjects = await this.getUserProjects(userId);
    if (userProjects.length > 0) {
      throw new UserInputError('Cannot delete user with existing projects');
    }

    const result = await this.db.collection('users').deleteOne({ _id: userId });
    
    if (result.deletedCount === 0) {
      throw new UserInputError('User not found');
    }

    this.logger.info('User deleted', { userId });
    
    return true;
  }
}

module.exports = UserService;