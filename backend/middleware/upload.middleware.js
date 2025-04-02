// Enhanced file upload middleware with better validation
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadsDir)){
    fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure storage
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadsDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

// File filter with clear logging
const fileFilter = (req, file, cb) => {
  // Accept document file types
  const allowedTypes = ['.pdf', '.txt'];
  const ext = path.extname(file.originalname).toLowerCase();
  
  console.log(`Checking file type for ${file.originalname}: ${ext}`);
  
  if (allowedTypes.includes(ext)) {
    console.log(`File type accepted: ${ext}`);
    cb(null, true);
  } else {
    console.log(`File type rejected: ${ext} - Not in allowed types: ${allowedTypes.join(', ')}`);
    cb(new Error(`Invalid file type. Only ${allowedTypes.join(', ')} files are allowed.`), false);
  }
};

// Create multer upload middleware
const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB max file size for reliable processing
  },
  fileFilter: fileFilter
});

module.exports = upload;