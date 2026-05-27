package com.bnbu.organizational.DTO;

import lombok.Data;

@Data
public class EnsureMcpGroupRequest {
    /** 小组 ID，即 sys_org_unit.id */
    private String groupId;
    private String mentorId;
    /** 父组织：必须为 MAJOR 节点 id（如 org_cst）或专业代码（如 CST），新建 GROUP 只能挂在专业下 */
    private String parentOrgId;
    private String displayName;
}
