-- mcp_student_ext.status 统一为 normal | suspended | probation（小写）
USE `mentoring-service`;

UPDATE `mcp_student_ext`
SET `status` = CASE
    WHEN LOWER(TRIM(`status`)) IN ('normal', 'active') THEN 'normal'
    WHEN LOWER(TRIM(`status`)) = 'suspended' THEN 'suspended'
    WHEN LOWER(TRIM(`status`)) = 'probation' THEN 'probation'
    ELSE `status`
END
WHERE `status` IS NOT NULL;

-- 仍为 NULL 的行补默认
UPDATE `mcp_student_ext`
SET `status` = 'normal'
WHERE `status` IS NULL OR TRIM(`status`) = '';

SELECT `status`, COUNT(*) AS cnt FROM `mcp_student_ext` GROUP BY `status`;
