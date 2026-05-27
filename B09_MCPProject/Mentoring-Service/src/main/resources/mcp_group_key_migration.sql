-- 迁移：MCP 小组 groupKey（UUID）与 groupId（展示标签）分离
-- 执行前请备份 mentoring-service 库

ALTER TABLE `mcp_student_ext`
    ADD COLUMN IF NOT EXISTS `group_key` VARCHAR(32) NULL COMMENT 'sys_org_unit.id UUID' AFTER `group_id`;

ALTER TABLE `mcp_record`
    ADD COLUMN IF NOT EXISTS `group_key` VARCHAR(32) NULL COMMENT 'sys_org_unit.id UUID' AFTER `group_id`;

-- 旧数据：group_id 若已是 32 位 UUID，则回填 group_key
UPDATE `mcp_student_ext`
SET `group_key` = `group_id`
WHERE `group_key` IS NULL
  AND `group_id` REGEXP '^[0-9a-fA-F]{32}$';

UPDATE `mcp_record`
SET `group_key` = `group_id`
WHERE `group_key` IS NULL
  AND `group_id` REGEXP '^[0-9a-fA-F]{32}$';

-- Legacy：group_id 仍为组织节点主键（如 group_a1），与 sys_org_unit.id 一致时可直接回填
UPDATE `mcp_student_ext` AS e
INNER JOIN (
    SELECT `student_id` FROM `mcp_student_ext`
    WHERE `group_key` IS NULL AND `group_id` IS NOT NULL AND `group_id` = 'group_a1'
) AS t ON e.`student_id` = t.`student_id`
SET e.`group_key` = e.`group_id`
WHERE e.`group_key` IS NULL;

-- 新模型：group_id 为展示标签（如 2024-2025-Y1）时，需由 FC「加组员」接口写入 group_key；
-- 或从同 label+major 的已有学生行复制 group_key（需按业务手工 SQL）。
