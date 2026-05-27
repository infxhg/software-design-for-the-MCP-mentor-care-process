-- common-user：AI 专业 2025-2025-Y1 组账号（id > 202500008）
USE `common-user`;

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
