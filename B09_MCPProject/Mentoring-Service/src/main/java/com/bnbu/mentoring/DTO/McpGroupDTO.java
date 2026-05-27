package com.bnbu.mentoring.DTO;

import lombok.Data;

/**
 * MCP 小组（来自组织服务 sys_org_unit + sys_user_org）
 */
@Data
public class McpGroupDTO {
    /** 展示标签，如 2024-2025-Y1（与 groupLabel / name 相同） */
    private String groupId;
    private String name;
    /** 组织 UUID（sys_org_unit.id） */
    private String groupKey;
    /** 展示标签，与 groupId 相同 */
    private String groupLabel;
    private String parentId;
    private String facultyOrgId;
    private String mentorId;
    /** 所属专业展示名（组织树 MAJOR.name，如 CST），由服务层解析填充 */
    private String major;
}
