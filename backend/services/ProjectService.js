const { UserInputError, ForbiddenError } = require('apollo-server-express');
const { ObjectId } = require('mongodb');

class ProjectService {
  constructor(db, logger, userService) {
    this.db = db;
    this.logger = logger;
    this.userService = userService;
  }

  async createProject(userId, projectData) {
    const { name, description, tags = [], isPublic = false } = projectData;

    // Validate user exists
    await this.userService.getUserById(userId);

    const project = {
      name,
      description,
      ownerId: userId,
      collaborators: [],
      sharing: {
        isPublic,
        shareUrl: null,
        allowedDomains: [],
        expiresAt: null
      },
      tags,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const result = await this.db.collection('projects').insertOne(project);
    
    this.logger.info('Project created', { projectId: result.insertedId, userId, name });
    
    return { ...project, id: result.insertedId };
  }

  async getProjectById(projectId, userId) {
    const project = await this.db.collection('projects').findOne({ _id: new ObjectId(projectId) });
    
    if (!project) {
      throw new UserInputError('Project not found');
    }

    // Check access permissions
    if (!this.canUserAccessProject(project, userId)) {
      throw new ForbiddenError('Access denied to this project');
    }

    // Populate owner and collaborators
    const owner = await this.userService.getUserById(project.ownerId);
    const collaborators = await this.getProjectCollaborators(projectId);

    return {
      ...project,
      id: project._id,
      owner,
      collaborators
    };
  }

  async updateProject(projectId, userId, updates) {
    const project = await this.getProjectById(projectId, userId);

    // Check if user can edit
    if (!this.canUserEditProject(project, userId)) {
      throw new ForbiddenError('Permission denied to edit this project');
    }

    const allowedUpdates = ['name', 'description', 'tags'];
    const filteredUpdates = {};
    
    for (const key of allowedUpdates) {
      if (updates[key] !== undefined) {
        filteredUpdates[key] = updates[key];
      }
    }

    if (Object.keys(filteredUpdates).length === 0) {
      throw new UserInputError('No valid fields to update');
    }

    const result = await this.db.collection('projects').findOneAndUpdate(
      { _id: new ObjectId(projectId) },
      { $set: { ...filteredUpdates, updatedAt: new Date() } },
      { returnDocument: 'after' }
    );

    this.logger.info('Project updated', { projectId, userId, updates: Object.keys(filteredUpdates) });
    
    return { ...result.value, id: result.value._id };
  }

  async deleteProject(projectId, userId) {
    const project = await this.getProjectById(projectId, userId);

    // Only owner can delete
    if (project.ownerId.toString() !== userId.toString()) {
      throw new ForbiddenError('Only project owner can delete the project');
    }

    // Check if project has datasets or analyses
    const datasetCount = await this.db.collection('datasets').countDocuments({ projectId: new ObjectId(projectId) });
    const analysisCount = await this.db.collection('analyses').countDocuments({ projectId: new ObjectId(projectId) });

    if (datasetCount > 0 || analysisCount > 0) {
      throw new UserInputError('Cannot delete project with existing datasets or analyses');
    }

    await this.db.collection('projects').deleteOne({ _id: new ObjectId(projectId) });

    this.logger.info('Project deleted', { projectId, userId });
    
    return true;
  }

  async getUserProjects(userId, filters = {}) {
    const query = {
      $or: [
        { ownerId: userId },
        { 'collaborators.userId': userId }
      ]
    };

    if (filters.search) {
      query.$and = query.$and || [];
      query.$and.push({
        $or: [
          { name: { $regex: filters.search, $options: 'i' } },
          { description: { $regex: filters.search, $options: 'i' } },
          { tags: { $in: [new RegExp(filters.search, 'i')] } }
        ]
      });
    }

    const projects = await this.db.collection('projects')
      .find(query)
      .sort({ updatedAt: -1 })
      .limit(filters.limit || 20)
      .skip(filters.offset || 0)
      .toArray();

    // Populate basic info for each project
    const populatedProjects = await Promise.all(
      projects.map(async (project) => {
        const owner = await this.userService.getUserById(project.ownerId);
        const datasetCount = await this.db.collection('datasets').countDocuments({ projectId: project._id });
        const analysisCount = await this.db.collection('analyses').countDocuments({ projectId: project._id });
        
        return {
          ...project,
          id: project._id,
          owner,
          datasetCount,
          analysisCount
        };
      })
    );

    return populatedProjects;
  }

  async shareProject(projectId, userId, sharingSettings) {
    const project = await this.getProjectById(projectId, userId);

    if (!this.canUserEditProject(project, userId)) {
      throw new ForbiddenError('Permission denied to modify sharing settings');
    }

    const updatedSharing = {
      ...project.sharing,
      ...sharingSettings
    };

    // Generate share URL if making public
    if (updatedSharing.isPublic && !updatedSharing.shareUrl) {
      updatedSharing.shareUrl = this.generateShareUrl(projectId);
    }

    const result = await this.db.collection('projects').findOneAndUpdate(
      { _id: new ObjectId(projectId) },
      { $set: { sharing: updatedSharing, updatedAt: new Date() } },
      { returnDocument: 'after' }
    );

    this.logger.info('Project sharing updated', { projectId, userId, isPublic: updatedSharing.isPublic });
    
    return { ...result.value, id: result.value._id };
  }

  async addCollaborator(projectId, userId, collaboratorEmail, role) {
    const project = await this.getProjectById(projectId, userId);

    if (!this.canUserManageCollaborators(project, userId)) {
      throw new ForbiddenError('Permission denied to add collaborators');
    }

    // Find collaborator by email
    const collaboratorUser = await this.db.collection('users').findOne({ email: collaboratorEmail });
    if (!collaboratorUser) {
      throw new UserInputError('User not found with this email');
    }

    // Check if already a collaborator
    const existingCollaborator = project.collaborators.find(
      c => c.userId.toString() === collaboratorUser._id.toString()
    );

    if (existingCollaborator) {
      throw new UserInputError('User is already a collaborator');
    }

    const collaborator = {
      userId: collaboratorUser._id,
      role,
      permissions: this.getPermissionsForRole(role),
      addedAt: new Date()
    };

    await this.db.collection('projects').updateOne(
      { _id: new ObjectId(projectId) },
      { 
        $push: { collaborators: collaborator },
        $set: { updatedAt: new Date() }
      }
    );

    this.logger.info('Collaborator added', { projectId, userId, collaboratorId: collaboratorUser._id, role });
    
    return {
      user: { ...collaboratorUser, id: collaboratorUser._id },
      role: collaborator.role,
      permissions: collaborator.permissions,
      addedAt: collaborator.addedAt
    };
  }

  async updateCollaborator(projectId, userId, collaboratorUserId, role, permissions) {
    const project = await this.getProjectById(projectId, userId);

    if (!this.canUserManageCollaborators(project, userId)) {
      throw new ForbiddenError('Permission denied to update collaborators');
    }

    const result = await this.db.collection('projects').updateOne(
      { 
        _id: new ObjectId(projectId),
        'collaborators.userId': new ObjectId(collaboratorUserId)
      },
      { 
        $set: {
          'collaborators.$.role': role,
          'collaborators.$.permissions': permissions || this.getPermissionsForRole(role),
          updatedAt: new Date()
        }
      }
    );

    if (result.matchedCount === 0) {
      throw new UserInputError('Collaborator not found');
    }

    this.logger.info('Collaborator updated', { projectId, userId, collaboratorUserId, role });
    
    const collaboratorUser = await this.userService.getUserById(collaboratorUserId);
    return {
      user: collaboratorUser,
      role,
      permissions: permissions || this.getPermissionsForRole(role),
      addedAt: new Date() // Would need to preserve original date in real implementation
    };
  }

  async removeCollaborator(projectId, userId, collaboratorUserId) {
    const project = await this.getProjectById(projectId, userId);

    if (!this.canUserManageCollaborators(project, userId)) {
      throw new ForbiddenError('Permission denied to remove collaborators');
    }

    const result = await this.db.collection('projects').updateOne(
      { _id: new ObjectId(projectId) },
      { 
        $pull: { collaborators: { userId: new ObjectId(collaboratorUserId) } },
        $set: { updatedAt: new Date() }
      }
    );

    if (result.modifiedCount === 0) {
      throw new UserInputError('Collaborator not found');
    }

    this.logger.info('Collaborator removed', { projectId, userId, collaboratorUserId });
    
    return true;
  }

  async getProjectCollaborators(projectId) {
    const project = await this.db.collection('projects').findOne({ _id: new ObjectId(projectId) });
    
    if (!project || !project.collaborators) {
      return [];
    }

    const collaborators = await Promise.all(
      project.collaborators.map(async (collab) => {
        const user = await this.userService.getUserById(collab.userId);
        return {
          user,
          role: collab.role,
          permissions: collab.permissions,
          addedAt: collab.addedAt
        };
      })
    );

    return collaborators;
  }

  // Helper methods
  canUserAccessProject(project, userId) {
    if (project.sharing.isPublic) return true;
    if (project.ownerId.toString() === userId.toString()) return true;
    return project.collaborators.some(c => c.userId.toString() === userId.toString());
  }

  canUserEditProject(project, userId) {
    if (project.ownerId.toString() === userId.toString()) return true;
    
    const collaborator = project.collaborators.find(c => c.userId.toString() === userId.toString());
    return collaborator && ['ADMIN', 'EDITOR'].includes(collaborator.role);
  }

  canUserManageCollaborators(project, userId) {
    if (project.ownerId.toString() === userId.toString()) return true;
    
    const collaborator = project.collaborators.find(c => c.userId.toString() === userId.toString());
    return collaborator && collaborator.role === 'ADMIN';
  }

  getPermissionsForRole(role) {
    const rolePermissions = {
      OWNER: ['READ_DATA', 'WRITE_DATA', 'RUN_ANALYSIS', 'MANAGE_SHARING', 'DELETE_PROJECT'],
      ADMIN: ['READ_DATA', 'WRITE_DATA', 'RUN_ANALYSIS', 'MANAGE_SHARING'],
      EDITOR: ['READ_DATA', 'WRITE_DATA', 'RUN_ANALYSIS'],
      VIEWER: ['READ_DATA']
    };

    return rolePermissions[role] || rolePermissions.VIEWER;
  }

  generateShareUrl(projectId) {
    const baseUrl = process.env.FRONTEND_URL || 'https://app.prairiegenomics.com';
    return `${baseUrl}/shared/projects/${projectId}`;
  }
}

module.exports = ProjectService;