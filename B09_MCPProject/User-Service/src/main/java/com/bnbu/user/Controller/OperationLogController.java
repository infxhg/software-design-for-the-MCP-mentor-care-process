package com.bnbu.user.Controller;

import com.bnbu.user.DTO.OperationLogVO;
import com.bnbu.user.DTO.Result;
import com.bnbu.user.Service.OperationLogService;
import com.bnbu.user.Service.MentoringStudentScopeClient;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * Supporting Staff：查看系统操作日志（RB-STA-02 / F-13）
 */
@RestController
@RequestMapping("/api/user/logs")
public class OperationLogController {

    @Autowired
    private OperationLogService operationLogService;

    @Autowired
    private MentoringStudentScopeClient mentoringStudentScopeClient;

    @GetMapping
    @PreAuthorize("hasAuthority('ROLE_SUPPORT_STAFF') or hasAuthority('ROLE_ADMIN')")
    public Result search(
            @RequestParam(required = false) String userId,
            @RequestParam(required = false) String action,
            @RequestParam(required = false) String startTime,
            @RequestParam(required = false) String endTime) {
        List<OperationLogVO> logs = operationLogService.search(userId, action, startTime, endTime);
        if (logs.isEmpty()) {
            return Result.success("No log found", logs);
        }
        return Result.success("Successfully fetched operation logs", logs);
    }

    @GetMapping("/faculty")
    @PreAuthorize("hasAuthority('ROLE_FACULTY_CONSULTANT')")
    public Result searchFacultyLogs(
            @RequestParam(required = false) String action,
            @RequestParam(required = false) String startTime,
            @RequestParam(required = false) String endTime,
            @RequestParam(required = false) List<String> studentIds,
            @org.springframework.web.bind.annotation.RequestHeader(value = "X-User-Id", required = false) String consultantId) {
        if (consultantId == null || consultantId.isBlank()) {
            return Result.error("未获取到当前登录 FC ID，请通过网关传递 X-User-Id");
        }
        if (studentIds == null || studentIds.isEmpty()) {
            return Result.error("studentIds 不能为空；未指定学号时不返回全校日志以避免越权");
        }
        List<String> allowed = mentoringStudentScopeClient.filterStudentIdsForFacultyConsultant(
                consultantId.trim(), studentIds);
        if (allowed.isEmpty()) {
            return Result.success("No log found", List.of());
        }
        List<OperationLogVO> logs = operationLogService.searchForUserIds(allowed, action, startTime, endTime);
        if (logs.isEmpty()) {
            return Result.success("No log found", logs);
        }
        return Result.success("Successfully fetched operation logs", logs);
    }
}
