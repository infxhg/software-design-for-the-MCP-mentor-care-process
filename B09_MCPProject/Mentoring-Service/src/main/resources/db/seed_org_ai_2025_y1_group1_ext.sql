-- mentoring-service：学生 ext（group_id 展示标签 + group_key UUID）
USE `mentoring-service`;

SET @group_key = 'aabbccdd11112222333344445555ai01' COLLATE utf8mb4_unicode_ci;
SET @group_label = '2025-2025-Y1' COLLATE utf8mb4_unicode_ci;

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

SELECT student_id, status, group_id, group_key FROM mcp_student_ext
WHERE group_key = @group_key;
