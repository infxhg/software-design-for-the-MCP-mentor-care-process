-- ==========================================================
-- 测试账号：Administrator + Supporting Staff + Faculty Consultant
-- 默认密码均为：123456（MD5: e10adc3949ba59abbe56e057f20f883e）
--
-- 执行顺序：
--   1. add_support_staff_role.sql（若尚未执行）
--   2. 本脚本
-- 执行后请用对应账号重新登录，以刷新 Redis 中的 ROLE_* 权限
-- ==========================================================

-- ---------- Administrator ----------
INSERT INTO `sys_user` (`id`, `username`, `password_hash`, `real_name`, `phone`, `email`, `status`, `is_deleted`)
SELECT '880000000', 'test_admin', 'e10adc3949ba59abbe56e057f20f883e', 'Test Administrator', '13800000000',
       'test_admin@mail.bnbu.edu.cn', 1, 0
WHERE NOT EXISTS (SELECT 1 FROM `sys_user` WHERE `id` = '880000000' OR `username` = 'test_admin');

INSERT INTO `sys_user_role` (`user_id`, `role_id`)
SELECT '880000000', 'ROLE_000000000000000000000000001'
WHERE NOT EXISTS (
    SELECT 1 FROM `sys_user_role`
    WHERE `user_id` = '880000000' AND `role_id` = 'ROLE_000000000000000000000000001'
);

-- ---------- Supporting Staff ----------
INSERT INTO `sys_user` (`id`, `username`, `password_hash`, `real_name`, `phone`, `email`, `status`, `is_deleted`)
SELECT '880000001', 'test_support', 'e10adc3949ba59abbe56e057f20f883e', 'Test Supporting Staff', '13800000001',
       'test_support@mail.bnbu.edu.cn', 1, 0
WHERE NOT EXISTS (SELECT 1 FROM `sys_user` WHERE `id` = '880000001' OR `username` = 'test_support');

INSERT INTO `sys_user_role` (`user_id`, `role_id`)
SELECT '880000001', 'ROLE_000000000000000000000000006'
WHERE NOT EXISTS (
    SELECT 1 FROM `sys_user_role`
    WHERE `user_id` = '880000001' AND `role_id` = 'ROLE_000000000000000000000000006'
);

-- ---------- Faculty Consultant ----------
INSERT INTO `sys_user` (`id`, `username`, `password_hash`, `real_name`, `phone`, `email`, `status`, `is_deleted`)
SELECT '880000002', 'test_fc', 'e10adc3949ba59abbe56e057f20f883e', 'Test Faculty Consultant', '13800000002',
       'test_fc@mail.bnbu.edu.cn', 1, 0
WHERE NOT EXISTS (SELECT 1 FROM `sys_user` WHERE `id` = '880000002' OR `username` = 'test_fc');

INSERT INTO `sys_user_role` (`user_id`, `role_id`)
SELECT '880000002', 'ROLE_000000000000000000000000002'
WHERE NOT EXISTS (
    SELECT 1 FROM `sys_user_role`
    WHERE `user_id` = '880000002' AND `role_id` = 'ROLE_000000000000000000000000002'
);
