-- ==========================================================
-- 1. 初始化【角色表 sys_role】
-- 根据 MCP 的组织架构，设置 5 个核心角色及其数据范围
-- ==========================================================
DELETE FROM sys_role; -- 清理旧数据（仅限开发环境）

INSERT INTO `sys_role` (`id`, `role_code`, `role_name`, `data_scope`, `status`, `is_deleted`) VALUES
                                                                                                  ('ROLE_000000000000000000000000001', 'ADMIN', '系统管理员', 'ALL', 1, 0),
                                                                                                  ('ROLE_000000000000000000000000002', 'FACULTY_CONSULTANT', '院级顾问', 'DEPT', 1, 0),
                                                                                                  ('ROLE_000000000000000000000000003', 'COORDINATOR', '系协调员', 'MAJOR', 1, 0),
                                                                                                  ('ROLE_000000000000000000000000004', 'MENTOR', 'MCP导师', 'MCP', 1, 0),
                                                                                                  ('ROLE_000000000000000000000000005', 'STUDENT', '学生', 'SELF', 1, 0);


-- ==========================================================
-- 2. 初始化【权限表 sys_permission】
-- 提取自系统核心用例，分为：系统级、组织级、业务级操作
-- ==========================================================
DELETE FROM sys_permission;

INSERT INTO `sys_permission` (`id`, `perm_code`, `perm_name`, `type`, `status`, `is_deleted`) VALUES
-- 【系统管理相关】
('PERM_000000000000000000000000001', 'system:setup', '系统初始化设置', 'API', 1, 0),
('PERM_000000000000000000000000002', 'log:view', '查看系统操作日志', 'API', 1, 0),

-- 【组织与人员管理相关】
('PERM_000000000000000000000000010', 'data:import', '批量导入基础数据', 'API', 1, 0),
('PERM_000000000000000000000000011', 'mentor:change', '更换学生归属导师', 'API', 1, 0),
('PERM_000000000000000000000000012', 'user:search', '检索师生信息', 'API', 1, 0),

-- 【MCP 核心业务相关】
('PERM_000000000000000000000000020', 'appointment:create', '发起面谈预约', 'API', 1, 0),
('PERM_000000000000000000000000021', 'message:communicate', '发送系统消息', 'API', 1, 0),
('PERM_000000000000000000000000022', 'record:edit', '编辑访谈记录', 'API', 1, 0),
('PERM_000000000000000000000000023', 'case:forward', '转发/上报异常案例', 'API', 1, 0),
('PERM_000000000000000000000000024', 'record:export', '导出访谈记录Word', 'API', 1, 0);


-- ==========================================================
-- 3. 初始化【角色-权限关联表 sys_role_permission】
-- 为不同层级的角色分配对应的菜单/按钮权限
-- ==========================================================
DELETE FROM sys_role_permission;

-- 3.1【管理员 ADMIN】：拥有系统设置、查看日志等最高权限
INSERT INTO `sys_role_permission` (`role_id`, `permission_id`) VALUES
                                                                   ('ROLE_000000000000000000000000001', 'PERM_000000000000000000000000001'), -- system:setup
                                                                   ('ROLE_000000000000000000000000001', 'PERM_000000000000000000000000002'); -- log:view

-- 3.2【院级顾问 FACULTY_CONSULTANT】：统筹和数据维护
INSERT INTO `sys_role_permission` (`role_id`, `permission_id`) VALUES
                                                                   ('ROLE_000000000000000000000000002', 'PERM_000000000000000000000000010'), -- data:import
                                                                   ('ROLE_000000000000000000000000002', 'PERM_000000000000000000000000011'), -- mentor:change
                                                                   ('ROLE_000000000000000000000000002', 'PERM_000000000000000000000000012'), -- user:search
                                                                   ('ROLE_000000000000000000000000002', 'PERM_000000000000000000000000024'); -- record:export

-- 3.3【系协调员 COORDINATOR】：系内协调和特殊案例处理
INSERT INTO `sys_role_permission` (`role_id`, `permission_id`) VALUES
                                                                   ('ROLE_000000000000000000000000003', 'PERM_000000000000000000000000012'), -- user:search
                                                                   ('ROLE_000000000000000000000000003', 'PERM_000000000000000000000000022'), -- record:edit
                                                                   ('ROLE_000000000000000000000000003', 'PERM_000000000000000000000000023'), -- case:forward
                                                                   ('ROLE_000000000000000000000000003', 'PERM_000000000000000000000000024'); -- record:export

-- 3.4【MCP导师 MENTOR】：一线学生关怀和记录
INSERT INTO `sys_role_permission` (`role_id`, `permission_id`) VALUES
                                                                   ('ROLE_000000000000000000000000004', 'PERM_000000000000000000000000012'), -- user:search
                                                                   ('ROLE_000000000000000000000000004', 'PERM_000000000000000000000000020'), -- appointment:create
                                                                   ('ROLE_000000000000000000000000004', 'PERM_000000000000000000000000021'), -- message:communicate
                                                                   ('ROLE_000000000000000000000000004', 'PERM_000000000000000000000000022'), -- record:edit
                                                                   ('ROLE_000000000000000000000000004', 'PERM_000000000000000000000000023'), -- case:forward
                                                                   ('ROLE_000000000000000000000000004', 'PERM_000000000000000000000000024'); -- record:export

-- 3.5【学生 STUDENT】：拥有最基础的互动权限
INSERT INTO `sys_role_permission` (`role_id`, `permission_id`) VALUES
                                                                   ('ROLE_000000000000000000000000005', 'PERM_000000000000000000000000020'), -- appointment:create
                                                                   ('ROLE_000000000000000000000000005', 'PERM_000000000000000000000000021'); -- message:communicate