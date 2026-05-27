-- =============================================================================
-- org_ai 专业下：2025-2025-Y1（展示名 Group1）小组 + 导师/学生
-- 固定 group_key（32 位 UUID，无连字符）便于幂等与 by-key 接口
--
-- 执行顺序（三个库）：
--   1) common-user              → 本文件 PART 1
--   2) organization-service-database → PART 2
--   3) mentoring-service          → PART 3
--
-- 账号默认密码：123456（MD5: e10adc3949ba59abbe56e057f20f883e）
-- 用户 id 均 > 202500008，9 位纯数字
-- =============================================================================

-- --------------- PART 1：common-user ---------------
-- USE `common-user`;

-- 导师
INSERT INTO `sys_user` (`id`, `username`, `password_hash`, `real_name`, `phone`, `email`, `status`, `is_deleted`)
SELECT '202500009', '202500009', 'e10adc3949ba59abbe56e057f20f883e', 'AI Mentor 202500009', '13820250009',
       '202500009@mail.bnbu.edu.cn', 1, 0
WHERE NOT EXISTS (SELECT 1 FROM `sys_user` WHERE `id` = '202500009');

INSERT INTO `sys_user_role` (`user_id`, `role_id`)
SELECT '202500009', 'ROLE_000000000000000000000000004'
WHERE NOT EXISTS (
    SELECT 1 FROM `sys_user_role`
    WHERE `user_id` = '202500009' AND `role_id` = 'ROLE_000000000000000000000000004'
);

-- 学生 202500010 ~ 202500014
INSERT INTO `sys_user` (`id`, `username`, `password_hash`, `real_name`, `phone`, `email`, `status`, `is_deleted`)
SELECT v.id, v.id, 'e10adc3949ba59abbe56e057f20f883e', v.real_name, v.phone, v.email, 1, 0
FROM (
    SELECT '202500010' AS id, 'AI Student 202500010' AS real_name, '13820250010' AS phone, '202500010@mail.bnbu.edu.cn' AS email
    UNION ALL SELECT '202500011', 'AI Student 202500011', '13820250011', '202500011@mail.bnbu.edu.cn'
    UNION ALL SELECT '202500012', 'AI Student 202500012', '13820250012', '202500012@mail.bnbu.edu.cn'
    UNION ALL SELECT '202500013', 'AI Student 202500013', '13820250013', '202500013@mail.bnbu.edu.cn'
    UNION ALL SELECT '202500014', 'AI Student 202500014', '13820250014', '202500014@mail.bnbu.edu.cn'
) AS v
WHERE NOT EXISTS (SELECT 1 FROM `sys_user` u WHERE u.`id` = v.id);

INSERT INTO `sys_user_role` (`user_id`, `role_id`)
SELECT v.id, 'ROLE_000000000000000000000000005'
FROM (
    SELECT '202500010' AS id UNION ALL SELECT '202500011' UNION ALL SELECT '202500012'
    UNION ALL SELECT '202500013' UNION ALL SELECT '202500014'
) AS v
WHERE NOT EXISTS (
    SELECT 1 FROM `sys_user_role` r
    WHERE r.`user_id` = v.id AND r.`role_id` = 'ROLE_000000000000000000000000005'
);

-- --------------- PART 2：organization-service-database ---------------
-- USE `organization-service-database`;

SET @group_key = 'aabbccdd11112222333344445555ai01';
SET @group_label = '2025-2025-Y1';
SET @group_display = 'Group1';
SET @major_id = 'org_ai';

-- 确保专业存在
INSERT IGNORE INTO sys_org_unit (id, name, type, parent_id, path, sort_order)
VALUES (@major_id, 'AI', 'MAJOR', 'org_dcs', '/org_fst/org_dcs/org_ai', 2);

-- 小组：name 用展示标签 2025-2025-Y1（与 GET search?groupId= 一致）；Group1 写在 path 注释外由业务识别为第 1 组
INSERT INTO sys_org_unit (id, name, type, parent_id, path, sort_order)
SELECT @group_key, @group_label, 'GROUP', @major_id,
       CONCAT('/org_fst/org_dcs/org_ai/', @group_key), 1
WHERE NOT EXISTS (SELECT 1 FROM sys_org_unit WHERE id = @group_key);

-- 若已存在但 parent 不对，可手工修正：
-- UPDATE sys_org_unit SET parent_id=@major_id, path=CONCAT('/org_fst/org_dcs/org_ai/', id) WHERE id=@group_key;

-- 导师 → 小组
INSERT INTO sys_user_org (user_id, org_unit_id, is_primary, create_time)
SELECT '202500009', @group_key, 1, NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM sys_user_org WHERE user_id = '202500009' AND org_unit_id = @group_key
);

-- 学生 → 专业（主归属）+ 小组
INSERT INTO sys_user_org (user_id, org_unit_id, is_primary, create_time)
SELECT s.id, @major_id, 1, NOW()
FROM (
    SELECT '202500010' AS id UNION ALL SELECT '202500011' UNION ALL SELECT '202500012'
    UNION ALL SELECT '202500013' UNION ALL SELECT '202500014'
) AS s
WHERE NOT EXISTS (
    SELECT 1 FROM sys_user_org uo WHERE uo.user_id = s.id AND uo.org_unit_id = @major_id
);

INSERT INTO sys_user_org (user_id, org_unit_id, is_primary, create_time)
SELECT s.id, @group_key, 0, NOW()
FROM (
    SELECT '202500010' AS id UNION ALL SELECT '202500011' UNION ALL SELECT '202500012'
    UNION ALL SELECT '202500013' UNION ALL SELECT '202500014'
) AS s
WHERE NOT EXISTS (
    SELECT 1 FROM sys_user_org uo WHERE uo.user_id = s.id AND uo.org_unit_id = @group_key
);

-- --------------- PART 3：mentoring-service ---------------
-- USE `mentoring-service`;

SET @group_key = 'aabbccdd11112222333344445555ai01';
SET @group_label = '2025-2025-Y1';

INSERT INTO mcp_student_ext (student_id, status, group_id, group_key, update_time)
SELECT s.id, 'Normal', @group_label, @group_key, NOW()
FROM (
    SELECT '202500010' AS id UNION ALL SELECT '202500011' UNION ALL SELECT '202500012'
    UNION ALL SELECT '202500013' UNION ALL SELECT '202500014'
) AS s
ON DUPLICATE KEY UPDATE
    status = VALUES(status),
    group_id = VALUES(group_id),
    group_key = VALUES(group_key),
    update_time = NOW();

-- 验证（在 organization-service-database 执行）：
-- SELECT g.id, g.name, g.parent_id, p.name AS major_name
-- FROM sys_org_unit g JOIN sys_org_unit p ON p.id = g.parent_id WHERE g.id = 'aabbccdd11112222333344445555ai01';
-- SELECT user_id, org_unit_id FROM sys_user_org WHERE org_unit_id = 'aabbccdd11112222333344445555ai01';
