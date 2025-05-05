'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    /**
     * Add altering commands here.
     */
    const transaction = await queryInterface.sequelize.transaction();
    try {
      await queryInterface.addColumn('branding_settings', 'fontColorDark', {
        type: Sequelize.DataTypes.STRING,
        defaultValue: '#1F2937', // Default: Tailwind gray-800
        allowNull: false,
      }, { transaction });

      await queryInterface.addColumn('branding_settings', 'fontColorLight', {
        type: Sequelize.DataTypes.STRING,
        defaultValue: '#FFFFFF', // Default: white
        allowNull: false,
      }, { transaction });

      await queryInterface.addColumn('branding_settings', 'fontColorAccent', {
        type: Sequelize.DataTypes.STRING,
        defaultValue: '#3B82F6', // Default: Same as primary blue (will be updated by model hook later)
        allowNull: false, // Set allowNull based on your model definition
      }, { transaction });

      await transaction.commit();
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  },

  async down (queryInterface, Sequelize) {
    /**
     * Add reverting commands here.
     */
    const transaction = await queryInterface.sequelize.transaction();
    try {
      await queryInterface.removeColumn('branding_settings', 'fontColorDark', { transaction });
      await queryInterface.removeColumn('branding_settings', 'fontColorLight', { transaction });
      await queryInterface.removeColumn('branding_settings', 'fontColorAccent', { transaction });
      await transaction.commit();
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  }
};