package com.bnbu.mentoring.Controller;

import com.bnbu.mentoring.Client.UserServiceClient;
import com.bnbu.mentoring.DTO.Result;
import com.bnbu.mentoring.DTO.UserSearchRequestDTO;
import com.bnbu.mentoring.DTO.McpGroupDTO;
import com.bnbu.mentoring.Entity.McpStudentExt;
import com.bnbu.mentoring.Entity.McpRecord;
import com.bnbu.mentoring.Service.McpGroupService;
import com.bnbu.mentoring.Service.McpRecordService;
import com.bnbu.mentoring.Service.McpStudentExtService;
import com.bnbu.mentoring.Common.OperationLogActions;
import com.bnbu.mentoring.Service.MentoringAccessService;
import com.bnbu.mentoring.Service.OperationLogRecorder;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.*;

import java.util.List;

import java.util.Collections;
import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/mentoring/student")
@RequiredArgsConstructor
public class StudentMentoringController {

    private final McpStudentExtService mcpStudentExtService;
    private final McpGroupService mcpGroupService;
    private final McpRecordService mcpRecordService;
    private final MentoringAccessService mentoringAccessService;
    private final UserServiceClient userServiceClient;
    private final OperationLogRecorder operationLogRecorder;

    @PreAuthorize("hasAuthority('ROLE_STUDENT')")
    @GetMapping("/group-status")
    public Result groupStatus(@RequestHeader("X-User-Id") String studentId) {
        McpStudentExt ext = mcpStudentExtService.getById(studentId);
        if (ext == null) {
            return Result.error("Warning: you are not assigned to any MCP group yet");
        }
        String groupKey = mcpGroupService.resolveGroupKeyForStudent(ext);
        if (groupKey == null) {
            return Result.error("Warning: you are not assigned to any MCP group yet");
        }
        mcpGroupService.persistGroupKeyIfResolved(ext, groupKey);
        Map<String, Object> data = new HashMap<>();
        data.put("groupId", ext.getGroupId());
        data.put("groupKey", groupKey);
        data.put("status", ext.getStatus());
        data.put("majorId", mcpGroupService.resolveMajorDisplayNameForStudent(ext));
        operationLogRecorder.recordQuiet(studentId, OperationLogActions.VIEW_GROUP_STATUS,
                "groupId=" + ext.getGroupId());
        return Result.success("success", data);
    }

    /**
     * 学生查看自己的导师信息
     * GET /api/mentoring/student/my-mentor
     * 不接收 groupId/major 参数：从当前登录学生 mcp_student_ext 自动解析所属小组。
     */
    @PreAuthorize("hasAuthority('ROLE_STUDENT')")
    @GetMapping("/my-mentor")
    public Result myMentor(@RequestHeader("X-User-Id") String studentId) {
        if (!StringUtils.hasText(studentId)) {
            return Result.error("未获取到当前登录学生ID，请通过网关访问");
        }
        try {
            McpStudentExt ext = mcpStudentExtService.getById(studentId);
            if (ext == null) {
                return Result.error("Warning: you are not assigned to any MCP group yet");
            }
            String groupKey = mcpGroupService.resolveGroupKeyForStudent(ext);
            if (groupKey == null) {
                return Result.error("Warning: cannot resolve your MCP group; please contact Faculty Consultant");
            }
            mcpGroupService.persistGroupKeyIfResolved(ext, groupKey);
            McpGroupDTO group = mcpGroupService.getGroup(groupKey);
            if (group.getMentorId() == null) {
                return Result.error("Warning: no mentor assigned to your group");
            }
            UserSearchRequestDTO dto = new UserSearchRequestDTO();
            dto.setRoleCode("MENTOR");
            dto.setUserIds(Collections.singletonList(group.getMentorId()));
            Result userResult = userServiceClient.searchUsersByConditions(dto);
            Map<String, Object> data = new HashMap<>();
            data.put("groupId", ext.getGroupId());
            data.put("groupLabel", group.getName() != null ? group.getName() : ext.getGroupId());
            data.put("groupKey", groupKey);
            data.put("majorId", mcpGroupService.resolveMajorDisplayNameForStudent(ext));
            data.put("mentor", userResult != null ? userResult.getData() : null);
            operationLogRecorder.recordQuiet(studentId, OperationLogActions.VIEW_MY_MENTOR,
                    "groupId=" + ext.getGroupId() + ", mentorId=" + group.getMentorId());
            return Result.success("success", data);
        } catch (RuntimeException e) {
            return Result.error(e.getMessage());
        }
    }

    /**
     * 学生查看自己的全部面谈（访谈）记录
     * GET /api/mentoring/student/my-records
     */
    @PreAuthorize("hasAuthority('ROLE_STUDENT')")
    @GetMapping("/my-records")
    public Result myRecords(@RequestHeader("X-User-Id") String studentId) {
        if (!StringUtils.hasText(studentId)) {
            return Result.error("未获取到当前登录学生ID，请通过网关访问");
        }
        List<McpRecord> records = mcpRecordService.lambdaQuery()
                .eq(McpRecord::getStudentId, studentId)
                .orderByDesc(McpRecord::getInterviewDate)
                .list();
        operationLogRecorder.recordQuiet(studentId, OperationLogActions.VIEW_MY_INTERVIEW_RECORDS,
                "count=" + records.size());
        return Result.success("获取成功", records);
    }

    /**
     * 学生查看单条面谈记录详情
     * GET /api/mentoring/student/records/{recordId}
     */
    @PreAuthorize("hasAuthority('ROLE_STUDENT')")
    @GetMapping("/records/{recordId}")
    public Result recordDetail(
            @RequestHeader("X-User-Id") String studentId,
            @PathVariable String recordId) {
        if (!StringUtils.hasText(studentId)) {
            return Result.error("未获取到当前登录学生ID，请通过网关访问");
        }
        try {
            mentoringAccessService.assertStudentOwnsRecord(studentId, recordId);
        } catch (RuntimeException e) {
            return Result.error(e.getMessage());
        }
        McpRecord record = mcpRecordService.getById(recordId);
        operationLogRecorder.recordQuiet(studentId, OperationLogActions.VIEW_INTERVIEW_RECORD,
                "recordId=" + recordId);
        return Result.success("获取成功", record);
    }
}
