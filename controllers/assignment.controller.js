const Assignment = require('../models/assignment');
const AssignmentAllocation = require('../models/assignmentAllocation');
const UserMaster = require('../models/userMaster');
const CompanyMaster = require('../models/companyMaster');
const Department = require('../models/department');
const { Op, literal } = require('sequelize');

/**
 * Add new assignment
 */
exports.add = async (req, res) => {
  try {
    const {
      title,
      description,
      instructions,
      textBlocks,
      companyMasterID,
      departmentID,
      assessmentID,
    } = req.body;

    if (!title || !companyMasterID) {
      return res.status(400).json({
        status: 400,
        message: 'Title and company ID are required',
      });
    }

    const assignment = await Assignment.create({
      title,
      description,
      instructions,
      textBlocks,
      companyMasterID,
      departmentID: departmentID || null,
      assessmentID: assessmentID || null,
      status: 'DRAFT',
      createdBy: req.userDetails?.userMasterId || null,
      createdByIp: req.ip || null,
    });

    res.status(200).json({
      status: 200,
      message: 'Assignment created successfully',
      data: assignment,
    });
  } catch (error) {
    console.error('Error creating assignment:', error);
    res.status(500).json({
      status: 500,
      message: error.message || 'Error creating assignment',
    });
  }
};

/**
 * List assignments
 */
exports.list = async (req, res) => {
  try {
    const {
      companyMasterID,
      departmentID,
      page = 1,
      limit = 50,
      searchQuery,
      status,
    } = req.body;

    // Require either companyMasterID or departmentID
    if (!companyMasterID && !departmentID) {
      return res.status(400).json({
        status: 400,
        message: 'Company ID or Department ID is required',
      });
    }

    const offset = (page - 1) * limit;
    const whereClause = {
      deletedAt: null,
    };

    // Filter by company and department
    if (companyMasterID) {
      whereClause.companyMasterID = companyMasterID;
    }

    if (departmentID) {
      if (Array.isArray(departmentID)) {
        if (departmentID.length > 0) {
          whereClause.departmentID = { [Op.in]: departmentID };
        }
      } else {
        whereClause.departmentID = departmentID;
      }
    }

    if (searchQuery) {
      whereClause[Op.or] = [
        { title: { [Op.iLike]: `%${searchQuery}%` } },
        { description: { [Op.iLike]: `%${searchQuery}%` } },
      ];
    }

    if (status) {
      whereClause.status = status;
    }

    const { count, rows } = await Assignment.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: UserMaster,
          as: 'createBy',
          attributes: ['userMasterID', 'displayName'],
        },
        {
          model: CompanyMaster,
          attributes: ['companyMasterID', 'companyName'],
        },
        {
          model: Department,
          as: 'department',
          attributes: ['departmentId', 'departmentName'],
        },
      ],
      attributes: {
        include: [
          [
            literal(`(SELECT COUNT(*) FROM assignment_allocations WHERE assignment_allocations."assignmentID" = "assignments"."assignmentID" AND assignment_allocations."deletedAt" IS NULL)`),
            'allocationCount',
          ],
        ],
      },
      distinct: true,
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['createdAt', 'DESC']],
    });

    res.status(200).json({
      status: 200,
      message: 'Assignments retrieved successfully',
      data: rows,
      totalcount: count,
      page: parseInt(page),
      limit: parseInt(limit),
    });
  } catch (error) {
    console.error('Error fetching assignments:', error);
    res.status(500).json({
      status: 500,
      message: error.message || 'Error fetching assignments',
    });
  }
};

/**
 * Get assignment by ID
 */
exports.getByID = async (req, res) => {
  try {
    const { assignmentID } = req.body;

    if (!assignmentID) {
      return res.status(400).json({
        status: 400,
        message: 'Assignment ID is required',
      });
    }

    const assignment = await Assignment.findOne({
      where: {
        assignmentID,
        deletedAt: null,
      },
      include: [
        {
          model: UserMaster,
          as: 'createBy',
          attributes: ['userMasterID', 'displayName'],
        },
        {
          model: CompanyMaster,
          attributes: ['companyMasterID', 'companyName'],
        },
        {
          model: Department,
          as: 'department',
          attributes: ['departmentId', 'departmentName'],
        },
      ],
    });

    if (!assignment) {
      return res.status(404).json({
        status: 404,
        message: 'Assignment not found',
      });
    }

    res.status(200).json({
      status: 200,
      message: 'Assignment retrieved successfully',
      data: assignment,
    });
  } catch (error) {
    console.error('Error fetching assignment:', error);
    res.status(500).json({
      status: 500,
      message: error.message || 'Error fetching assignment',
    });
  }
};

