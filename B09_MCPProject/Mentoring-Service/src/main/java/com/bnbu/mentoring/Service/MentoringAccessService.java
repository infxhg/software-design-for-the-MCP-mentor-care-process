package com.bnbu.mentoring.Service;

import com.bnbu.mentoring.Client.OrgServiceClient;
import com.bnbu.mentoring.DTO.Result;
import com.bnbu.mentoring.Entity.McpRecord;
import com.bnbu.mentoring.Entity.McpStudentExt;
import com.bnbu.mentoring.Mapper.McpRecordMapper;
import com.bnbu.mentoring.Mapper.McpStudentExtMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import com.bnbu.mentoring.DTO.McpGroupDTO;

import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardOpenOption;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * 数据范围校验：小组归属走组织服务；学生扩展与记录在 mentoring 库。
 */
@Service
@RequiredArgsConstructor
public class MentoringAccessService {

    private final McpStudentExtMapper mcpStudentExtMapper;
    private final McpRecordMapper mcpRecordMapper;
    private final OrgServiceClient orgServiceClient;
    private final McpGroupService mcpGroupService;

    public void assertMentorOwnsStudent(String mentorId, String studentId) {
        if (!isStudentInMentorGroups(mentorId, studentId)) {
            throw new RuntimeException("权限不足：该学生不属于您负责的小组");
        }
    }

    public void assertMentorOwnsGroup(String mentorId, String groupId) {
        if (!StringUtils.hasText(groupId)) {
            throw new RuntimeException("权限不足：您无权访问该小组");
        }
        if (mcpGroupService.isMentorOfGroup(mentorId, groupId)) {
            return;
        }
        try {
            McpGroupDTO group = mcpGroupService.getGroup(groupId.trim());
            if (mentorId != null && mentorId.equals(group.getMentorId())) {
                return;
            }
        } catch (RuntimeException ignored) {
            // fall through
        }
        throw new RuntimeException("权限不足：您无权访问该小组");
    }

    public void assertStudentOwnsRecord(String studentId, String recordId) {
        McpRecord record = mcpRecordMapper.selectById(recordId);
        if (record == null) {
            throw new RuntimeException("该访谈记录不存在");
        }
        if (!studentId.equals(record.getStudentId())) {
            throw new RuntimeException("权限不足：您只能查看自己的访谈记录");
        }
    }

    public boolean facultyConsultantCanAccessStudent(String consultantId, String studentId) {
        try {
            assertFacultyConsultantCanAccessStudent(consultantId, studentId);
            return true;
        } catch (RuntimeException e) {
            return false;
        }
    }

    public List<String> listGroupKeysInFacultyConsultantScope(String consultantId) {
        return mcpStudentExtMapper.selectList(null).stream()
                .map(mcpGroupService::resolveGroupKeyForStudent)
                .filter(StringUtils::hasText)
                .distinct()
                .filter(gk -> facultyConsultantCanAccessGroup(consultantId, gk))
                .collect(Collectors.toList());
    }

    public Set<String> listStudentIdsInFacultyConsultantScope(String consultantId) {
        List<String> groupKeys = listGroupKeysInFacultyConsultantScope(consultantId);
        if (groupKeys.isEmpty()) {
            return Set.of();
        }
        return mcpStudentExtMapper.selectList(null).stream()
                .filter(m -> {
                    String gk = mcpGroupService.resolveGroupKeyForStudent(m);
                    return StringUtils.hasText(gk) && groupKeys.contains(gk);
                })
                .map(McpStudentExt::getStudentId)
                .filter(StringUtils::hasText)
                .collect(Collectors.toCollection(LinkedHashSet::new));
    }

    private boolean facultyConsultantCanAccessGroup(String consultantId, String groupId) {
        try {
            assertFacultyConsultantCanAccessGroup(consultantId, groupId);
            return true;
        } catch (RuntimeException e) {
            return false;
        }
    }

    public void assertMentorOwnsRecord(String mentorId, String recordId) {
        McpRecord record = mcpRecordMapper.selectById(recordId);
        if (record == null) {
            throw new RuntimeException("该访谈记录不存在");
        }
        if (!mentorId.equals(record.getMentorId())) {
            throw new RuntimeException("权限不足：您无权访问该访谈记录");
        }
    }

    public void assertCoordinatorCanAccessStudent(String coordinatorId, String studentId) {
        if (!coordinatorCanAccessUser(coordinatorId, studentId)) {
            throw new RuntimeException("权限不足：该学生不在您的系/部门管理范围内");
        }
    }

    public void assertCoordinatorCanAccessGroup(String coordinatorId, String groupId) {
        try {
            mcpGroupService.getGroup(groupId);
        } catch (RuntimeException e) {
            throw new RuntimeException("小组不存在");
        }
        if (coordinatorCanAccessOrg(coordinatorId, groupId)) {
            return;
        }
        List<McpStudentExt> members = mcpGroupService.listMembers(groupId.trim());
        if (members == null || members.isEmpty()) {
            throw new RuntimeException("权限不足：该小组不在您的系/部门管理范围内");
        }
        boolean anyInScope = members.stream()
                .anyMatch(m -> coordinatorCanAccessUser(coordinatorId, m.getStudentId()));
        if (!anyInScope) {
            throw new RuntimeException("权限不足：该小组不在您的系/部门管理范围内");
        }
    }

    public void assertFacultyConsultantCanAccessGroup(String consultantId, String groupId) {
        // 先验证小组是否存在（保留原始异常信息便于调试）
        mcpGroupService.getGroup(groupId);
        String facultyOrgId = mcpGroupService.resolveFacultyOrgId(groupId);
        if (!facultyConsultantCanAccessFaculty(consultantId, facultyOrgId)) {
            throw new RuntimeException("权限不足：该小组不在您的学院管理范围内");
        }
    }

