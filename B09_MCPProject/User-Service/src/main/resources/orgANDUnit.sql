-- =======================================================
-- BNBU 组织架构元数据 (Metadata) 初始化脚本
-- 说明：仅包含系统最基础的骨架，不包含任何人员绑定和导师组
-- =======================================================

-- 1. 写入 Faculty (学部) 层级数据
-- 文档明确指出目前有四个学部：FST, FHSS, FSM, DCC [cite: 21]
INSERT INTO sys_org_unit (id, name, type, parent_id, path, sort_order) VALUES
                                                                           ('org_fst',  'FST',  'FACULTY', NULL, '/org_fst',  1),
                                                                           ('org_fhss', 'FHSS', 'FACULTY', NULL, '/org_fhss', 2),
                                                                           ('org_fsm',  'FSM',  'FACULTY', NULL, '/org_fsm',  3),
                                                                           ('org_dcc',  'DCC',  'FACULTY', NULL, '/org_dcc',  4);

-- 2. 写入 Department (系) 层级数据
-- 根据 Appendix A，FST 学部下目前已知有 DCS 系 [cite: 107]
INSERT INTO sys_org_unit (id, name, type, parent_id, path, sort_order) VALUES
    ('org_dcs', 'DCS', 'DEPARTMENT', 'org_fst', '/org_fst/org_dcs', 1);

-- 3. 写入 Major (专业) 层级数据
-- 根据 Appendix A，DCS 系下目前已知有 CST 和 AI 两个专业 [cite: 107]
INSERT INTO sys_org_unit (id, name, type, parent_id, path, sort_order) VALUES
                                                                           ('org_cst', 'CST', 'MAJOR', 'org_dcs', '/org_fst/org_dcs/org_cst', 1),
                                                                           ('org_ai',  'AI',  'MAJOR', 'org_dcs', '/org_fst/org_dcs/org_ai',  2);

-- =======================================================
