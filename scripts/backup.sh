#!/bin/bash
# Backup script for Pulse360 PostgreSQL database

# Configuration
BACKUP_DIR="/backups"
POSTGRES_HOST=${POSTGRES_HOST:-db}
POSTGRES_DB=${POSTGRES_DB:-pulse360}
POSTGRES_USER=${POSTGRES_USER:-pulse360}
POSTGRES_PASSWORD=${POSTGRES_PASSWORD:-pulse360password}
BACKUP_RETENTION_DAYS=${BACKUP_RETENTION_DAYS:-7}

# Create backup directory if it doesn't exist
mkdir -p ${BACKUP_DIR}

# Set date format for backup files
DATE=$(date +"%Y-%m-%d_%H-%M-%S")
DAY_OF_WEEK=$(date +"%u")
MONTH_DAY=$(date +"%d")

echo "Starting backup of database ${POSTGRES_DB} at ${DATE}"

# Daily backup
BACKUP_FILE="${BACKUP_DIR}/${POSTGRES_DB}_${DATE}.sql.gz"
PGPASSWORD=${POSTGRES_PASSWORD} pg_dump -h ${POSTGRES_HOST} -U ${POSTGRES_USER} ${POSTGRES_DB} | gzip > ${BACKUP_FILE}

# Verify backup was successful
if [ $? -eq 0 ]; then
    echo "Backup completed successfully: ${BACKUP_FILE}"
    chmod 600 ${BACKUP_FILE}
    
    # Create symbolic links for day of week and month backups
    DAY_OF_WEEK_LINK="${BACKUP_DIR}/${POSTGRES_DB}_day_${DAY_OF_WEEK}.sql.gz"
    MONTH_DAY_LINK="${BACKUP_DIR}/${POSTGRES_DB}_month_${MONTH_DAY}.sql.gz"
    
    rm -f ${DAY_OF_WEEK_LINK}
    rm -f ${MONTH_DAY_LINK}
    
    ln -s ${BACKUP_FILE} ${DAY_OF_WEEK_LINK}
    ln -s ${BACKUP_FILE} ${MONTH_DAY_LINK}
    
    echo "Created cyclic backup links:"
    echo "  - Day of week (${DAY_OF_WEEK}): ${DAY_OF_WEEK_LINK}"
    echo "  - Day of month (${MONTH_DAY}): ${MONTH_DAY_LINK}"
else
    echo "Error performing backup"
    exit 1
fi

# Cleanup old backups
echo "Cleaning up backups older than ${BACKUP_RETENTION_DAYS} days"
find ${BACKUP_DIR} -name "${POSTGRES_DB}_*.sql.gz" -type f -mtime +${BACKUP_RETENTION_DAYS} -delete

# Count remaining backups
BACKUP_COUNT=$(find ${BACKUP_DIR} -name "${POSTGRES_DB}_*.sql.gz" -type f | wc -l)
echo "Backup retention: ${BACKUP_COUNT} backups remain"

# Backup list
echo "Available backups:"
ls -la ${BACKUP_DIR}

echo "Backup process completed at $(date +"%Y-%m-%d %H:%M:%S")"