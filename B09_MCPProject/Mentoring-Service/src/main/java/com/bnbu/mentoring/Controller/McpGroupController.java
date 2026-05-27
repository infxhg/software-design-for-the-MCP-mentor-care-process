package com.bnbu.mentoring.Controller;

import com.bnbu.mentoring.DTO.ChangeGroupMentorRequest;
import com.bnbu.mentoring.DTO.Result;
import com.bnbu.mentoring.DTO.McpGroupDTO;
import com.bnbu.mentoring.Entity.McpStudentExt;
import com.bnbu.mentoring.Common.OperationLogActions;
import com.bnbu.mentoring.Service.McpGroupService;
import com.bnbu.mentoring.Service.MentoringAccessService;
import com.bnbu.mentoring.Service.OperationLogRecorder;
import com.bnbu.mentoring.Util.GroupKeyUtils;
import com.bnbu.mentoring.Util.SecurityRoleUtils;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.*;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Slf4j
@RestController
@RequestMapping("/api/mentoring/groups")
@RequiredArgsConstructor
public class McpGroupController {

    private final McpGroupService mcpGroupService;
    private final MentoringAccessService mentoringAccessService;
    private final OperationLogRecorder operationLogRecorder;

    // ─────────────────────────────────────────────────────────────
    // 读操作：按 groupId 标签 + 可选 majorId 查询（Mentor 自动解析）
    // ─────────────────────────────────────────────────────────────

    /**
     * GET /api/mentoring/groups/{groupId}?majorId=
     * groupId 传 "2024-2025-Y1" 格式的标签（非 UUID）。
     * Mentor：从自己的组自动解析。FC/Admin：可选 majorId 精确定位，不传返回全部匹配组。
     */
    @PreAuthorize("hasAuthority('ROLE_FACULTY_CONSULTANT') or hasAuthority('ROLE_COORDINATOR') or hasAuthority('ROLE_MENTOR')")
    @GetMapping("/{groupId}")
    public Result getGroup(
            @PathVariable String groupId,
            @RequestParam(required = false) String majorId,
            @RequestHeader(value = "X-User-Id", required = false) String currentUserId) {
        return loadGroupWithAccessCheck(groupId, majorId, currentUserId, false);
    }

    /**
     * GET /api/mentoring/groups/search?groupId=2024-2025-Y1&majorId=CST
     * FC 专用：按标签搜索，可附 majorId 精确定位。
     * 多组时 members 为各组合并结果；group/groups 含 major（组织树 MAJOR 名）；加/删组员请用 groups[].mentorId。
     */
    @PreAuthorize("hasAuthority('ROLE_FACULTY_CONSULTANT')")
    @GetMapping("/search")
    public Result searchByGroupId(
            @RequestParam String groupId,
            @RequestParam(required = false) String majorId,
            @RequestHeader(value = "X-User-Id", required = false) String currentUserId) {
        return loadGroupWithAccessCheck(groupId, majorId, currentUserId, true);
    }

    /**
     * GET /api/mentoring/groups/by-mentor/{mentorId}
     * 无变化：返回 McpGroupDTO 列表，其中 groupId=UUID，name="2024-2025-Y1"。
     */
    @PreAuthorize("hasAuthority('ROLE_FACULTY_CONSULTANT') or hasAuthority('ROLE_COORDINATOR')")
    @GetMapping("/by-mentor/{mentorId}")
    public Result listByMentor(@PathVariable String mentorId) {
        List<McpGroupDTO> groups = mcpGroupService.listByMentor(mentorId);
        return Result.success("success", groups);
    }