/**
 * Update assignment
 */
exports.update = async (req, res) => {
  try {
    const {
      assignmentID,
      title,
      description,
      instructions,
      textBlocks,
      companyMasterID,
      departmentID,
    } = req.body;

    if (!assignmentID || !companyMasterID) {
      return res.status(400).json({
        status: 400,
        message: 'Assignment ID and Company ID are required',
      });
    }

    const assignment = await Assignment.findOne({
      where: {
        assignmentID,
        companyMasterID,
        deletedAt: null,
      },
    });

    if (!assignment) {
      return res.status(404).json({
        status: 404,
        message: 'Assignment not found',
      });
    }

    await assignment.update({
      title: title || assignment.title,
      description: description !== undefined ? description : assignment.description,
      instructions: instructions !== undefined ? instructions : assignment.instructions,
      textBlocks: textBlocks !== undefined ? textBlocks : assignment.textBlocks,
      departmentID: departmentID !== undefined ? departmentID : assignment.departmentID,
      updatedBy: req.userDetails?.userMasterId || null,
      updatedByIp: req.ip || null,
    });

    res.status(200).json({
      status: 200,
      message: 'Assignment updated successfully',
    });
  } catch (error) {
    console.error('Error updating assignment:', error);
    res.status(500).json({
      status: 500,
      message: error.message || 'Error updating assignment',
    });
  }
};

/**
 * Publish assignment
 */
exports.publish = async (req, res) => {
  try {
    const { assignmentID } = req.body;

    if (!assignmentID) {
      return res.status(400).json({
        status: 400,
        message: 'Assignment ID is required',
      });
    }

    const assignment = await Assignment.findByPk(assignmentID);

    if (!assignment) {
      return res.status(404).json({
        status: 404,
        message: 'Assignment not found',
      });
    }

    await assignment.update({
      status: 'ACTIVE',
      updatedBy: req.userDetails?.userMasterId || null,
      updatedByIp: req.ip || null,
    });

    res.status(200).json({
      status: 200,
      message: 'Assignment published successfully',
    });
  } catch (error) {
    console.error('Error publishing assignment:', error);
    res.status(500).json({
      status: 500,
      message: error.message || 'Error publishing assignment',
    });
  }
};

/**
 * Delete assignment
 */
