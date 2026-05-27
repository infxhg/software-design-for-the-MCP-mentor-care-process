package com.bnbu.mentoring.Util;

import org.springframework.util.StringUtils;

/**
 * MCP 小组标识约定：
 * <ul>
 *   <li>{@code groupKey} — sys_org_unit.id（32 位 UUID），全局唯一，用于绑定与权限</li>
 *   <li>{@code groupId} / {@code groupLabel} — 展示标签，如 {@code 2024-2025-Y1}，同学年可有多组（不同导师/专业）</li>
 * </ul>
 */
public final class GroupKeyUtils {

    private GroupKeyUtils() {
    }

    /** 组织节点 UUID（无连字符的 32 位十六进制） */
    public static boolean isOrgUnitUuid(String value) {
        return StringUtils.hasText(value) && value.trim().matches("[0-9a-fA-F]{32}");
    }

    /** 展示标签（含学年段，非 UUID） */
    public static boolean isGroupLabel(String value) {
        return StringUtils.hasText(value) && !isOrgUnitUuid(value);
    }
}
