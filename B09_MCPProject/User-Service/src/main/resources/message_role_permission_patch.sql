-- 已有库增量：为 Coordinator / Faculty Consultant 开通站内消息权限
-- 执行后需让用户重新登录以刷新 Token 中的权限

INSERT IGNORE INTO `sys_role_permission` (`role_id`, `permission_id`) VALUES
('ROLE_000000000000000000000000002', 'PERM_000000000000000000000000021'),
('ROLE_000000000000000000000000003', 'PERM_000000000000000000000000021');
