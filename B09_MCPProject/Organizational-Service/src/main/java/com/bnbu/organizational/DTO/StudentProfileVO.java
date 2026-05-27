package com.bnbu.organizational.DTO;

import lombok.Data;

/**
 * FC / Coordinator 查询学生完整档案：User-Service 基本信息 + Mentoring 专业/状态。
 */
@Data
public class StudentProfileVO {
    /** 学号 / sys_user.id */
    private String studentId;
    private String username;
    /** 真实姓名（realName） */
    private String name;
    private String email;
    private String phone;
    /** MCP 分配状态，如 Normal / ACTIVE；无 ext 时回退账号状态描述 */
    private String status;
    /** 专业代码，如 CST / AI */
    private String major;
    /** 小组展示标签，如 2024-2025-Y1 */
    private String groupId;
    /** 小组 UUID（groupKey） */
    private String groupKey;
}
