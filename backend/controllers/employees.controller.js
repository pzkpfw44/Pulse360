// backend/controllers/employees.controller.js

const path = require('path');
const fs = require('fs');
const csv = require('csv');
const xlsx = require('xlsx');
const { v4: uuidv4 } = require('uuid');
const { Employee, sequelize } = require('../models');
const { processEmployeeFile } = require('../services/import.service');

// Import employees from file
exports.importEmployees = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const filePath = req.file.path;
    const fileExt = path.extname(req.file.originalname).toLowerCase();
    
    // Generate a unique batch ID for this import
    const importBatch = uuidv4();
    
    let data = [];
    let successCount = 0;
    let updateCount = 0;
    let errorRecords = [];
    let duplicateRecords = [];
    
    // Process CSV files
    if (fileExt === '.csv') {
      // Use our custom CSV parser instead of the csv package
      data = await parseCSV(filePath);
    } 
    // Process Excel files (xlsx, xls)
    else if (fileExt === '.xlsx' || fileExt === '.xls') {
      const workbook = xlsx.readFile(filePath);
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      
      // Convert Excel to JSON with header row
      data = xlsx.utils.sheet_to_json(worksheet, { raw: false, defval: '' });
    } else {
      return res.status(400).json({ message: 'Unsupported file format' });
    }
    
    // If no data found
    if (!data || data.length === 0) {
      return res.status(400).json({ message: 'No data found in file' });
    }
    
    console.log('Raw data sample:', data.slice(0, 2));
    
    // Standardize field names (map Excel/CSV headers to DB fields)
    const standardizedData = data.map((record, index) => {
      // Get all keys from the record
      const keys = Object.keys(record);
      
      // Create a new standardized record
      const standardized = {};
      
      // Map known fields with various possible names to standard field names
      // This is a critical section that handles different header naming conventions
      for (const key of keys) {
        const lowerKey = key.toLowerCase().trim();
        
        if (lowerKey === 'id' || lowerKey === 'employee id' || lowerKey === 'employeeid' || lowerKey === 'employee_id') {
          standardized.employeeId = record[key].toString().trim();
        }
        else if (lowerKey === 'firstname' || lowerKey === 'first name' || lowerKey === 'first_name' || lowerKey === 'fname') {
          standardized.firstName = record[key].toString().trim();
        }
        else if (lowerKey === 'lastname' || lowerKey === 'last name' || lowerKey === 'last_name' || lowerKey === 'lname' || lowerKey === 'second name') {
          standardized.lastName = record[key].toString().trim();
        }
        else if (lowerKey === 'email' || lowerKey === 'email address' || lowerKey === 'emailaddress') {
          standardized.email = record[key].toString().trim();
        }
        else if (lowerKey === 'job title' || lowerKey === 'jobtitle' || lowerKey === 'title' || lowerKey === 'position') {
          standardized.jobTitle = record[key].toString().trim();
        }
        else if (lowerKey === 'department' || lowerKey === 'function' || lowerKey === 'mainfunction') {
          standardized.mainFunction = record[key].toString().trim();
        }
        else if (lowerKey === 'subfunction' || lowerKey === 'sub function' || lowerKey === 'sub-function') {
          standardized.subFunction = record[key].toString().trim();
        }
        else if (lowerKey === 'manager id' || lowerKey === 'managerid' || lowerKey === 'manager_id') {
          standardized.managerId = record[key].toString().trim();
        }
        else if (lowerKey === 'level' || lowerKey === 'level identification' || lowerKey === 'levelidentification') {
          standardized.levelIdentification = record[key].toString().trim();
        }
        else if (lowerKey === 'role') {
          standardized.role = record[key].toString().trim();
          // Also use Role as jobTitle if no specific job title is provided
          if (!standardized.jobTitle) {
            standardized.jobTitle = record[key].toString().trim();
          }
        }
      }
      
      // Store original record for debugging
      standardized._original = record;
      standardized._rowNumber = index + 2; // +2 because index starts at 0 and we have a header row
      
      console.log(`Row ${index + 2} mapped:`, standardized);
      
      return standardized;
    });
    
    // Now process each record
    for (const record of standardizedData) {
      try {
        console.log('Processing record:', record);
        
        // Skip if missing required fields
        if (!record.employeeId || !record.firstName || !record.lastName) {
          console.log('Missing required fields:', { employeeId: record.employeeId, firstName: record.firstName, lastName: record.lastName });
          errorRecords.push({
            row: record._rowNumber,
            error: 'Missing required fields (Employee ID, First Name, or Last Name)',
            data: record
          });
          continue;
        }
        
        // Check email format if provided
        if (record.email && !validateEmail(record.email)) {
          console.log('Invalid email format:', record.email);
          errorRecords.push({
            row: record._rowNumber,
            error: 'Invalid email format',
            data: record
          });
          continue;
        }
        
        // Check for duplicate employee ID in current import
        const isDuplicateInBatch = duplicateRecords.some(
          dr => dr.employeeId === record.employeeId
        );
        
        if (isDuplicateInBatch) {
          console.log('Duplicate in batch:', record.employeeId);
          duplicateRecords.push({
            row: record._rowNumber,
            employeeId: record.employeeId,
            message: 'Duplicate employee ID in import file'
          });
          continue;
        }
        
        // Check if employee exists in database
        const existingEmployee = await Employee.findOne({
          where: { employeeId: record.employeeId }
        });
        
        if (existingEmployee) {
          console.log('Updating existing employee:', record.employeeId);
          // Update existing employee
          await existingEmployee.update({
            ...record,
            importBatch,
            lastUpdatedAt: new Date()
          });
          updateCount++;
        } else {
          console.log('Creating new employee:', record.employeeId);
          // Create new employee
          await Employee.create({
            ...record,
            status: 'active',
            importBatch,
            importedAt: new Date()
          });
          successCount++;
        }
      } catch (error) {
        console.error(`Error processing record at row ${record._rowNumber}:`, error);
        errorRecords.push({
          row: record._rowNumber,
          error: error.message,
          data: record
        });
      }
    }
    
    // Clean up the uploaded file - using the proper Promise API
    try {
      await fs.unlink(filePath);
    } catch (err) {
      console.error('Error deleting temporary file:', err);
    }
    
    return res.status(200).json({
      message: 'Import completed',
      totalRecords: data.length,
      newEmployees: successCount,
      updatedEmployees: updateCount,
      errors: errorRecords.map(e => ({
        row: e.row,
        error: e.error
      })),
      duplicates: duplicateRecords
    });
  } catch (error) {
    console.error('Error importing employees:', error);
    return res.status(500).json({
      message: 'Failed to import employees',
      error: error.message
    });
  }
};

// Helper function to validate email format
function validateEmail(email) {
  const re = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
  return re.test(String(email).toLowerCase());
}

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