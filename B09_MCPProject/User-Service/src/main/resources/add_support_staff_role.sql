-- ==========================================================
-- 增量脚本：新增 Supporting Staff 角色（SUPPORT_STAFF）
-- 适用于已有数据库，执行后请让相关用户重新登录以刷新 Redis 权限
-- ==========================================================

INSERT INTO `sys_role` (`id`, `role_code`, `role_name`, `data_scope`, `status`, `is_deleted`)
SELECT 'ROLE_000000000000000000000000006', 'SUPPORT_STAFF', 'Supporting Staff', 'ALL', 1, 0
WHERE NOT EXISTS (
    SELECT 1 FROM `sys_role` WHERE `role_code` = 'SUPPORT_STAFF'
);

INSERT INTO `sys_role_permission` (`role_id`, `permission_id`)
SELECT 'ROLE_000000000000000000000000006', 'PERM_000000000000000000000000012'
WHERE NOT EXISTS (
    SELECT 1 FROM `sys_role_permission`
    WHERE `role_id` = 'ROLE_000000000000000000000000006'
      AND `permission_id` = 'PERM_000000000000000000000000012'
);

INSERT INTO `sys_role_permission` (`role_id`, `permission_id`)
SELECT 'ROLE_000000000000000000000000006', 'PERM_000000000000000000000000002'
WHERE NOT EXISTS (
    SELECT 1 FROM `sys_role_permission`
    WHERE `role_id` = 'ROLE_000000000000000000000000006'
      AND `permission_id` = 'PERM_000000000000000000000000002'
);
