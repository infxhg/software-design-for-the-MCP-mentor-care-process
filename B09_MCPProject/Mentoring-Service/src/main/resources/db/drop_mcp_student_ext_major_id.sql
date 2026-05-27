-- 删除 mcp_student_ext.major_id（专业由组织树 + group_key 表达）。
-- 兼容不支持 DROP COLUMN IF EXISTS 的 MySQL（如 5.7、8.0 早期）。

SET @db = DATABASE();
SET @sql = (
    SELECT IF(
        EXISTS (
            SELECT 1 FROM information_schema.COLUMNS
            WHERE TABLE_SCHEMA = @db
              AND TABLE_NAME = 'mcp_student_ext'
              AND COLUMN_NAME = 'major_id'
        ),
        'ALTER TABLE `mcp_student_ext` DROP COLUMN `major_id`',
        'SELECT ''column major_id already absent'' AS notice'
    )
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