    /**
     * GET /api/mentoring/groups/{groupId}/members?majorId=
     * groupId 传标签。Mentor 自动解析，FC/Admin 可选 majorId。
     * 不传 majorId 时若匹配多组，合并所有成员返回。
     */
    @PreAuthorize("hasAuthority('ROLE_FACULTY_CONSULTANT') or hasAuthority('ROLE_COORDINATOR') or hasAuthority('ROLE_MENTOR')")
    @GetMapping("/{groupId}/members")
    public Result listMembers(
            @PathVariable String groupId,
            @RequestParam(required = false) String majorId,
            @RequestHeader(value = "X-User-Id", required = false) String currentUserId) {
        if (currentUserId == null || currentUserId.isBlank()) {
            return Result.error("未获取到当前登录用户ID，请通过网关访问");
        }
        try {
            String role = SecurityRoleUtils.primaryRoleCode();
            List<String> groupKeys = resolveKeys(groupId, currentUserId, role, majorId);
            if (groupKeys.isEmpty()) {
                return Result.error("Group not found: " + groupId);
            }
            // 过滤掉无权访问的组，不整体报错
            List<String> accessibleKeys = filterAccessibleKeys(groupKeys, currentUserId, role);
            if (accessibleKeys.isEmpty()) {
                return Result.error("权限不足：您无权访问该小组");
            }
            List<McpStudentExt> members = filterMembersByMajor(accessibleKeys.stream()
                    .flatMap(gk -> mcpGroupService.listMembers(gk).stream())
                    .distinct()
                    .collect(Collectors.toList()), majorId);
            operationLogRecorder.recordQuiet(currentUserId,
                    operationLogRecorder.resolveUsername(currentUserId),
                    OperationLogActions.VIEW_GROUP_MEMBERS,
                    "groupId=" + groupId + ", count=" + members.size());
            return Result.success("success", members);
        } catch (Throwable e) {
            log.error("[listMembers] groupId={} error", groupId, e);
            return Result.error(e.getMessage() != null ? e.getMessage() : e.getClass().getSimpleName());
        }
    }

    // ─────────────────────────────────────────────────────────────
    // 写操作：FC 专用，majorId 不传时若仍歧义则报错
    // ─────────────────────────────────────────────────────────────

    /**
     * PUT /api/mentoring/groups/by-key/{groupKey}/mentor
     * 已持有组织 UUID（groupKey）时直接更换导师，无需再通过标签+专业消歧。
     */
    @PreAuthorize("hasAuthority('ROLE_FACULTY_CONSULTANT')")
    @PutMapping("/by-key/{groupKey}/mentor")
    public Result changeMentorByGroupKey(
            @PathVariable String groupKey,
            @RequestBody ChangeGroupMentorRequest request,
            @RequestHeader(value = "X-User-Id", required = false) String currentUserId) {
        if (currentUserId == null || currentUserId.isBlank()) {
            return Result.error("未获取到当前登录用户ID，请通过网关访问");
        }
        if (request == null || request.getMentorId() == null || request.getMentorId().isBlank()) {
            return Result.error("mentorId is required");
        }
        if (groupKey == null || groupKey.isBlank()) {
            return Result.error("groupKey is required");
        }
        try {
            String gk = groupKey.trim();
            mcpGroupService.getGroup(gk);
            mentoringAccessService.assertFacultyConsultantCanAccessGroup(currentUserId, gk);
            McpGroupDTO updated = mcpGroupService.changeMentor(gk, request.getMentorId().trim());
            return Result.success("Mentor updated", updated);
        } catch (RuntimeException e) {
            return Result.error(e.getMessage());
        }
    }

    /**
     * POST /api/mentoring/groups/by-key/{groupKey}/members/{studentId}?majorId=
     * groupKey 为组织 UUID（sys_org_unit.id），无需 groupId 标签 / mentorId 消歧。
     * majorId 可选，仅用于校验目标组是否挂在对应 MAJOR 下。
     */
    @PreAuthorize("hasAuthority('ROLE_FACULTY_CONSULTANT')")
    @PostMapping("/by-key/{groupKey}/members/{studentId}")
    public Result addMemberByGroupKey(
            @PathVariable String groupKey,
            @PathVariable String studentId,
            @RequestParam(required = false) String majorId,
            @RequestHeader(value = "X-User-Id", required = false) String currentUserId) {
        return mutateGroupMemberByGroupKey(groupKey, studentId, majorId, currentUserId, false);
    }

