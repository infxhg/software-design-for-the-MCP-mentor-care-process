package com.bnbu.mentoring.Controller;

import com.bnbu.mentoring.Client.UserServiceClient;
import com.bnbu.mentoring.Common.OperationLogActions;
import com.bnbu.mentoring.DTO.Result;
import com.bnbu.mentoring.Service.OperationLogRecorder;
import com.bnbu.mentoring.DTO.UserSearchRequestDTO;
import com.bnbu.mentoring.Entity.McpRecord;
import com.bnbu.mentoring.Service.McpRecordService;
import com.bnbu.mentoring.Service.MentoringAccessService;
import com.bnbu.mentoring.Util.SecurityRoleUtils;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import com.bnbu.mentoring.Service.McpStudentExtService;

@RestController
@RequestMapping("/api/mentoring/records")
public class McpRecordController {

    @Autowired
    private McpRecordService mcpRecordService;

    @Autowired
    private MentoringAccessService mentoringAccessService;

    /**
     * 新增或编辑访谈记录 (供 Mentor 使用)
     * POST /api/mentoring/records
     */
    @org.springframework.security.access.prepost.PreAuthorize("hasAuthority('ROLE_MENTOR') or hasAuthority('ROLE_COORDINATOR')")
    @PostMapping
    public Result saveOrUpdateRecord(@RequestBody McpRecord record, @RequestHeader(value = "X-User-Id", required = false) String currentUserId) {
        if (currentUserId == null || currentUserId.isEmpty()) {
            return Result.error("未获取到当前登录用户ID，请通过网关访问");
        }

        try {
            boolean coordinator = org.springframework.security.core.context.SecurityContextHolder.getContext()
                    .getAuthentication().getAuthorities().stream()
                    .anyMatch(a -> a.getAuthority().equals("ROLE_COORDINATOR"));
            boolean success = mcpRecordService.saveOrUpdateRecord(record, currentUserId, coordinator);
            if (success) {
                operationLogRecorder.recordQuiet(currentUserId,
                        operationLogRecorder.resolveUsername(currentUserId),
                        OperationLogActions.CREATE_INTERVIEW_RECORD,
                        "recordId=" + (record.getRecordId() != null ? record.getRecordId() : "")
                                + ", studentId=" + record.getStudentId());
                return Result.success("提交访谈记录成功", null);
            } else {
                return Result.error("提交访谈记录失败");
            }
        } catch (Exception e) {
            return Result.error(e.getMessage());
        }
    }

    /**
     * Mentor 删除自己的访谈记录
     * DELETE /api/mentoring/records/{recordId}
     */
    @org.springframework.security.access.prepost.PreAuthorize("hasAuthority('ROLE_MENTOR')")
    @DeleteMapping("/{recordId}")
    public Result deleteRecord(
            @PathVariable String recordId,
            @RequestHeader(value = "X-User-Id", required = false) String currentMentorId) {
        if (currentMentorId == null || currentMentorId.isEmpty()) {
            return Result.error("未获取到当前登录的导师ID，请通过网关访问");
        }
        McpRecord existRecord = mcpRecordService.getById(recordId);
        if (existRecord == null) {
            return Result.error("该访谈记录不存在");
        }
        // 防越权：只能删除自己的记录
        if (!existRecord.getMentorId().equals(currentMentorId)) {
            return Result.error("无权删除其他导师的访谈记录");
        }
        boolean success = mcpRecordService.removeById(recordId);
        if (success) {
            operationLogRecorder.recordQuiet(currentMentorId,
                    operationLogRecorder.resolveUsername(currentMentorId),
                    OperationLogActions.DELETE_INTERVIEW_RECORD,
                    "recordId=" + recordId + ", studentId=" + existRecord.getStudentId());
        }
        return success ? Result.success("删除成功", null) : Result.error("删除失败");
    }

