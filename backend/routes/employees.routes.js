// backend/routes/employees.routes.js

const express = require('express');
const router = express.Router();
const employeesController = require('../controllers/employees.controller');
const { authMiddleware } = require('../middleware/auth.middleware');
const upload = require('../middleware/upload.middleware');

// Apply auth middleware to all routes
router.use(authMiddleware);

// Import employees from file
router.post('/import', upload.single('file'), employeesController.importEmployees);

// Get all employees
router.get('/', employeesController.getAllEmployees);

// Get employee by ID
router.get('/:id', employeesController.getEmployeeById);

// Create a new employee
router.post('/', employeesController.createEmployee);

// Update employee
router.put('/:id', employeesController.updateEmployee);

// Delete employee
router.delete('/:id', employeesController.deleteEmployee);

// Purge all employees
router.delete('/', employeesController.purgeEmployees);

module.exports = router;