CREATE TABLE IF NOT EXISTS `sys_feedback` (
    `id`          VARCHAR(32)  NOT NULL PRIMARY KEY,
    `user_id`     VARCHAR(32)  NOT NULL,
    `content`     TEXT         NOT NULL,
    `create_time` DATETIME     DEFAULT CURRENT_TIMESTAMP
) COMMENT '用户反馈' COLLATE = utf8mb4_unicode_ci;
