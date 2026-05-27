package com.bnbu.mentoring.Controller;

import com.bnbu.mentoring.DTO.Result;
import com.bnbu.mentoring.Service.McpImportService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/mentoring/import")
@RequiredArgsConstructor
@Slf4j
public class McpImportController {

    private final McpImportService mcpImportService;

    @PreAuthorize("hasAuthority('ROLE_FACULTY_CONSULTANT')")
    @PostMapping("/mcp-allocation")
    public Result importMcpAllocation(
            @RequestParam("file") MultipartFile file,
            @RequestParam(required = false) String facultyOrgId,
            @RequestHeader(value = "X-User-Id", required = false) String consultantUserId) {
        try {
            int count = mcpImportService.importMcpAllocation(file, facultyOrgId, consultantUserId);
            return Result.success("Imported rows: " + count, count);
        } catch (RuntimeException e) {
            log.warn("[importMcpAllocation] rejected: {}", e.getMessage());
            return Result.fail(400, e.getMessage());
        }
    }

    @PreAuthorize("hasAuthority('ROLE_FACULTY_CONSULTANT')")
    @PostMapping("/coordinators")
    public Result importCoordinators(@RequestParam("file") MultipartFile file) {
        int count = mcpImportService.importCoordinators(file);
        return Result.success("Imported coordinators: " + count, count);
    }
}
