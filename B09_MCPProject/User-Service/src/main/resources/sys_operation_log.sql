-- 系统操作日志表（Supporting Staff / Admin 查看）
CREATE TABLE IF NOT EXISTS `sys_operation_log` (
    `id`          VARCHAR(32)  NOT NULL PRIMARY KEY,
    `user_id`     VARCHAR(32)  NULL COMMENT '操作用户 ID',
    `username`    VARCHAR(100) NULL COMMENT '操作用户名',
    `action`      VARCHAR(64)  NOT NULL COMMENT '操作类型，如 LOGIN、VIEW_STUDENTS',
    `detail`      VARCHAR(500) NULL COMMENT '操作详情',
    `create_time` DATETIME     DEFAULT CURRENT_TIMESTAMP,
    INDEX `idx_user_id` (`user_id`),
    INDEX `idx_action` (`action`),
    INDEX `idx_create_time` (`create_time`)
) COMMENT '系统操作日志' COLLATE = utf8mb4_unicode_ci;
