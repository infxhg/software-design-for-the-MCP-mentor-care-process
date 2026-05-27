package com.bnbu.organizational.DTO;

import lombok.Data;

/**
 * MCP 小组视图：对应 sys_org_unit 中 type=GROUP 的节点 + 绑定的导师。
 * <p>约定：{@code groupId} / {@code groupLabel} = 学年标签（如 2024-2025-Y1）；
 * {@code groupKey} = sys_org_unit.id（UUID）。</p>
 */
@Data
public class McpGroupVO {
    /** 展示标签，如 2024-2025-Y1（与 groupLabel 相同） */
    private String groupId;
    /** 展示名称，与 groupId 一致 */
    private String name;
    /** 组织 UUID（sys_org_unit.id），用于内部绑定与 Feign 路径参数 */
    private String groupKey;
    private String groupLabel;
    private String parentId;
    private String facultyOrgId;
    private String mentorId;
}