    /**
     * DELETE /api/mentoring/groups/by-key/{groupKey}/members/{studentId}
     * 按组织 UUID 直接删组员；学生须已在该组。
     */
    @PreAuthorize("hasAuthority('ROLE_FACULTY_CONSULTANT')")
    @DeleteMapping("/by-key/{groupKey}/members/{studentId}")
    public Result removeMemberByGroupKey(
            @PathVariable String groupKey,
            @PathVariable String studentId,
            @RequestHeader(value = "X-User-Id", required = false) String currentUserId) {
        return mutateGroupMemberByGroupKey(groupKey, studentId, null, currentUserId, true);
    }

    /**
     * PUT /api/mentoring/groups/{groupId}/mentor?majorId=
     * groupId 传展示标签；majorId + 请求体 previousMentorId 用于唯一定位 groupKey。
     */
    @PreAuthorize("hasAuthority('ROLE_FACULTY_CONSULTANT')")
    @PutMapping("/{groupId}/mentor")
    public Result changeMentor(
            @PathVariable String groupId,
            @RequestParam(required = false) String majorId,
            @RequestBody ChangeGroupMentorRequest request,
            @RequestHeader(value = "X-User-Id", required = false) String currentUserId) {
        if (request == null || request.getMentorId() == null || request.getMentorId().isBlank()) {
            return Result.error("mentorId is required");
        }
        return mutateGroupForMentorChange(
                groupId, majorId, request.getPreviousMentorId(), currentUserId,
                gk -> Result.success("Mentor updated", mcpGroupService.changeMentor(gk, request.getMentorId().trim())));
    }

    /**
     * POST /api/mentoring/groups/{groupId}/members/{studentId}?majorId=&mentorId=
     * groupId 为展示标签；majorId 定位专业子树；同标签+专业多组时 mentorId 必填以唯一定位。
     * 新组员 ext.status 默认为 Normal。
     */
    @PreAuthorize("hasAuthority('ROLE_FACULTY_CONSULTANT')")
    @PostMapping("/{groupId}/members/{studentId}")
    public Result addMember(
            @PathVariable String groupId,
            @PathVariable String studentId,
            @RequestParam(required = false) String majorId,
            @RequestParam(required = false) String mentorId,
            @RequestHeader(value = "X-User-Id", required = false) String currentUserId) {
        return mutateGroupMember(groupId, majorId, mentorId, studentId, currentUserId, false, gk -> {
            mcpGroupService.addMember(gk, studentId, majorId, "Normal");
            return Result.success("Member added", null);
        });
    }

    /**
     * DELETE /api/mentoring/groups/{groupId}/members/{studentId}?majorId=&mentorId=
     * groupId 传标签；歧义时 majorId、mentorId 用于定位。学生须已在该组，否则报错。
     */
    @PreAuthorize("hasAuthority('ROLE_FACULTY_CONSULTANT')")
    @DeleteMapping("/{groupId}/members/{studentId}")
    public Result removeMember(
            @PathVariable String groupId,
            @PathVariable String studentId,
            @RequestParam(required = false) String majorId,
            @RequestParam(required = false) String mentorId,
            @RequestHeader(value = "X-User-Id", required = false) String currentUserId) {
        return mutateGroupMember(groupId, majorId, mentorId, studentId, currentUserId, true, gk -> {
            mcpGroupService.removeMember(gk, studentId);
            return Result.success("Member removed", null);
        });
    }

    // ─────────────────────────────────────────────────────────────
    // 内部工具方法
    // ─────────────────────────────────────────────────────────────

