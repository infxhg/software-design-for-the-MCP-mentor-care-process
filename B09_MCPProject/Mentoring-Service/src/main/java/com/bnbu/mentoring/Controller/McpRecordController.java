package com.bnbu.mentoring.Controller;

import com.bnbu.mentoring.Client.UserServiceClient;
import com.bnbu.mentoring.DTO.Result;
import com.bnbu.mentoring.DTO.UserSearchRequestDTO;
import com.bnbu.mentoring.Entity.McpRecord;
import com.bnbu.mentoring.Service.McpRecordService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;
import java.util.List;
import java.util.stream.Collectors;
import com.bnbu.mentoring.Service.McpStudentExtService;

@RestController
@RequestMapping("/api/mentoring/records")
public class McpRecordController {

    @Autowired
    private McpRecordService mcpRecordService;

    /**
     * 新增或编辑访谈记录 (供 Mentor 使用)
     * POST /api/mentoring/records
     */
    @org.springframework.security.access.prepost.PreAuthorize("hasAuthority('ROLE_MENTOR')")
    @PostMapping
    public Result saveOrUpdateRecord(@RequestBody McpRecord record, @RequestHeader(value = "X-User-Id", required = false) String currentMentorId) {
        if (currentMentorId == null || currentMentorId.isEmpty()) {
            // 这里为了本地测试方便，如果网关没传 X-User-Id，可以模拟一个或者抛错
            // currentMentorId = "test-mentor-id";
            return Result.error("未获取到当前登录的导师ID，请通过网关访问");
        }

        try {
            boolean success = mcpRecordService.saveOrUpdateRecord(record, currentMentorId);
            if (success) {
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
        return Result.success("获取成功", records);
    }

    /**
     * 根据学生ID获取该学生的历史访谈记录 (供 Faculty Consultant / Coordinator 使用)
     * GET /api/mentoring/records/student/{studentId}
     */
    @org.springframework.security.access.prepost.PreAuthorize("hasAuthority('ROLE_FACULTY_CONSULTANT') or hasAuthority('ROLE_COORDINATOR')")
    @GetMapping("/student/{studentId}")
    public Result getRecordsByStudent(@PathVariable String studentId) {
        return Result.success("获取成功", mcpRecordService.lambdaQuery().eq(McpRecord::getStudentId, studentId).list());
    }

    /**
     * 根据记录ID获取详情
     * GET /api/mentoring/records/{recordId}
     */
    @org.springframework.security.access.prepost.PreAuthorize("hasAuthority('ROLE_FACULTY_CONSULTANT') or hasAuthority('ROLE_COORDINATOR') or hasAuthority('ROLE_MENTOR')")
    @GetMapping("/{recordId}")
    public Result getRecordDetail(@PathVariable String recordId) {
        McpRecord record = mcpRecordService.getById(recordId);
        if (record == null) {
            return Result.error("记录不存在");
        }
        return Result.success("获取成功", record);
    }
    @Autowired
    private McpStudentExtService mcpStudentExtService;

    @Autowired
    private UserServiceClient userServiceClient;

    /**
     * 按照小组范围查看组内学生及其访谈记录的功能
     * GET /api/mentoring/records/group/{groupId}
     */
    @org.springframework.security.access.prepost.PreAuthorize("hasAuthority('ROLE_MENTOR') or hasAuthority('ROLE_COORDINATOR')")
    @GetMapping("/group/{groupId}")
    public Result getRecordsByGroup(@PathVariable String groupId) {
        // 1. 获取该小组内的所有学生
        List<com.bnbu.mentoring.Entity.McpStudentExt> students = mcpStudentExtService.lambdaQuery()
                .eq(com.bnbu.mentoring.Entity.McpStudentExt::getGroupId, groupId)
                .list();

        if (students == null || students.isEmpty()) {
            return Result.success("该小组内无学生", java.util.Collections.emptyList());
        }

        // 2. 获取该小组的所有访谈记录 (或者可以按学生ID获取)
        // 为了方便，这里直接按组获取，然后在内存中根据学生分组
        List<McpRecord> groupRecords = mcpRecordService.lambdaQuery()
                .eq(McpRecord::getGroupId, groupId)
                .list();

        java.util.Map<String, List<McpRecord>> studentRecordsMap = groupRecords.stream()
                .collect(java.util.stream.Collectors.groupingBy(McpRecord::getStudentId));

        // 3. 组装 DTO
        List<com.bnbu.mentoring.DTO.StudentGroupRecordDTO> resultList = students.stream().map(student -> {
            com.bnbu.mentoring.DTO.StudentGroupRecordDTO dto = new com.bnbu.mentoring.DTO.StudentGroupRecordDTO();
            dto.setStudentId(student.getStudentId());
            dto.setMajorId(student.getMajorId());
            dto.setStatus(student.getStatus());
            dto.setGroupId(student.getGroupId());
            dto.setInterviewRecords(studentRecordsMap.getOrDefault(student.getStudentId(), java.util.Collections.emptyList()));
            return dto;
        }).collect(java.util.stream.Collectors.toList());

        return Result.success("获取小组学生及其访谈记录成功", resultList);
    }

    /**
     * Mentor 按学生ID精确搜索 —— 严格限制只能搜索自己所在组的学生
     * GET /api/mentoring/records/students/search?studentId=xxxxxxxxx
     *
     * 流程：
     *  1. 从 mcp_record 中查出当前 Mentor 负责的所有 groupId
     *  2. 验证目标 studentId 是否存在于这些组的 mcp_student_ext 记录中
     *  3. 校验通过后，通过 Feign 调用 User-Service 按 ID 精确获取用户详情
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

        // Step 1: 找出该 Mentor 负责的所有 groupId
        List<McpRecord> mentorRecords = mcpRecordService.lambdaQuery()
                .eq(McpRecord::getMentorId, currentMentorId)
                .select(McpRecord::getGroupId)
                .list();

        List<String> groupIds = mentorRecords.stream()
                .map(McpRecord::getGroupId)
                .filter(gid -> gid != null && !gid.isEmpty())
                .distinct()
                .collect(Collectors.toList());

        if (groupIds.isEmpty()) {
            return Result.error("该导师尚未负责任何小组，无权查询学生信息");
        }

        // Step 2: 验证目标学生是否属于该 Mentor 的组
        boolean isInGroup = mcpStudentExtService.lambdaQuery()
                .eq(com.bnbu.mentoring.Entity.McpStudentExt::getStudentId, studentId)
                .in(com.bnbu.mentoring.Entity.McpStudentExt::getGroupId, groupIds)
                .exists();

        if (!isInGroup) {
            return Result.error("权限不足：该学生不属于您负责的任何小组");
        }

        // Step 3: 通过 Feign 调用 User-Service 按 ID 精确获取用户详情
        UserSearchRequestDTO searchDTO = new UserSearchRequestDTO();
        searchDTO.setRoleCode("STUDENT");
        searchDTO.setUserIds(java.util.Collections.singletonList(studentId));

        try {
            Result userResult = userServiceClient.searchUsersByConditions(searchDTO);
            return Result.success("查询成功", userResult.getData());
        } catch (Exception e) {
            return Result.error("调用用户服务失败：" + e.getMessage());
        }
    }
}

