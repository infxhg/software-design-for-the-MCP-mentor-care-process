-- =============================================================================
-- 将挂在学院(FACULTY)或系(DEPARTMENT)下、但应挂在专业(MAJOR)下的 MCP 小组迁移到正确父节点
-- 执行库：Organizational-Service 使用的库（含 sys_org_unit、sys_user_org）
-- 执行前请备份 sys_org_unit
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 0) 预览：当前挂在非 MAJOR 父节点下的 GROUP
-- -----------------------------------------------------------------------------
SELECT g.id AS group_key,
       g.name AS group_label,
       g.parent_id,
       p.name AS parent_name,
       p.type AS parent_type,
       g.path
FROM sys_org_unit g
JOIN sys_org_unit p ON p.id = g.parent_id
WHERE g.type = 'GROUP'
  AND p.type IN ('FACULTY', 'DEPARTMENT')
ORDER BY g.name, g.id;

-- -----------------------------------------------------------------------------
-- 1) 按「组内学生绑定的 MAJOR」推断目标专业（多数票）
--    前提：学生已在 sys_user_org 绑定到 MAJOR（如 org_cst）
-- -----------------------------------------------------------------------------
DROP TEMPORARY TABLE IF EXISTS tmp_group_major_vote;
CREATE TEMPORARY TABLE tmp_group_major_vote AS
SELECT group_id,
       major_id,
       major_name,
       cnt
FROM (
    SELECT g.id AS group_id,
           maj.id AS major_id,
           maj.name AS major_name,
           COUNT(DISTINCT uo.user_id) AS cnt,
           ROW_NUMBER() OVER (PARTITION BY g.id ORDER BY COUNT(DISTINCT uo.user_id) DESC) AS rn
    FROM sys_org_unit g
    JOIN sys_org_unit parent ON parent.id = g.parent_id
    JOIN sys_user_org uo ON uo.org_unit_id = g.id
    JOIN sys_user_org sm ON sm.user_id = uo.user_id
    JOIN sys_org_unit maj ON maj.id = sm.org_unit_id AND maj.type = 'MAJOR'
    WHERE g.type = 'GROUP'
      AND parent.type IN ('FACULTY', 'DEPARTMENT')
    GROUP BY g.id, maj.id, maj.name
) ranked
WHERE rn = 1;

-- 预览将要迁移的行
SELECT g.id AS group_key,
       g.name AS group_label,
       g.parent_id AS old_parent_id,
       v.major_id AS new_parent_id,
       v.major_name,
       v.cnt AS student_votes
FROM sys_org_unit g
JOIN tmp_group_major_vote v ON v.group_id = g.id
ORDER BY g.name;

-- -----------------------------------------------------------------------------
-- 2) 执行迁移：更新 parent_id 与 path
-- -----------------------------------------------------------------------------
START TRANSACTION;

UPDATE sys_org_unit g
JOIN tmp_group_major_vote v ON v.group_id = g.id
JOIN sys_org_unit maj ON maj.id = v.major_id
SET g.parent_id = maj.id,
    g.path = CONCAT(IFNULL(maj.path, CONCAT('/', maj.id)), '/', g.id)
WHERE g.type = 'GROUP';

-- 可选：验证无 GROUP 仍直接挂在 FACULTY 下（有学生的组应已迁走）
-- SELECT g.id, g.name, p.type FROM sys_org_unit g JOIN sys_org_unit p ON p.id=g.parent_id
-- WHERE g.type='GROUP' AND p.type='FACULTY';

COMMIT;

DROP TEMPORARY TABLE IF EXISTS tmp_group_major_vote;

-- -----------------------------------------------------------------------------
-- 3) 仍挂在学院/系下、且组内无 MAJOR 票数的 GROUP → 需人工指定专业后单独 UPDATE
--    示例（仅当该组确定属于 CST）：
-- UPDATE sys_org_unit g
-- JOIN sys_org_unit maj ON maj.id = 'org_cst' AND maj.type = 'MAJOR'
-- SET g.parent_id = maj.id,
--     g.path = CONCAT(maj.path, '/', g.id)
-- WHERE g.type = 'GROUP' AND g.name = '2024-2025-Y1' AND g.parent_id = 'org_fst';
-- -----------------------------------------------------------------------------

-- -----------------------------------------------------------------------------
-- 4) 步骤 1 若 0 行：学生可能只在 mcp_student_ext 有 major，未绑定 sys_user_org→MAJOR
--    请直接执行同目录：migrate_groups_2024_y1_cst_from_fst.sql（按 groupKey 迁到 org_cst）
-- -----------------------------------------------------------------------------

-- -----------------------------------------------------------------------------
-- 5) 通用：凡 parent 为 FACULTY 且组内 ext 共识为单一 MAJOR 时（需能联库 mentoring）
--    将 mentoring_db 改为实际库名后取消注释
-- -----------------------------------------------------------------------------
/*
DROP TEMPORARY TABLE IF EXISTS tmp_group_major_from_ext;
CREATE TEMPORARY TABLE tmp_group_major_from_ext AS
SELECT e.group_key AS group_id,
       maj.id AS major_id
FROM mentoring_db.mcp_student_ext e
JOIN sys_org_unit g ON g.id = e.group_key AND g.type = 'GROUP'
JOIN sys_org_unit parent ON parent.id = g.parent_id AND parent.type = 'FACULTY'
JOIN sys_org_unit maj ON maj.type = 'MAJOR'
  AND (UPPER(maj.name) = UPPER(TRIM(e.major_id)) OR maj.id = TRIM(e.major_id))
WHERE e.group_key IS NOT NULL AND TRIM(e.group_key) <> ''
  AND e.major_id IS NOT NULL AND TRIM(e.major_id) <> ''
GROUP BY e.group_key, maj.id
HAVING COUNT(DISTINCT UPPER(TRIM(e.major_id))) = 1;

UPDATE sys_org_unit g
JOIN tmp_group_major_from_ext t ON t.group_id = g.id
JOIN sys_org_unit maj ON maj.id = t.major_id
SET g.parent_id = maj.id,
    g.path = CONCAT(IFNULL(maj.path, CONCAT('/', maj.id)), '/', g.id)
WHERE g.type = 'GROUP';
*/