    public void assertFacultyConsultantCanAccessStudent(String consultantId, String studentId) {
        McpStudentExt ext = mcpStudentExtMapper.selectById(studentId);
        String groupKey = mcpGroupService.resolveGroupKeyForStudent(ext);
        if (!StringUtils.hasText(groupKey)) {
            throw new RuntimeException("学生未分配小组");
        }
        assertFacultyConsultantCanAccessGroup(consultantId, groupKey);
    }

    public void assertCanReadStudentRecords(String userId, String role, String studentId) {
        switch (role) {
            case "MENTOR" -> assertMentorOwnsStudent(userId, studentId);
            case "COORDINATOR" -> assertCoordinatorCanAccessStudent(userId, studentId);
            case "FACULTY_CONSULTANT" -> assertFacultyConsultantCanAccessStudent(userId, studentId);
            default -> throw new RuntimeException("无权访问该学生记录");
        }
    }

    public void assertCanReadGroupRecords(String userId, String role, String groupId) {
        switch (role) {
            case "MENTOR" -> assertMentorOwnsGroup(userId, groupId);
            case "COORDINATOR" -> assertCoordinatorCanAccessGroup(userId, groupId);
            case "FACULTY_CONSULTANT" -> assertFacultyConsultantCanAccessGroup(userId, groupId);
            default -> throw new RuntimeException("无权访问该小组记录");
        }
    }

    public void assertCanReadRecord(String userId, String role, String recordId) {
        McpRecord record = mcpRecordMapper.selectById(recordId);
        if (record == null) {
            throw new RuntimeException("记录不存在");
        }
        assertCanReadStudentRecords(userId, role, record.getStudentId());
    }

    public boolean isStudentInMentorGroups(String mentorId, String studentId) {
        McpStudentExt ext = mcpStudentExtMapper.selectById(studentId);
        if (ext == null) {
            // #region agent log
            debugLog("B", "MentoringAccessService.isStudentInMentorGroups", "no mcp_student_ext", Map.of(
                    "mentorId", mentorId, "studentId", studentId));
            // #endregion
            return false;
        }
        String studentGroupKey = mcpGroupService.resolveGroupKeyForStudent(ext);
        if (!StringUtils.hasText(studentGroupKey)) {
            // #region agent log
            debugLog("A", "MentoringAccessService.isStudentInMentorGroups", "resolveGroupKey failed", Map.of(
                    "mentorId", mentorId, "studentId", studentId,
                    "extGroupId", ext.getGroupId(), "extGroupKey", ext.getGroupKey()));
            // #endregion
            return false;
        }
        boolean orgMentorCheck = mcpGroupService.isMentorOfGroup(mentorId, studentGroupKey);
        boolean groupVoMentorCheck = false;
        String groupMentorId = null;
        try {
            McpGroupDTO group = mcpGroupService.getGroup(studentGroupKey);
            groupMentorId = group.getMentorId();
            groupVoMentorCheck = mentorId != null && mentorId.equals(groupMentorId);
        } catch (RuntimeException ignored) {
            // keep false
        }
        boolean allowed = orgMentorCheck || groupVoMentorCheck;
        // #region agent log
        debugLog("A", "MentoringAccessService.isStudentInMentorGroups", "mentor-student check", Map.of(
                "mentorId", mentorId, "studentId", studentId,
                "resolvedGroupKey", studentGroupKey,
                "extGroupId", ext.getGroupId(), "extGroupKey", ext.getGroupKey(),
                "orgMentorCheck", orgMentorCheck, "groupVoMentorCheck", groupVoMentorCheck,
                "groupMentorId", groupMentorId, "allowed", allowed));
        // #endregion
        return allowed;
    }

  private static void debugLog(String hypothesisId, String location, String message, Map<String, Object> data) {
        try {
            Map<String, Object> line = new LinkedHashMap<>();
            line.put("sessionId", "6b255a");
            line.put("hypothesisId", hypothesisId);
            line.put("location", location);
            line.put("message", message);
            line.put("data", data);
            line.put("timestamp", System.currentTimeMillis());
            String json = new com.fasterxml.jackson.databind.ObjectMapper().writeValueAsString(line);
            Files.writeString(
                    Path.of("/Users/houshuoran/IdeaProjects/B09/.cursor/debug-6b255a.log"),
                    json + System.lineSeparator(),
                    StandardOpenOption.CREATE, StandardOpenOption.APPEND);
        } catch (Exception ignored) {
        }
    }

    private boolean coordinatorCanAccessOrg(String coordinatorId, String orgUnitId) {
        try {
            Result res = orgServiceClient.coordinatorCanAccessOrg(coordinatorId, orgUnitId);
            return isFeignTrue(res);
        } catch (Exception e) {
            return false;
        }
    }

    private boolean coordinatorCanAccessUser(String coordinatorId, String targetUserId) {
        try {
            Result res = orgServiceClient.coordinatorCanAccessUser(coordinatorId, targetUserId);
            return isFeignTrue(res);
        } catch (Exception e) {
            return false;
        }
    }

    private boolean facultyConsultantCanAccessFaculty(String consultantId, String facultyOrgId) {
        if (!StringUtils.hasText(facultyOrgId)) {
            return false;
        }
        try {
            Result res = orgServiceClient.facultyConsultantCanAccessFaculty(consultantId, facultyOrgId);
            return isFeignTrue(res);
        } catch (Exception e) {
            return false;
        }
    }

    private boolean isFeignTrue(Result res) {
        return res != null && res.getCode() != null && res.getCode() == 200
                && Boolean.TRUE.equals(res.getData());
    }
}
