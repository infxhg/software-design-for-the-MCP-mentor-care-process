-- 将仍挂在 org_fst 下的 2024-2025-Y1 小组迁到 org_cst（根据你当前环境里的 groupKey）
-- 执行前备份；执行库 = Organizational-Service

-- 预览
SELECT g.id, g.name, g.parent_id, p.name AS parent_name, p.type AS parent_type, g.path
FROM sys_org_unit g
JOIN sys_org_unit p ON p.id = g.parent_id
WHERE g.id IN (
    'aabbccdd11112222333344445555aa01',
    'aabbccdd11112222333344445555bb02'
);

START TRANSACTION;

UPDATE sys_org_unit g
JOIN sys_org_unit maj ON maj.id = 'org_cst' AND maj.type = 'MAJOR'
SET g.parent_id = maj.id,
    g.path = CONCAT(IFNULL(maj.path, '/org_fst/org_dcs/org_cst'), '/', g.id)
WHERE g.type = 'GROUP'
  AND g.id IN (
    'aabbccdd11112222333344445555aa01',
    'aabbccdd11112222333344445555bb02'
  );

COMMIT;

-- 验证：这两组的 parent 应为 MAJOR / CST
SELECT g.id, g.name, g.parent_id, p.name, p.type, g.path
FROM sys_org_unit g
JOIN sys_org_unit p ON p.id = g.parent_id
WHERE g.id IN (
    'aabbccdd11112222333344445555aa01',
    'aabbccdd11112222333344445555bb02'
);
