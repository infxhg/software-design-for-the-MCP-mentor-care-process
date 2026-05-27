-- 在 organization-service-database 执行
-- 用途：为已存在但缺少列的 sys_org_unit 表补齐字段（解决 Unknown column 'path'）
-- 若某条 ALTER 报 Duplicate column，说明该列已有，跳过即可

-- 请在客户端选中库：organization-service-database
-- 先查看当前结构：DESCRIBE sys_org_unit;

-- 若主键仍是 unit_id，先执行（仅当 DESCRIBE 显示 unit_id 时）：
-- ALTER TABLE sys_org_unit CHANGE COLUMN unit_id id VARCHAR(32) NOT NULL;

-- 若仍是 unit_type 而无 type，先执行（仅当无 type 列时）：
-- ALTER TABLE sys_org_unit ADD COLUMN type VARCHAR(32) NULL AFTER name;
-- UPDATE sys_org_unit SET type = CASE unit_type WHEN 1 THEN 'FACULTY' WHEN 2 THEN 'DEPARTMENT' WHEN 3 THEN 'MAJOR' ELSE 'FACULTY' END WHERE type IS NULL;
-- ALTER TABLE sys_org_unit MODIFY COLUMN type VARCHAR(32) NOT NULL;
-- ALTER TABLE sys_org_unit DROP COLUMN unit_type;

ALTER TABLE sys_org_unit ADD COLUMN path VARCHAR(255) NULL COMMENT '层级路径' AFTER parent_id;
ALTER TABLE sys_org_unit ADD COLUMN sort_order INT DEFAULT 0 COMMENT '排序' AFTER path;
ALTER TABLE sys_org_unit ADD COLUMN create_time DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间';

-- 补齐后再插入种子数据
INSERT IGNORE INTO sys_org_unit (id, name, type, parent_id, path, sort_order) VALUES
('org_fst',  'FST',  'FACULTY', NULL, '/org_fst',  1),
('org_fhss', 'FHSS', 'FACULTY', NULL, '/org_fhss', 2),
('org_fsm',  'FSM',  'FACULTY', NULL, '/org_fsm',  3),
('org_dcc',  'DCC',  'FACULTY', NULL, '/org_dcc',  4),
('org_dcs',  'DCS',  'DEPARTMENT', 'org_fst', '/org_fst/org_dcs', 1),
('org_cst',  'CST',  'MAJOR', 'org_dcs', '/org_fst/org_dcs/org_cst', 1),
('org_ai',   'AI',   'MAJOR', 'org_dcs', '/org_fst/org_dcs/org_ai',  2);
