package com.bnbu.mentoring.Controller;

import com.bnbu.mentoring.DTO.ForwardCaseRequest;
import com.bnbu.mentoring.DTO.Result;
import com.bnbu.mentoring.Service.McpCaseService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/mentoring/cases")
@RequiredArgsConstructor
public class McpCaseController {

    private final McpCaseService mcpCaseService;

    @PreAuthorize("hasAuthority('ROLE_MENTOR')")
    @PostMapping
    public Result submitCase(
            @RequestHeader("X-User-Id") String mentorId,
            @RequestBody ForwardCaseRequest request) {
        if (request.getDescription() == null || request.getDescription().isBlank()) {
            return Result.error("Case description cannot be empty");
        }
        try {
            return Result.success("Case forwarded to coordinator",
                    mcpCaseService.submitByMentor(mentorId, request.getStudentId(), request.getDescription(),
                            request.getTargetCoordinatorId()));
        } catch (RuntimeException e) {
            return Result.error(e.getMessage());
        }
    }

    @PreAuthorize("hasAuthority('ROLE_COORDINATOR')")
    @PutMapping("/{caseId}/forward")
    public Result forwardToConsultant(
            @RequestHeader("X-User-Id") String coordinatorId,
            @PathVariable String caseId,
            @RequestBody ForwardCaseRequest request) {
        try {
            return Result.success("Case forwarded to consultant",
                    mcpCaseService.forwardToConsultant(caseId, coordinatorId, request.getTargetConsultantId()));
        } catch (RuntimeException e) {
            return Result.error(e.getMessage());
        }
    }

    @PreAuthorize("hasAuthority('ROLE_COORDINATOR')")
    @PutMapping("/{caseId}/reject")
    public Result rejectCase(
            @RequestHeader("X-User-Id") String coordinatorId,
            @PathVariable String caseId) {
        try {
            return Result.success("Case rejected", mcpCaseService.rejectCase(caseId, coordinatorId));
        } catch (RuntimeException e) {
            return Result.error(e.getMessage());
        }
    }

    @PreAuthorize("hasAuthority('ROLE_COORDINATOR') or hasAuthority('ROLE_FACULTY_CONSULTANT')")
    @PutMapping("/{caseId}/close")
    public Result closeCase(
            @RequestHeader("X-User-Id") String operatorId,
            @PathVariable String caseId) {
        String role = com.bnbu.mentoring.Util.SecurityRoleUtils.primaryRoleCode();
        try {
            return Result.success("Case closed", mcpCaseService.closeCase(caseId, operatorId, role));
        } catch (RuntimeException e) {
            return Result.error(e.getMessage());
        }
    }

    @PreAuthorize("hasAuthority('ROLE_MENTOR')")
    @GetMapping("/mine")
    public Result listMyCases(@RequestHeader("X-User-Id") String userId) {
        return Result.success("success", mcpCaseService.listForUser(userId, "MENTOR"));
    }

    @PreAuthorize("hasAuthority('ROLE_COORDINATOR')")
    @GetMapping("/coordinator")
    public Result listCoordinatorCases(@RequestHeader("X-User-Id") String userId) {
        return Result.success("success", mcpCaseService.listForUser(userId, "COORDINATOR"));
    }

    @PreAuthorize("hasAuthority('ROLE_FACULTY_CONSULTANT')")
    @GetMapping("/consultant")
    public Result listConsultantCases(@RequestHeader("X-User-Id") String userId) {
        return Result.success("success", mcpCaseService.listForUser(userId, "FACULTY_CONSULTANT"));
    }
}