    /**
     * 获取当前登录 Mentor 负责的所有访谈记录
     * GET /api/mentoring/records/mine
     * 前端 Mentor 登录后直接调此接口，无需预先知道 groupId
     */
    @org.springframework.security.access.prepost.PreAuthorize("hasAuthority('ROLE_MENTOR')")
    @GetMapping("/mine")
    public Result getMyRecords(@RequestHeader(value = "X-User-Id", required = false) String currentMentorId) {
        if (currentMentorId == null || currentMentorId.isEmpty()) {
            return Result.error("未获取到当前登录的导师ID，请通过网关访问");
        }
        List<McpRecord> records = mcpRecordService.lambdaQuery()
                .eq(McpRecord::getMentorId, currentMentorId)
                .orderByDesc(McpRecord::getInterviewDate)
                .list();
        operationLogRecorder.recordQuiet(currentMentorId,
                operationLogRecorder.resolveUsername(currentMentorId),
                OperationLogActions.VIEW_MENTOR_INTERVIEW_RECORDS,
                "count=" + records.size());
        return Result.success("获取成功", records);
    }

    /**
     * 根据学生ID获取该学生的历史访谈记录
     * GET /api/mentoring/records/student/{studentId}
     *
     * Mentor：仅返回本人对该学生的记录（须在该学生所在小组内）。
     * FC / Coordinator：返回该学生的全部记录（可按参数过滤）。
     *
     * 可选过滤参数：
     *   academicYear  - 学年，格式 "2024-2025"，匹配 groupId 前缀（如 groupId="2024-2025-Y2"）
     *   mentorKeyword - Mentor 姓名关键字，模糊匹配（从 User-Service 获取真实姓名后过滤）
     */
    @org.springframework.security.access.prepost.PreAuthorize(
            "hasAuthority('ROLE_MENTOR') or hasAuthority('ROLE_FACULTY_CONSULTANT') or hasAuthority('ROLE_COORDINATOR')")
    @GetMapping("/student/{studentId}")
    public Result getRecordsByStudent(
            @PathVariable String studentId,
            @RequestParam(required = false) String academicYear,
            @RequestParam(required = false) String mentorKeyword,
            @RequestHeader(value = "X-User-Id", required = false) String currentUserId) {
        if (currentUserId == null || currentUserId.isEmpty()) {
            return Result.error("未获取到当前登录用户ID，请通过网关访问");
        }
        String role = SecurityRoleUtils.primaryRoleCode();
        try {
            mentoringAccessService.assertCanReadStudentRecords(currentUserId, role, studentId);
        } catch (RuntimeException e) {
            return Result.error(e.getMessage());
        }

        List<McpRecord> records = mcpRecordService.lambdaQuery()
                .eq(McpRecord::getStudentId, studentId)
                .list();

        if ("MENTOR".equals(role)) {
            records = records.stream()
                    .filter(r -> currentUserId.equals(r.getMentorId()))
                    .collect(Collectors.toList());
        }

        // 按学年过滤：groupId 以 "2024-2025" 开头（格式 2024-2025-Y2）
        if (academicYear != null && !academicYear.isBlank()) {
            final String yearPrefix = academicYear.trim();
            records = records.stream()
                    .filter(r -> r.getGroupId() != null && r.getGroupId().startsWith(yearPrefix))
                    .collect(Collectors.toList());
        }

        // 按 Mentor 名字关键字过滤（从 User-Service 反查 realName）
        if (mentorKeyword != null && !mentorKeyword.isBlank()) {
            final String kw = mentorKeyword.trim().toLowerCase();
            records = records.stream()
                    .filter(r -> {
                        if (r.getMentorId() == null) return false;
                        try {
                            Result userRes = userServiceClient.getUserById(r.getMentorId());
                            if (userRes != null && userRes.getCode() == 200 && userRes.getData() instanceof Map) {
                                Map<?, ?> user = (Map<?, ?>) userRes.getData();
                                Object realName = user.get("realName");
                                Object username = user.get("username");
                                String name = realName != null ? realName.toString() : (username != null ? username.toString() : "");
                                return name.toLowerCase().contains(kw);
                            }
                        } catch (Exception ignored) {}
                        return false;
                    })
                    .collect(Collectors.toList());
        }

        operationLogRecorder.recordQuiet(currentUserId,
                operationLogRecorder.resolveUsername(currentUserId),
                OperationLogActions.VIEW_STUDENT_INTERVIEW_RECORDS,
                "studentId=" + studentId + ", count=" + records.size());
        return Result.success("获取成功", records);
    }

