package com.bnbu.mentoring.DTO;

import lombok.Data;

@Data
public class EnsureMcpGroupRequest {
    private String groupId;
    private String mentorId;
    /** 父组织：MAJOR 节点 id（由 majorId 解析得到，勿传学院 id） */
    private String parentOrgId;
    private String displayName;
}
