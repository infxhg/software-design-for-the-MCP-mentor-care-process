-- 组织单元表：存储学院、系、专业的层级信息
-- 对应文档 3.2.14 Organization unit [cite: 454]
CREATE TABLE sys_org_unit (
                              unit_id     VARCHAR(32) PRIMARY KEY COMMENT '组织节点唯一ID',
                              name        VARCHAR(100) NOT NULL COMMENT '名称 (如: FST, DCS, CST)',
                              parent_id   VARCHAR(32)  DEFAULT '0' COMMENT '父节点ID (学院的父节点为0)',
                              unit_type   TINYINT      NOT NULL COMMENT '类型: 1-Faculty(学院), 2-Department(系), 3-Major(专业)',
                              create_time DATETIME     DEFAULT CURRENT_TIMESTAMP
) COMMENT '组织架构表' COLLATE = utf8mb4_unicode_ci;

-- 用户组织绑定表：建立用户(Student/Mentor/Coordinator)与组织单元的关联
-- 这样你就不需要在这个库重复建用户信息表 [cite: 873, 930]
CREATE TABLE sys_user_org (
                              user_id     VARCHAR(32) NOT NULL COMMENT '用户ID (关联Common-user库)',
                              org_unit_id VARCHAR(32) NOT NULL COMMENT '组织节点ID (关联sys_org_unit)',
                              is_primary  TINYINT DEFAULT 1 COMMENT '是否主归属: 0否 1是',
                              create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
                              PRIMARY KEY (user_id, org_unit_id),
                              INDEX idx_org_id (org_unit_id)
) COMMENT '用户组织绑定表' COLLATE = utf8mb4_unicode_ci;

-- 用户角色表：存储用户在组织中的角色权限
CREATE TABLE sys_user_role (
                               user_id     VARCHAR(32) NOT NULL COMMENT '用户ID',
                               role_id     VARCHAR(32) NOT NULL COMMENT '角色ID (如: Administrator, Mentor, Student)',
                               create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
                               PRIMARY KEY (user_id, role_id),
                               INDEX idx_role_id (role_id)
) COMMENT '用户角色关联表' COLLATE = utf8mb4_unicode_ci;