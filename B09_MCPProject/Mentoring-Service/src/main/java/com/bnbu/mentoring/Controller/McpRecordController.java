package com.bnbu.mentoring.Controller;

import com.bnbu.mentoring.DTO.Result;
import com.bnbu.mentoring.Entity.McpRecord;
import com.bnbu.mentoring.Service.McpRecordService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;
import java.util.List;
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
}
