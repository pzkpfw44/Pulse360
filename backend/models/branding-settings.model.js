// backend/models/branding-settings.model.js

const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const BrandingSettings = sequelize.define('BrandingSettings', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  companyName: {
    type: DataTypes.STRING,
    allowNull: true
  },
  industry: {
    type: DataTypes.STRING,
    allowNull: true
  },
  keyValues: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  tone: {
    type: DataTypes.STRING,
    defaultValue: 'professional',
    allowNull: false
  },
  formality: {
    type: DataTypes.STRING,
    defaultValue: 'formal',
    allowNull: false
  },
  personality: {
    type: DataTypes.STRING,
    defaultValue: 'helpful',
    allowNull: false
  },
  primaryColor: {
    type: DataTypes.STRING,
    defaultValue: '#3B82F6', // Default blue
    allowNull: false,
    validate: {
        isHexColorOrCSSVariable(value) {
            if (!/^#([0-9A-F]{3}){1,2}$/i.test(value) && !/^var\(--.*\)$/.test(value)) {
                // Allow CSS variables like var(--some-color) if needed in future
                // For now, strict hex validation might be better unless needed
                 if (!/^#([0-9A-F]{3}){1,2}$/i.test(value)) {
                    throw new Error('Invalid hex color format for primaryColor.');
                 }
            }
        }
    }
  },
  secondaryColor: {
    type: DataTypes.STRING,
    defaultValue: '#2563EB', // Default darker blue
    allowNull: true, // Keep allowing null if it can be unset
     validate: {
        isHexColorOrCSSVariable(value) {
            if (value && !/^#([0-9A-F]{3}){1,2}$/i.test(value) && !/^var\(--.*\)$/.test(value)) {
                 if (!/^#([0-9A-F]{3}){1,2}$/i.test(value)) {
                    throw new Error('Invalid hex color format for secondaryColor.');
                 }
            }
        }
     }
  },
  // --- NEW FONT COLORS ---
  fontColorDark: {
    type: DataTypes.STRING,
    defaultValue: '#1F2937', // Default: Tailwind gray-800
    allowNull: false,
    validate: {
        isHexColor(value) {
            if (!/^#([0-9A-F]{3}){1,2}$/i.test(value)) {
                throw new Error('Invalid hex color format for fontColorDark.');
            }
        }
    }
  },
  fontColorLight: {
    type: DataTypes.STRING,
    defaultValue: '#FFFFFF', // Default: white
    allowNull: false,
     validate: {
        isHexColor(value) {
            if (!/^#([0-9A-F]{3}){1,2}$/i.test(value)) {
                throw new Error('Invalid hex color format for fontColorLight.');
            }
        }
    }
  },
  fontColorAccent: {
    type: DataTypes.STRING,
    defaultValue: '#3B82F6', // Default: Same as primary blue
    allowNull: false,
     validate: {
        isHexColor(value) {
            if (!/^#([0-9A-F]{3}){1,2}$/i.test(value)) {
                throw new Error('Invalid hex color format for fontColorAccent.');
            }
        }
    }
  },
  // --- END NEW FONT COLORS ---
  userId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'Users',
      key: 'id'
    }
  },
  createdAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  },
  updatedAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'branding_settings',
  timestamps: true,
  hooks: {
    // Ensure secondaryColor defaults correctly if empty string or null is passed
    beforeValidate: (settings) => {
      if (settings.secondaryColor === '' || settings.secondaryColor === null) {
        settings.secondaryColor = '#2563EB'; // Set default if empty/null
      }
       // Add similar checks for new font colors if necessary, using their defaults
       if (!settings.fontColorDark) settings.fontColorDark = '#1F2937';
       if (!settings.fontColorLight) settings.fontColorLight = '#FFFFFF';
       if (!settings.fontColorAccent) settings.fontColorAccent = '#3B82F6'; // Default to primary if unset initially
    }
  }
});

// Update fontColorAccent default dynamically if primaryColor changes
BrandingSettings.beforeUpdate(async (settings, options) => {
  if (settings.changed('primaryColor') && !settings.changed('fontColorAccent')) {
     // If primaryColor changed BUT fontColorAccent did not, update fontColorAccent
     // unless the user specifically set it differently this time.
     // We check `!settings.changed('fontColorAccent')` to allow user override.
     settings.fontColorAccent = settings.primaryColor;
  }
  // If secondaryColor is explicitly set to empty/null, reset to default before saving
  if (settings.secondaryColor === '' || settings.secondaryColor === null) {
      settings.secondaryColor = '#2563EB';
  }
});

BrandingSettings.beforeCreate(async (settings, options) => {
    // Set initial fontColorAccent based on primaryColor if not provided
    if (!settings.fontColorAccent) {
        settings.fontColorAccent = settings.primaryColor || '#3B82F6';
    }
    // Ensure secondaryColor default on create if null/empty
    if (settings.secondaryColor === '' || settings.secondaryColor === null) {
        settings.secondaryColor = '#2563EB';
    }
     // Set other font defaults if needed
     if (!settings.fontColorDark) settings.fontColorDark = '#1F2937';
     if (!settings.fontColorLight) settings.fontColorLight = '#FFFFFF';
});


module.exports = BrandingSettings;