/**
 * Migration: Add missing columns to projects table
 * 
 * Adds columns needed for project management features that were
 * added after the initial projects table creation.
 */

exports.up = (pgm) => {
  // Add progress tracking
  pgm.addColumn('projects', {
    progress: {
      type: 'integer',
      default: 0,
      comment: 'Project completion percentage (0-100)'
    }
  }, {
    ifNotExists: true
  });

  // Add team size
  pgm.addColumn('projects', {
    team_size: {
      type: 'integer',
      default: 0,
      comment: 'Number of team members'
    }
  }, {
    ifNotExists: true
  });

  // Add budget tracking
  pgm.addColumn('projects', {
    budget: {
      type: 'varchar(100)',
      comment: 'Project budget (formatted string)'
    }
  }, {
    ifNotExists: true
  });

  // Add deadline
  pgm.addColumn('projects', {
    deadline: {
      type: 'timestamp',
      comment: 'Project deadline'
    }
  }, {
    ifNotExists: true
  });

  // Add priority
  pgm.addColumn('projects', {
    priority: {
      type: 'varchar(50)',
      comment: 'Project priority: low, medium, high, critical'
    }
  }, {
    ifNotExists: true
  });

  // Add ROI tracking
  pgm.addColumn('projects', {
    roi: {
      type: 'varchar(100)',
      comment: 'Return on Investment (formatted string)'
    }
  }, {
    ifNotExists: true
  });

  // Add indexes for commonly queried columns
  pgm.createIndex('projects', 'progress', { ifNotExists: true });
  pgm.createIndex('projects', 'priority', { ifNotExists: true });
  pgm.createIndex('projects', 'deadline', { ifNotExists: true });
};

exports.down = (pgm) => {
  // Remove added columns
  pgm.dropColumn('projects', 'progress', { ifExists: true });
  pgm.dropColumn('projects', 'team_size', { ifExists: true });
  pgm.dropColumn('projects', 'budget', { ifExists: true });
  pgm.dropColumn('projects', 'deadline', { ifExists: true });
  pgm.dropColumn('projects', 'priority', { ifExists: true });
  pgm.dropColumn('projects', 'roi', { ifExists: true });

  // Drop indexes
  pgm.dropIndex('projects', 'progress', { ifExists: true });
  pgm.dropIndex('projects', 'priority', { ifExists: true });
  pgm.dropIndex('projects', 'deadline', { ifExists: true });
};