    /**
     * 读操作：解析标签 → UUID(s) → 过滤有权限的组 → 组装返回值。
     * FC 未传 majorId 时可能返回多个 UUID，只展示有权访问的。
     */
    private Result loadGroupWithAccessCheck(String groupLabel, String majorId,
                                             String currentUserId, boolean includeMembers) {
        if (groupLabel == null || groupLabel.isBlank()) {
            return Result.error("groupId 不能为空");
        }
        if (currentUserId == null || currentUserId.isBlank()) {
            return Result.error("未获取到当前登录用户ID，请通过网关访问");
        }
        try {
            String role = SecurityRoleUtils.primaryRoleCode();
            List<String> groupKeys = resolveKeys(groupLabel, currentUserId, role, majorId);
            // #region agent log
            debugLog("H-major", "McpGroupController.loadGroupWithAccessCheck", "resolved keys", Map.of(
                    "groupLabel", groupLabel,
                    "majorId", majorId != null ? majorId : "",
                    "resolvedCount", groupKeys.size(),
                    "groupKeys", String.join(",", groupKeys)));
            // #endregion
            if (groupKeys.isEmpty()) {
                return Result.fail(404, "Group not found: " + groupLabel);
            }
            // 过滤掉无权访问的组（FC 跨学院时）而不是整体报错
            List<String> accessibleKeys = filterAccessibleKeys(groupKeys, currentUserId, role);
            if (accessibleKeys.isEmpty()) {
                return Result.fail(403, "权限不足：您的管辖范围内不存在该小组");
            }
            logGroupSearch(currentUserId, groupLabel, majorId, accessibleKeys.size());
            if (!includeMembers) {
                if (accessibleKeys.size() == 1) {
                    return Result.success("success", mcpGroupService.getGroup(accessibleKeys.get(0)));
                }
                List<McpGroupDTO> groups = accessibleKeys.stream()
                        .map(mcpGroupService::getGroup).collect(Collectors.toList());
                return Result.success("success", groups);
            }
            // includeMembers = true
            if (accessibleKeys.size() == 1) {
                String gk = accessibleKeys.get(0);
                Map<String, Object> payload = new HashMap<>();
                payload.put("group", mcpGroupService.getGroup(gk));
                payload.put("members", mcpGroupService.toMemberViews(
                        filterMembersByMajor(mcpGroupService.listMembers(gk), majorId)));
                return Result.success("success", payload);
            }
            // 多组：合并返回
            List<McpGroupDTO> groups = accessibleKeys.stream()
                    .map(mcpGroupService::getGroup).collect(Collectors.toList());
            List<McpStudentExt> allMembers = filterMembersByMajor(accessibleKeys.stream()
                    .flatMap(gk -> mcpGroupService.listMembers(gk).stream())
                    .distinct().collect(Collectors.toList()), majorId);
            Map<String, Object> payload = new HashMap<>();
            payload.put("groups", groups);
            payload.put("members", mcpGroupService.toMemberViews(allMembers));
            return Result.success("success", payload);
        } catch (Throwable e) {
            log.error("[loadGroupWithAccessCheck] groupLabel={} error", groupLabel, e);
            return Result.fail(500, e.getMessage() != null ? e.getMessage() : e.getClass().getSimpleName());
        }
    }

    private List<McpStudentExt> filterMembersByMajor(List<McpStudentExt> members, String majorId) {
        return mcpGroupService.filterMembersByMajorSubtree(members, majorId);
    }

    private void logGroupSearch(String userId, String groupLabel, String majorId, int matchCount) {
        operationLogRecorder.recordQuiet(userId,
                operationLogRecorder.resolveUsername(userId),
                OperationLogActions.SEARCH_GROUP,
                "groupId=" + groupLabel + ", majorId=" + (majorId != null ? majorId : "") + ", matches=" + matchCount);
    }

    private static void debugLog(String hypothesisId, String location, String message, Map<String, Object> data) {
        try {
            Map<String, Object> line = new java.util.LinkedHashMap<>();
            line.put("sessionId", "6b255a");
            line.put("hypothesisId", hypothesisId);
            line.put("location", location);
            line.put("message", message);
            line.put("data", data);
            line.put("timestamp", System.currentTimeMillis());
            String json = new com.fasterxml.jackson.databind.ObjectMapper().writeValueAsString(line);
            java.nio.file.Files.writeString(
                    java.nio.file.Path.of("/Users/houshuoran/IdeaProjects/B09/.cursor/debug-6b255a.log"),
                    json + System.lineSeparator(),
                    java.nio.file.StandardOpenOption.CREATE, java.nio.file.StandardOpenOption.APPEND);
        } catch (Exception ignored) {
        }
    }

