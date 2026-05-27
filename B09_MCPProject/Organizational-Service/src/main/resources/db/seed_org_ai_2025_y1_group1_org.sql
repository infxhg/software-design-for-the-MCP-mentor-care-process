-- organization-service-database：org_ai 下 2025-2025-Y1（Group1）小组与成员绑定
USE `organization-service-database`;

SET @group_key = 'aabbccdd11112222333344445555ai01' COLLATE utf8mb4_unicode_ci;
SET @group_label = '2025-2025-Y1' COLLATE utf8mb4_unicode_ci;
SET @major_id = 'org_ai' COLLATE utf8mb4_unicode_ci;

INSERT IGNORE INTO sys_org_unit (id, name, type, parent_id, path, sort_order)
VALUES (@major_id, 'AI', 'MAJOR', 'org_dcs', '/org_fst/org_dcs/org_ai', 2);

INSERT INTO sys_org_unit (id, name, type, parent_id, path, sort_order)
SELECT @group_key, @group_label, 'GROUP', @major_id,
       CONCAT('/org_fst/org_dcs/org_ai/', @group_key), 1
WHERE NOT EXISTS (SELECT 1 FROM sys_org_unit WHERE id = @group_key);

INSERT INTO sys_user_org (user_id, org_unit_id, is_primary, create_time)
SELECT '202500009', @group_key, 1, NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM sys_user_org WHERE user_id = '202500009' AND org_unit_id = @group_key
);

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

SELECT g.id AS group_key, g.name AS group_label, p.id AS major_id, p.name AS major_name
FROM sys_org_unit g
JOIN sys_org_unit p ON p.id = g.parent_id
WHERE g.id = @group_key;

SELECT user_id, org_unit_id, is_primary
FROM sys_user_org
WHERE org_unit_id = @group_key OR (org_unit_id = @major_id AND user_id IN ('202500010','202500011','202500012','202500013','202500014'));
