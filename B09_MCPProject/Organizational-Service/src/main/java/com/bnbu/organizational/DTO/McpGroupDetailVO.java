package com.bnbu.organizational.DTO;

import lombok.Data;

import java.util.ArrayList;
import java.util.List;

/**
 * FC 按 groupKey 查看的小组详情。
 */
@Data
public class McpGroupDetailVO {
    private McpGroupVO group;
    private MentorVO mentor;
    private List<String> studentMemberIds = new ArrayList<>();
    private int studentCount;
}
