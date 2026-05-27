-- Mentoring-Service 扩展表
-- MCP 小组不在此库：使用 organization-service 的 sys_org_unit(type=GROUP) + sys_user_org
-- 学生扩展 mcp_student_ext、访谈 mcp_record 请按实体类单独建表（若库中尚无）

CREATE TABLE IF NOT EXISTS `mcp_case` (
    `case_id`        VARCHAR(32)  NOT NULL PRIMARY KEY,
    `student_id`     VARCHAR(32)  NOT NULL,
    `submitter_id`   VARCHAR(32)  NOT NULL COMMENT 'Mentor',
    `coordinator_id` VARCHAR(32)  NULL,
    `consultant_id`  VARCHAR(32)  NULL,
    `description`    TEXT         NOT NULL,
    `status`         VARCHAR(32)  NOT NULL COMMENT 'SUBMITTED,AT_COORDINATOR,AT_CONSULTANT,CLOSED',
    `create_time`    DATETIME     DEFAULT CURRENT_TIMESTAMP,
    `update_time`    DATETIME     DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) COMMENT '案例转发';

CREATE TABLE IF NOT EXISTS `mcp_appointment_slot` (
    `slot_id`     VARCHAR(32)  NOT NULL PRIMARY KEY,
    `mentor_id`   VARCHAR(32)  NOT NULL,
    `student_id`  VARCHAR(32)  NULL,
    `slot_date`   DATE         NOT NULL,
    `start_time`  VARCHAR(8)   NOT NULL COMMENT 'HH:mm',
    `end_time`    VARCHAR(8)   NOT NULL COMMENT 'HH:mm',
    `venue`       VARCHAR(200) NULL,
    `status`      VARCHAR(20)  NOT NULL DEFAULT 'AVAILABLE' COMMENT 'AVAILABLE,BOOKED,CANCELLED',
    `create_time` DATETIME     DEFAULT CURRENT_TIMESTAMP,
    INDEX `idx_mentor_date` (`mentor_id`, `slot_date`)
) COMMENT '面谈预约时段';
