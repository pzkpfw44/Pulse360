// backend/controllers/employees.controller.js

const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const { Employee, sequelize } = require('../models');
const { processEmployeeFile } = require('../services/import.service');

// Import employees from file
exports.importEmployees = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    // Get mapping and startRow from request body
    const { columnMapping, startRow, updateExisting } = req.body;
    
    if (!columnMapping) {
      return res.status(400).json({ message: 'Column mapping is required' });
    }

    // Parse column mapping from JSON string if needed
    const mapping = typeof columnMapping === 'string' 
      ? JSON.parse(columnMapping) 
      : columnMapping;

    // Generate batch ID for this import
    const batchId = `import-${uuidv4()}`;
    
    // Process the file
    const result = await processEmployeeFile({
      filePath: req.file.path,
      mapping,
      startRow: parseInt(startRow || '1', 10),
      updateExisting: updateExisting === 'true' || updateExisting === true,
      batchId,
      userId: req.user.id
    });
    
    // Remove the temporary file
    try {
      fs.unlinkSync(req.file.path);
    } catch (err) {
      console.warn('Failed to remove temporary file:', err);
    }

    res.status(200).json({
      message: 'File processed successfully',
      result
    });
  } catch (error) {
    console.error('Error importing employees:', error);
    res.status(500).json({ 
      message: 'Failed to import employees', 
      error: error.message 
    });
  }
};

// Create a new employee
exports.createEmployee = async (req, res) => {
  try {
    const {
      employeeId,
      firstName,
      lastName,
      email,
      jobTitle,
      mainFunction,
      subFunction,
      levelIdentification,
      managerId,
      secondLevelManagerId
    } = req.body;

    // Validate required fields
    if (!employeeId || !firstName || !lastName || !email) {
      return res.status(400).json({ 
        message: 'Required fields missing: employeeId, firstName, lastName, and email are required' 
      });
    }

    // Check if employee already exists
    const existingEmployee = await Employee.findOne({
      where: { employeeId }
    });

    if (existingEmployee) {
      return res.status(400).json({ 
        message: 'An employee with this ID already exists' 
      });
    }

    // Create the employee
    const employee = await Employee.create({
      employeeId,
      firstName,
      lastName,
      email,
      jobTitle,
      mainFunction,
      subFunction,
      levelIdentification,
      managerId,
      secondLevelManagerId,
      importBatch: `manual-${uuidv4()}`,
    });

    res.status(201).json(employee);
  } catch (error) {
    console.error('Error creating employee:', error);
    res.status(500).json({ 
      message: 'Failed to create employee', 
      error: error.message 
    });
  }
};

// Get all employees
exports.getAllEmployees = async (req, res) => {
  try {
    // Support pagination
    const page = parseInt(req.query.page || '1', 10);
    const limit = parseInt(req.query.limit || '20', 10);
    const offset = (page - 1) * limit;
    
    // Support search
    const search = req.query.search || '';
    const searchCondition = search 
      ? {
          [sequelize.Op.or]: [
            { firstName: { [sequelize.Op.like]: `%${search}%` } },
            { lastName: { [sequelize.Op.like]: `%${search}%` } },
            { email: { [sequelize.Op.like]: `%${search}%` } },
            { employeeId: { [sequelize.Op.like]: `%${search}%` } }
          ]
        } 
      : {};
    
    // Support sorting
    const sortField = req.query.sortField || 'lastName';
    const sortDirection = req.query.sortDirection === 'desc' ? 'DESC' : 'ASC';
    
    const { count, rows } = await Employee.findAndCountAll({
      where: searchCondition,
      limit,
      offset,
      order: [[sortField, sortDirection]]
    });
    
    res.status(200).json({
      total: count,
      page,
      totalPages: Math.ceil(count / limit),
      employees: rows
    });
  } catch (error) {
    console.error('Error fetching employees:', error);
    res.status(500).json({ 
      message: 'Failed to fetch employees', 
      error: error.message 
    });
  }
};

// Get employee by ID
exports.getEmployeeById = async (req, res) => {
  try {
    const employee = await Employee.findByPk(req.params.id);
    
    if (!employee) {
      return res.status(404).json({ message: 'Employee not found' });
    }
    
    res.status(200).json(employee);
  } catch (error) {
    console.error('Error fetching employee:', error);
    res.status(500).json({ 
      message: 'Failed to fetch employee', 
      error: error.message 
    });
  }
};

// Update employee
exports.updateEmployee = async (req, res) => {
  try {
    const employee = await Employee.findByPk(req.params.id);
    
    if (!employee) {
      return res.status(404).json({ message: 'Employee not found' });
    }
    
    const {
      firstName,
      lastName,
      email,
      jobTitle,
      mainFunction,
      subFunction,
      levelIdentification,
      managerId,
      secondLevelManagerId,
      status
    } = req.body;
    
    // Update employee fields
    await employee.update({
      firstName: firstName || employee.firstName,
      lastName: lastName || employee.lastName,
      email: email || employee.email,
      jobTitle: jobTitle !== undefined ? jobTitle : employee.jobTitle,
      mainFunction: mainFunction !== undefined ? mainFunction : employee.mainFunction,
      subFunction: subFunction !== undefined ? subFunction : employee.subFunction,
      levelIdentification: levelIdentification !== undefined ? levelIdentification : employee.levelIdentification,
      managerId: managerId !== undefined ? managerId : employee.managerId,
      secondLevelManagerId: secondLevelManagerId !== undefined ? secondLevelManagerId : employee.secondLevelManagerId,
      status: status || employee.status
    });
    
    res.status(200).json(employee);
  } catch (error) {
    console.error('Error updating employee:', error);
    res.status(500).json({ 
      message: 'Failed to update employee', 
      error: error.message 
    });
  }
};

// Delete employee
exports.deleteEmployee = async (req, res) => {
  try {
    const employee = await Employee.findByPk(req.params.id);
    
    if (!employee) {
      return res.status(404).json({ message: 'Employee not found' });
    }
    
    await employee.destroy();
    
    res.status(200).json({ message: 'Employee deleted successfully' });
  } catch (error) {
    console.error('Error deleting employee:', error);
    res.status(500).json({ 
      message: 'Failed to delete employee', 
      error: error.message 
    });
  }
};

// Purge all employees
exports.purgeEmployees = async (req, res) => {
  try {
    // Check for confirmation
    const { confirmation } = req.body;
    
    if (confirmation !== 'CONFIRM_PURGE') {
      return res.status(400).json({ 
        message: 'Confirmation is required to purge all employees' 
      });
    }
    
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        message: 'Only administrators can purge the employee database'
      });
    }
    
    // Delete all employees
    await Employee.destroy({ where: {} });
    
    res.status(200).json({ 
      message: 'All employees have been deleted from the database' 
    });
  } catch (error) {
    console.error('Error purging employees:', error);
    res.status(500).json({ 
      message: 'Failed to purge employees', 
      error: error.message 
    });
  }
};