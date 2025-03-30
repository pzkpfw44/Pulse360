// backend/services/import.service.js

const XLSX = require('xlsx');
const csv = require('csv-parser');
const fs = require('fs');
const path = require('path');
const { Employee, sequelize } = require('../models');

// Process employee file (Excel or CSV)
exports.processEmployeeFile = async ({ filePath, mapping, startRow = 1, updateExisting = true, batchId, userId }) => {
  try {
    const fileExt = path.extname(filePath).toLowerCase();
    let data = [];
    
    // Parse file based on extension
    if (fileExt === '.csv') {
      data = await parseCSV(filePath, startRow);
    } else if (['.xlsx', '.xls'].includes(fileExt)) {
      data = await parseExcel(filePath, startRow);
    } else {
      throw new Error('Unsupported file format. Please upload a CSV or Excel file.');
    }
    
    // Validate the mapping against required fields
    validateMapping(mapping);
    
    // Map data to employee records
    const mappedData = data.map(row => mapRowToEmployee(row, mapping));
    
    // Process the mapped data
    const result = await processEmployeeData(mappedData, updateExisting, batchId);
    
    return result;
  } catch (error) {
    console.error('Error processing employee file:', error);
    throw error;
  }
};

// Parse CSV file
const parseCSV = (filePath, startRow) => {
  return new Promise((resolve, reject) => {
    const results = [];
    let rowCounter = 0;
    
    fs.createReadStream(filePath)
      .pipe(csv())
      .on('data', (data) => {
        rowCounter++;
        if (rowCounter >= startRow) {
          results.push(data);
        }
      })
      .on('end', () => {
        resolve(results);
      })
      .on('error', (error) => {
        reject(error);
      });
  });
};

// Parse Excel file
const parseExcel = (filePath, startRow) => {
  try {
    const workbook = XLSX.readFile(filePath, { cellDates: true });
    const sheetName = workbook.SheetNames[0]; // Use first sheet
    const worksheet = workbook.Sheets[sheetName];
    
    // Convert to JSON with header row
    const jsonData = XLSX.utils.sheet_to_json(worksheet, { 
      defval: null, 
      header: "A", 
      blankrows: false 
    });
    
    // Skip rows before startRow (adjust for 0-indexing and header)
    return jsonData.slice(startRow - 1);
  } catch (error) {
    console.error('Error parsing Excel file:', error);
    throw new Error(`Failed to parse Excel file: ${error.message}`);
  }
};

// Validate the mapping
const validateMapping = (mapping) => {
  const requiredFields = ['employeeId', 'firstName', 'lastName', 'email'];
  
  for (const field of requiredFields) {
    if (!mapping[field]) {
      throw new Error(`Required field '${field}' is not mapped to a column.`);
    }
  }
};

// Map row data to employee schema
const mapRowToEmployee = (row, mapping) => {
  const employee = {};
  
  // Map each field based on the mapping
  for (const [field, column] of Object.entries(mapping)) {
    if (column && row[column] !== undefined) {
      employee[field] = row[column];
    }
  }
  
  return employee;
};

// Process employee data
const processEmployeeData = async (employeeRecords, updateExisting, batchId) => {
  const result = {
    total: employeeRecords.length,
    inserted: 0,
    updated: 0,
    errors: [],
    duplicates: []
  };
  
  // For duplicate detection
  const processedIds = new Set();
  
  // Start a transaction
  const transaction = await sequelize.transaction();
  
  try {
    for (const [index, record] of employeeRecords.entries()) {
      try {
        // Skip records without required fields
        if (!record.employeeId || !record.firstName || !record.lastName || !record.email) {
          result.errors.push({
            row: index + 1,
            message: 'Missing required fields',
            data: record
          });
          continue;
        }
        
        // Check if this employeeId was already processed in this import
        if (processedIds.has(record.employeeId)) {
          result.duplicates.push({
            row: index + 1,
            employeeId: record.employeeId,
            message: 'Duplicate employee ID in import file'
          });
          continue;
        }
        
        processedIds.add(record.employeeId);
        
        // Check if employee already exists
        const existingEmployee = await Employee.findOne({ 
          where: { employeeId: record.employeeId },
          transaction
        });
        
        if (existingEmployee) {
          if (updateExisting) {
            // Update existing employee
            await existingEmployee.update({
              ...record,
              lastUpdatedAt: new Date(),
              importBatch: batchId
            }, { transaction });
            
            result.updated++;
          } else {
            result.duplicates.push({
              row: index + 1,
              employeeId: record.employeeId,
              message: 'Employee already exists'
            });
          }
        } else {
          // Insert new employee
          await Employee.create({
            ...record,
            importBatch: batchId
          }, { transaction });
          
          result.inserted++;
        }
      } catch (error) {
        result.errors.push({
          row: index + 1,
          message: error.message,
          data: record
        });
      }
    }
    
    // Commit the transaction
    await transaction.commit();
    
    return result;
  } catch (error) {
    // Rollback the transaction
    await transaction.rollback();
    throw error;
  }
};