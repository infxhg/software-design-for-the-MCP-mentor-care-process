-- 从 Mentoringinitialization 旧表结构迁移到新结构（仅在已有 unit_id/unit_type 表时执行）

-- 1) 若无数据且可删表，更简单：DROP TABLE sys_org_unit; 然后执行 org_schema.sql

-- 2) 保留数据时（按需手工执行，MySQL 8+）：
-- ALTER TABLE sys_org_unit CHANGE COLUMN unit_id id VARCHAR(32) NOT NULL;
-- ALTER TABLE sys_org_unit ADD COLUMN type VARCHAR(32) NULL AFTER name;
-- UPDATE sys_org_unit SET type = CASE unit_type WHEN 1 THEN 'FACULTY' WHEN 2 THEN 'DEPARTMENT' WHEN 3 THEN 'MAJOR' ELSE 'FACULTY' END;
-- ALTER TABLE sys_org_unit DROP COLUMN unit_type;
-- ALTER TABLE sys_org_unit ADD COLUMN path VARCHAR(255) NULL;
-- ALTER TABLE sys_org_unit ADD COLUMN sort_order INT DEFAULT 0;
