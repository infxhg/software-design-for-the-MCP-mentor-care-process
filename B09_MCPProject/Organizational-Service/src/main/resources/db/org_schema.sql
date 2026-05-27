-- organization-service-database 使用（与 SysOrgUnit 实体、AdminOrgService 一致）
-- 若表已存在且列为 unit_id/unit_type，请先备份后执行 migrate_org_unit.sql

CREATE TABLE IF NOT EXISTS sys_org_unit (
    id          VARCHAR(32)  NOT NULL PRIMARY KEY COMMENT '组织节点ID',
    name        VARCHAR(100) NOT NULL COMMENT '名称',
    type        VARCHAR(32)  NOT NULL COMMENT 'FACULTY | DEPARTMENT | MAJOR | GROUP',
    parent_id   VARCHAR(32)  NULL COMMENT '父节点ID，学院为 NULL',
    path        VARCHAR(255) NULL COMMENT '层级路径',
    sort_order  INT          DEFAULT 0,
    create_time DATETIME     DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_parent (parent_id),
    INDEX idx_type (type)
) COMMENT '组织架构表' COLLATE = utf8mb4_unicode_ci;

-- 可选种子数据（与 User-Service/orgANDUnit.sql 一致）
INSERT IGNORE INTO sys_org_unit (id, name, type, parent_id, path, sort_order) VALUES
('org_fst',  'FST',  'FACULTY', NULL, '/org_fst',  1),
('org_fhss', 'FHSS', 'FACULTY', NULL, '/org_fhss', 2),
('org_fsm',  'FSM',  'FACULTY', NULL, '/org_fsm',  3),
('org_dcc',  'DCC',  'FACULTY', NULL, '/org_dcc',  4),
('org_dcs',  'DCS',  'DEPARTMENT', 'org_fst', '/org_fst/org_dcs', 1),
('org_cst',  'CST',  'MAJOR', 'org_dcs', '/org_fst/org_dcs/org_cst', 1),
('org_ai',   'AI',   'MAJOR', 'org_dcs', '/org_fst/org_dcs/org_ai',  2);

-- MCP 小组示例（groupId 即组织节点 id）
INSERT IGNORE INTO sys_org_unit (id, name, type, parent_id, path, sort_order) VALUES
('group_a1', 'Group A1', 'GROUP', 'org_dcs', '/org_fst/org_dcs/group_a1', 1);
