package com.bnbu.organizational.DTO;

import lombok.Data;

/**
 * 返回给前端的 Mentor 视图对象 (View Object)
 */
@Data
public class MentorVO {
    private String mentorId;
    private String mentorName;
    private String email;
    private String office;
    private String departmentName; // 冗余一个所属系名称，前端展示更友好
    /** 主小组展示标签，如 2024-2025-Y1 */
    private String groupId;
    /** 导师绑定的所有 MCP 小组展示标签 */
    private java.util.List<String> groupIds;
    /** 导师绑定的所有 MCP 小组组织 UUID（groupKey） */
    private java.util.List<String> groupKeys;
}