    /**
     * 过滤只保留当前用户有权访问的 groupKey(UUID) 列表。
     * 无权的组静默跳过（写日志）。
     */
    private List<String> filterAccessibleKeys(List<String> groupKeys, String userId, String role) {
        List<String> result = new ArrayList<>();
        for (String gk : groupKeys) {
            try {
                mentoringAccessService.assertCanReadGroupRecords(userId, role, gk);
                result.add(gk);
            } catch (RuntimeException e) {
                log.debug("[filterAccessibleKeys] user={} role={} skip groupKey={}: {}", userId, role, gk, e.getMessage());
            }
        }
        return result;
    }

    /**
     * 换导师：标签 + majorId + 原导师 唯一定位 groupKey。
     */
    private Result mutateGroupForMentorChange(String groupLabel, String majorId, String previousMentorId,
                                               String currentUserId,
                                               java.util.function.Function<String, Result> action) {
        if (currentUserId == null || currentUserId.isBlank()) {
            return Result.error("未获取到当前登录用户ID，请通过网关访问");
        }
        try {
            String groupKey = mcpGroupService.resolveUniqueGroupKeyForMentorChange(
                    groupLabel, majorId, previousMentorId);
            mentoringAccessService.assertFacultyConsultantCanAccessGroup(currentUserId, groupKey);
            return action.apply(groupKey);
        } catch (RuntimeException e) {
            return Result.error(e.getMessage());
        }
    }

    /**
     * 已持有 groupKey（组织 UUID）时加/删组员，不经过标签解析。
     */
    private Result mutateGroupMemberByGroupKey(String groupKey, String studentId, String majorId,
                                                String currentUserId, boolean forRemove) {
        if (currentUserId == null || currentUserId.isBlank()) {
            return Result.error("未获取到当前登录用户ID，请通过网关访问");
        }
        if (!StringUtils.hasText(groupKey)) {
            return Result.error("groupKey is required");
        }
        if (!StringUtils.hasText(studentId)) {
            return Result.error("studentId is required");
        }
        String gk = groupKey.trim();
        if (!GroupKeyUtils.isOrgUnitUuid(gk)) {
            return Result.error("groupKey must be organization unit UUID (32 hex chars), not display label");
        }
        try {
            mcpGroupService.getGroup(gk);
            mentoringAccessService.assertFacultyConsultantCanAccessGroup(currentUserId, gk);
            if (forRemove) {
                mcpGroupService.removeMember(gk, studentId.trim());
                return Result.success("Member removed", null);
            }
            mcpGroupService.addMember(gk, studentId.trim(), majorId, "Normal");
            return Result.success("Member added", null);
        } catch (RuntimeException e) {
            return Result.error(e.getMessage());
        }
    }

    /**
     * 加/删成员：可用 studentId 在同标签多组时消歧。
     */
    private Result mutateGroupMember(String groupLabel, String majorId, String mentorId,
                                      String memberStudentId, String currentUserId, boolean forRemove,
                                      java.util.function.Function<String, Result> action) {
        if (currentUserId == null || currentUserId.isBlank()) {
            return Result.error("未获取到当前登录用户ID，请通过网关访问");
        }
        try {
            String groupKey = mcpGroupService.resolveUniqueGroupKeyForMemberWrite(
                    groupLabel, majorId, memberStudentId, forRemove, mentorId);
            mentoringAccessService.assertFacultyConsultantCanAccessGroup(currentUserId, groupKey);
            return action.apply(groupKey);
        } catch (RuntimeException e) {
            return Result.error(e.getMessage());
        }
    }

    /**
     * 将标签解析为 UUID 列表。
     * Mentor：从自己的组里匹配，始终返回 0 或 1 个。
     * FC/Admin：按组织树 + ext 标签解析；majorId 不传返回全部匹配。
     */
    private List<String> resolveKeys(String groupLabel, String currentUserId,
                                      String role, String majorId) {
        if ("ROLE_MENTOR".equals(role)) {
            try {
                return List.of(mcpGroupService.resolveGroupKeyForMentor(groupLabel, currentUserId));
            } catch (RuntimeException e) {
                return List.of();
            }
        }
        // FC / COORDINATOR / ADMIN
        return mcpGroupService.resolveGroupKeysByLabel(groupLabel, majorId);
    }
}