    /**
     * Mentor 按学生ID精确搜索（须在 /{recordId} 之前声明，避免路径冲突）
     * GET /api/mentoring/records/students/search?studentId=
     */
    @org.springframework.security.access.prepost.PreAuthorize("hasAuthority('ROLE_MENTOR')")
    @GetMapping("/students/search")
    public Result searchStudentByIdInMyGroups(
            @RequestHeader(value = "X-User-Id", required = false) String currentMentorId,
            @RequestParam(value = "studentId") String studentId) {

        if (currentMentorId == null || currentMentorId.isEmpty()) {
            return Result.error("未获取到当前登录的导师ID，请通过网关访问");
        }
        if (studentId == null || studentId.trim().isEmpty()) {
            return Result.error("studentId 不能为空");
        }

        if (!mentoringAccessService.isStudentInMentorGroups(currentMentorId, studentId.trim())) {
            return Result.error("权限不足：该学生不属于您负责的任何小组");
        }

        UserSearchRequestDTO searchDTO = new UserSearchRequestDTO();
        searchDTO.setRoleCode("STUDENT");
        searchDTO.setUserIds(java.util.Collections.singletonList(studentId.trim()));

        try {
            Result userResult = userServiceClient.searchUsersByConditions(searchDTO);
            if (userResult == null || userResult.getCode() == null || userResult.getCode() != 200) {
                return Result.error(userResult != null && userResult.getMessage() != null
                        ? userResult.getMessage() : "用户服务查询失败");
            }
            operationLogRecorder.recordQuiet(currentMentorId,
                    operationLogRecorder.resolveUsername(currentMentorId),
                    OperationLogActions.SEARCH_STUDENT_IN_GROUPS,
                    "studentId=" + studentId.trim());
            return Result.success("查询成功", userResult.getData());
        } catch (Exception e) {
            return Result.error("调用用户服务失败：" + e.getMessage());
        }
    }

    /**
     * 根据记录ID获取详情
     * GET /api/mentoring/records/{recordId}
     */
    @org.springframework.security.access.prepost.PreAuthorize("hasAuthority('ROLE_FACULTY_CONSULTANT') or hasAuthority('ROLE_COORDINATOR') or hasAuthority('ROLE_MENTOR')")
    @GetMapping("/{recordId}")
    public Result getRecordDetail(
            @PathVariable String recordId,
            @RequestHeader(value = "X-User-Id", required = false) String currentUserId) {
        if (currentUserId == null || currentUserId.isEmpty()) {
            return Result.error("未获取到当前登录用户ID，请通过网关访问");
        }
        try {
            mentoringAccessService.assertCanReadRecord(
                    currentUserId, SecurityRoleUtils.primaryRoleCode(), recordId);
        } catch (RuntimeException e) {
            return Result.error(e.getMessage());
        }
        McpRecord record = mcpRecordService.getById(recordId);
        operationLogRecorder.recordQuiet(currentUserId,
                operationLogRecorder.resolveUsername(currentUserId),
                OperationLogActions.VIEW_INTERVIEW_RECORD,
                "recordId=" + recordId);
        return Result.success("获取成功", record);
    }
    @Autowired
    private McpStudentExtService mcpStudentExtService;

    @Autowired
    private UserServiceClient userServiceClient;

    @Autowired
    private com.bnbu.mentoring.Service.McpGroupService mcpGroupService;

    @Autowired
    private OperationLogRecorder operationLogRecorder;