exports.delete = async (req, res) => {
  try {
    const { assignmentID } = req.body;

    if (!assignmentID) {
      return res.status(400).json({
        status: 400,
        message: 'Assignment ID is required',
      });
    }

    const assignment = await Assignment.findByPk(assignmentID);

    if (!assignment) {
      return res.status(404).json({
        status: 404,
        message: 'Assignment not found',
      });
    }

    // Block deletion if assignment is already assigned to any employee
    const allocationCount = await AssignmentAllocation.count({
      where: { assignmentID, deletedAt: null },
    });

    if (allocationCount > 0) {
      return res.status(200).json({
        status: 400,
        message: 'Cannot delete this assignment as it is already assigned to employees.',
      });
    }

    await assignment.update({
      deletedBy: req.userDetails?.userMasterId || null,
      deletedByIp: req.ip || null,
    });

    await assignment.destroy();

    res.status(200).json({
      status: 200,
      message: 'Assignment deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting assignment:', error);
    res.status(500).json({
      status: 500,
      message: error.message || 'Error deleting assignment',
    });
  }
};

/**
 * Assign assignment to trainees
 */
exports.assignToTrainees = async (req, res) => {
  try {
    const {
      assignmentID,
      companyMasterID,
      trainees, // Array of { traineeId, deadline, notes }
      generalNotes,
    } = req.body;

    if (!assignmentID || !companyMasterID) {
      return res.status(400).json({
        status: 400,
        message: 'Assignment ID and Company ID are required',
      });
    }

    if (!trainees || !Array.isArray(trainees) || trainees.length === 0) {
      return res.status(400).json({
        status: 400,
        message: 'At least one trainee must be selected',
      });
    }

    // Verify assignment exists and is active
    const assignment = await Assignment.findOne({
      where: {
        assignmentID,
        companyMasterID,
        deletedAt: null,
      },
    });

    if (!assignment) {
      return res.status(404).json({
        status: 404,
        message: 'Assignment not found',
      });
    }

    if (assignment.status !== 'ACTIVE') {
      return res.status(400).json({
        status: 400,
        message: 'Only active assignments can be assigned to trainees',
      });
    }

    // Validate deadlines are in the future
    const now = new Date();
    for (const trainee of trainees) {
      const deadline = new Date(trainee.deadline);
      if (deadline <= now) {
        return res.status(400).json({
          status: 400,
          message: `Deadline for trainee ${trainee.traineeId} must be in the future`,
        });
      }
    }

    // Create or update allocations
    const allocations = [];
    const errors = [];

    for (const trainee of trainees) {
      try {
        // Check if allocation already exists
        const existingAllocation = await AssignmentAllocation.findOne({
          where: {
            assignmentID,
            traineeID: trainee.traineeId,
            deletedAt: null,
          },
        });

        if (existingAllocation) {
          // Update existing allocation
          await existingAllocation.update({
            deadline: new Date(trainee.deadline),
            notes: trainee.notes || generalNotes || null,
            isActive: true,
            updatedBy: req.userDetails?.userMasterId || null,
            updatedByIp: req.ip || null,
          });
          allocations.push(existingAllocation);
        } else {
          // Create new allocation
          const allocation = await AssignmentAllocation.create({
            assignmentID,
            traineeID: trainee.traineeId,
            deadline: new Date(trainee.deadline),
            notes: trainee.notes || generalNotes || null,
            isActive: true,
            companyMasterID,
            allocatedBy: req.userDetails?.userMasterId || null,
            createdBy: req.userDetails?.userMasterId || null,
            createdByIp: req.ip || null,
          });
          allocations.push(allocation);
        }
      } catch (error) {
        console.error(`Error allocating to trainee ${trainee.traineeId}:`, error);
        errors.push({
          traineeId: trainee.traineeId,
          error: error.message,
        });
      }
    }

    if (errors.length > 0 && allocations.length === 0) {
      return res.status(500).json({
        status: 500,
        message: 'Failed to allocate assignment to any trainees',
        errors,
      });
    }

    res.status(200).json({
      status: 200,
      message: `Assignment allocated to ${allocations.length} trainee(s) successfully`,
      data: allocations,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    console.error('Error assigning assignment to trainees:', error);
    res.status(500).json({
      status: 500,
      message: error.message || 'Error assigning assignment to trainees',
    });
  }
};

/**
 * Update deadline for a specific allocation
 */
exports.updateDeadline = async (req, res) => {
  try {
    const { allocationID, deadline, companyMasterID } = req.body;

    if (!allocationID || !deadline || !companyMasterID) {
      return res.status(400).json({
        status: 400,
        message: 'Allocation ID, deadline, and Company ID are required',
      });
    }

    const allocation = await AssignmentAllocation.findOne({
      where: {
        allocationID,
        companyMasterID,
        deletedAt: null,
      },
    });

    if (!allocation) {
      return res.status(404).json({
        status: 404,
        message: 'Assignment allocation not found',
      });
    }

    // Validate deadline is in the future
    const newDeadline = new Date(deadline);
    if (newDeadline <= new Date()) {
      return res.status(400).json({
        status: 400,
        message: 'Deadline must be in the future',
      });
    }

    await allocation.update({
      deadline: newDeadline,
      updatedBy: req.userDetails?.userMasterId || null,
      updatedByIp: req.ip || null,
    });

    res.status(200).json({
      status: 200,
      message: 'Deadline updated successfully',
      data: allocation,
    });
  } catch (error) {
    console.error('Error updating deadline:', error);
    res.status(500).json({
      status: 500,
      message: error.message || 'Error updating deadline',
    });
  }
};

/**
 * Get allocations for an assignment
 */
exports.getAllocations = async (req, res) => {
  try {
    const { assignmentID, companyMasterID } = req.body;

    if (!assignmentID || !companyMasterID) {
      return res.status(400).json({
        status: 400,
        message: 'Assignment ID and Company ID are required',
      });
    }

    const allocations = await AssignmentAllocation.findAll({
      where: {
        assignmentID,
        companyMasterID,
        deletedAt: null,
      },
      include: [
        {
          model: UserMaster,
          as: 'trainee',
          attributes: ['userMasterID', 'displayName', 'email'],
        },
        {
          model: UserMaster,
          as: 'allocator',
          attributes: ['userMasterID', 'displayName'],
        },
      ],
      order: [['createdAt', 'DESC']],
    });

    res.status(200).json({
      status: 200,
      message: 'Allocations retrieved successfully',
      data: allocations,
    });
  } catch (error) {
    console.error('Error fetching allocations:', error);
    res.status(500).json({
      status: 500,
      message: error.message || 'Error fetching allocations',
    });
  }
};

/**
 * Get assignments assigned to a trainee
 */
exports.getAssignedToMe = async (req, res) => {
  try {
    const traineeID = req.body.traineeID || req.userDetails?.userMasterId;
    const companyMasterID = req.body.companyMasterID || req.userDetails?.companyMasterID;
    const { page = 1, limit = 10, searchQuery } = req.body;

    if (!traineeID || !companyMasterID) {
      return res.status(400).json({
        status: 400,
        message: 'Trainee ID and Company ID are required',
      });
    }

    const offset = (page - 1) * limit;
    const assignmentWhere = {
      status: 'ACTIVE',
      deletedAt: null,
    };

    if (searchQuery) {
      assignmentWhere[Op.or] = [
        { title: { [Op.iLike]: `%${searchQuery}%` } },
        { description: { [Op.iLike]: `%${searchQuery}%` } },
      ];
    }

    const { count, rows } = await AssignmentAllocation.findAndCountAll({
      where: {
        traineeID,
        companyMasterID,
        isActive: true,
        deletedAt: null,
      },
      include: [
        {
          model: UserMaster,
          as: 'allocator',
          attributes: ['userMasterID', 'displayName'],
          required: false,
        },
        {
          model: Assignment,
          as: 'assignment',
          where: assignmentWhere,
          required: true,
          include: [
            {
              model: UserMaster,
              as: 'createBy',
              attributes: ['userMasterID', 'displayName'],
              required: false,
            },
          ],
        },
      ],
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['deadline', 'ASC']],
    });

    res.status(200).json({
      status: 200,
      message: 'Assigned assignments retrieved successfully',
      data: rows,
      totalcount: count,
      total: count,
      page: parseInt(page),
      limit: parseInt(limit),
    });
  } catch (error) {
    console.error('Error fetching assigned assignments:', error);
    res.status(500).json({
      status: 500,
      message: error.message || 'Error fetching assigned assignments',
    });
  }
};

/**
 * Get assignment counts by status
 */
exports.getCounts = async (req, res) => {
  try {
    const { companyMasterID, departmentID, searchQuery } = req.body;

    console.log('📊 Get Assignment Counts Request:', { companyMasterID, departmentID });

    // Require either companyMasterID or departmentID
    if (!companyMasterID && !departmentID) {
      console.log('❌ Missing companyMasterID and departmentID');
      return res.status(400).json({
        status: 400,
        message: 'Company ID or Department ID is required',
      });
    }

    const whereClause = {
      deletedAt: null,
    };

    // Filter by department if provided, otherwise by company
    if (departmentID) {
      whereClause.departmentID = departmentID;
    } else if (companyMasterID) {
      whereClause.companyMasterID = companyMasterID;
    }

    if (searchQuery) {
      whereClause[Op.or] = [
        { title: { [Op.iLike]: `%${searchQuery}%` } },
        { description: { [Op.iLike]: `%${searchQuery}%` } },
      ];
    }

    // Get total count
    const totalCount = await Assignment.count({
      where: whereClause,
    });

    // Get active count
    const activeCount = await Assignment.count({
      where: {
        ...whereClause,
        status: 'ACTIVE',
      },
    });

    // Get draft count
    const draftCount = await Assignment.count({
      where: {
        ...whereClause,
        status: 'DRAFT',
      },
    });

    // Get total allocations count
    const totalAllocations = await AssignmentAllocation.count({
      where: {
        deletedAt: null,
      },
      include: [
        {
          model: Assignment,
          as: 'assignment',
          where: whereClause,
          attributes: [],
          required: true,
        },
      ],
    });

    // Get total submissions count (assuming submissions are tracked in allocations with submittedAt field)
    const totalSubmissions = await AssignmentAllocation.count({
      where: {
        deletedAt: null,
        submittedAt: { [Op.ne]: null },
      },
      include: [
        {
          model: Assignment,
          as: 'assignment',
          where: whereClause,
          attributes: [],
          required: true,
        },
      ],
    });

    console.log('✅ Assignment counts:', { totalCount, activeCount, draftCount, totalAllocations, totalSubmissions });

    res.status(200).json({
      status: 200,
      data: {
        total: totalCount,
        active: activeCount,
        draft: draftCount,
        totalAllocations: totalAllocations,
        totalSubmissions: totalSubmissions,
      },
    });
  } catch (error) {
    console.error('❌ Error fetching assignment counts:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({
      status: 500,
      message: error.message || 'Error fetching assignment counts',
      error: error.toString(),
    });
  }
};
