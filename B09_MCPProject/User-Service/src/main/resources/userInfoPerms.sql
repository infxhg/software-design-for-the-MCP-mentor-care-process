INSERT IGNORE INTO sys_permission (id, perm_code, perm_name, type, status, is_deleted)
VALUES
    (REPLACE(UUID(), '-', ''), 'user:info', '获取个人信息', 'API', 1, 0),
    (REPLACE(UUID(), '-', ''), 'user:update', '修改个人信息', 'API', 1, 0);


-- ==========================================================
-- 第二步：给系统中的【所有角色】绑定这两个权限
-- 假设角色表名为 sys_role，且主键为 id
-- ==========================================================
INSERT IGNORE INTO sys_role_permission (role_id, permission_id)
SELECT r.id, p.id
FROM sys_role r
         CROSS JOIN sys_permission p
WHERE p.perm_code IN ('user:info', 'user:update');

-- ==========================================================
-- 第三步：查验一下结果，看看绑定是否成功
-- ==========================================================
SELECT r.role_name AS '角色名', p.perm_name AS '拥有的权限', p.perm_code AS '权限标识'
FROM sys_role r
         JOIN sys_role_permission rp ON r.id = rp.role_id
         JOIN sys_permission p ON rp.permission_id = p.id
WHERE p.perm_code IN ('user:info', 'user:update');