    /**
     * 按照小组范围查看组内学生及其访谈记录的功能
     * GET /api/mentoring/records/group/{groupId}?majorId=
     *
     * groupId 传 "2024-2025-Y1" 格式的标签（非 UUID）。
     * Mentor：从自己的组自动解析。
     * FC/Admin：可选 majorId 精确定位一个组；不传则合并返回所有匹配组的数据。
     */
    @org.springframework.security.access.prepost.PreAuthorize(
            "hasAuthority('ROLE_MENTOR') or hasAuthority('ROLE_COORDINATOR') or hasAuthority('ROLE_FACULTY_CONSULTANT')")
    @GetMapping("/group/{groupId}")
    public Result getRecordsByGroup(
            @PathVariable String groupId,
            @RequestParam(required = false) String majorId,
            @RequestHeader(value = "X-User-Id", required = false) String currentUserId) {
        if (currentUserId == null || currentUserId.isEmpty()) {
            return Result.error("未获取到当前登录用户ID，请通过网关访问");
        }
        try {
            String role = SecurityRoleUtils.primaryRoleCode();
            // 将标签解析为 UUID 列表
            List<String> groupKeys = resolveGroupKeys(groupId, currentUserId, role, majorId);
            if (groupKeys.isEmpty()) {
                return Result.error("Group not found: " + groupId);
            }
            // 访问权限检查
            for (String gk : groupKeys) {
                mentoringAccessService.assertCanReadGroupRecords(currentUserId, role, gk);
            }
            // 1. 合并所有匹配组内的学生
            List<com.bnbu.mentoring.Entity.McpStudentExt> students = groupKeys.stream()
                    .flatMap(gk -> mcpGroupService.listMembers(gk).stream())
                    .distinct()
                    .collect(java.util.stream.Collectors.toList());
            if (students == null || students.isEmpty()) {
                return Result.success("该小组内无学生", java.util.Collections.emptyList());
            }
            // 2. 按组内学生查询记录（兼容 group_key 为空的历史访谈）
            List<String> studentIds = students.stream()
                    .map(com.bnbu.mentoring.Entity.McpStudentExt::getStudentId)
                    .filter(id -> id != null && !id.isEmpty())
                    .distinct()
                    .collect(Collectors.toList());
            List<McpRecord> groupRecords = studentIds.isEmpty()
                    ? List.of()
                    : mcpRecordService.lambdaQuery()
                            .in(McpRecord::getStudentId, studentIds)
                            .list();
            java.util.Map<String, List<McpRecord>> studentRecordsMap = groupRecords.stream()
                    .collect(java.util.stream.Collectors.groupingBy(McpRecord::getStudentId));
            // 3. 组装 DTO
            List<com.bnbu.mentoring.DTO.StudentGroupRecordDTO> resultList = students.stream().map(student -> {
                com.bnbu.mentoring.DTO.StudentGroupRecordDTO dto = new com.bnbu.mentoring.DTO.StudentGroupRecordDTO();
                dto.setStudentId(student.getStudentId());
                dto.setMajorId(mcpGroupService.resolveMajorDisplayNameForStudent(student));
                dto.setStatus(student.getStatus());
                dto.setGroupId(student.getGroupId());
                dto.setGroupKey(student.getGroupKey());
                dto.setInterviewRecords(studentRecordsMap.getOrDefault(
                        student.getStudentId(), java.util.Collections.emptyList()));
                return dto;
            }).collect(java.util.stream.Collectors.toList());
            operationLogRecorder.recordQuiet(currentUserId,
                    operationLogRecorder.resolveUsername(currentUserId),
                    OperationLogActions.VIEW_GROUP_INTERVIEW_RECORDS,
                    "groupId=" + groupId + ", studentCount=" + resultList.size());
            return Result.success("获取小组学生及其访谈记录成功", resultList);
        } catch (RuntimeException e) {
            return Result.error(e.getMessage());
        }
    }

    /** 将 groupId 标签解析为 UUID 列表（复用 McpGroupService 的解析逻辑）。 */
    private List<String> resolveGroupKeys(String groupLabel, String currentUserId,
                                          String role, String majorId) {
        if ("ROLE_MENTOR".equals(role)) {
            try {
                return List.of(mcpGroupService.resolveGroupKeyForMentor(groupLabel, currentUserId));
            } catch (RuntimeException e) {
                return List.of();
            }
        }
        return mcpGroupService.resolveGroupKeysByLabel(groupLabel, majorId);
    }


}

