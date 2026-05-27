package com.bnbu.mentoring.Controller;

import com.bnbu.mentoring.DTO.RecordExportFilter;
import com.bnbu.mentoring.Service.McpGroupService;
import com.bnbu.mentoring.Service.MentoringAccessService;
import com.bnbu.mentoring.Service.RecordExportService;
import com.bnbu.mentoring.Util.SecurityRoleUtils;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;

@RestController
@RequestMapping("/api/mentoring/export")
@RequiredArgsConstructor
public class RecordExportController {

    private final RecordExportService recordExportService;
    private final MentoringAccessService mentoringAccessService;
    private final McpGroupService mcpGroupService;

    @PreAuthorize("hasAuthority('ROLE_FACULTY_CONSULTANT') or hasAuthority('ROLE_COORDINATOR') or hasAuthority('ROLE_MENTOR')")
    @GetMapping("/group/{groupId}")
    public ResponseEntity<byte[]> exportGroup(
            @PathVariable String groupId,
            @RequestHeader(value = "X-User-Id", required = false) String currentUserId,
            @RequestParam(required = false) String majorId,
            @RequestParam(required = false) String faculty,
            @RequestParam(required = false) String department,
            @RequestParam(required = false) String major) {
        String role = SecurityRoleUtils.primaryRoleCode();
        java.util.List<String> groupKeys = resolveGroupKeys(groupId, currentUserId, role, majorId);
        if (groupKeys.isEmpty()) {
            throw new RuntimeException("Group not found: " + groupId);
        }
        for (String gk : groupKeys) {
            mentoringAccessService.assertCanReadGroupRecords(currentUserId, role, gk);
        }
        var result = recordExportService.exportGroupRecordsByKeys(
                groupKeys, faculty, department, major, majorId);
        return toDownloadResponse(result);
    }

    @PreAuthorize("hasAuthority('ROLE_MENTOR')")
    @GetMapping("/student/{studentId}")
    public ResponseEntity<byte[]> exportStudent(
            @PathVariable String studentId,
            @RequestHeader(value = "X-User-Id", required = false) String currentUserId) {
        mentoringAccessService.assertMentorOwnsStudent(currentUserId, studentId);
        var result = recordExportService.exportStudentRecords(studentId);
        return toDownloadResponse(result);
    }

    /**
     * Faculty Consultant：按筛选条件导出学院范围内访谈记录 Word。
     * GET /api/mentoring/export/consultant
     */
    @PreAuthorize("hasAuthority('ROLE_FACULTY_CONSULTANT')")
    @GetMapping("/consultant")
    public ResponseEntity<byte[]> exportConsultant(
            @RequestHeader(value = "X-User-Id", required = false) String consultantId,
            @RequestParam(required = false) String studentId,
            @RequestParam(required = false) String studentKeyword,
            @RequestParam(required = false) String mentorKeyword,
            @RequestParam(required = false) Integer academicYearFrom,
            @RequestParam(required = false) Integer academicYearTo,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate dateFrom,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate dateTo,
            @RequestParam(required = false) String faculty,
            @RequestParam(required = false) String department,
            @RequestParam(required = false) String major) {
        RecordExportFilter filter = new RecordExportFilter();
        filter.setStudentId(studentId);
        filter.setStudentKeyword(studentKeyword);
        filter.setMentorKeyword(mentorKeyword);
        filter.setAcademicYearFrom(academicYearFrom);
        filter.setAcademicYearTo(academicYearTo);
        filter.setDateFrom(dateFrom);
        filter.setDateTo(dateTo);
        filter.setFaculty(faculty);
        filter.setDepartment(department);
        filter.setMajor(major);
        var result = recordExportService.exportConsultantFiltered(consultantId, filter);
        return toDownloadResponse(result);
    }

    private static ResponseEntity<byte[]> toDownloadResponse(com.bnbu.mentoring.DTO.ExportDownloadResult result) {
        // #region agent log
        exportDebugLog("H-A", "RecordExportController.toDownloadResponse",
                "http download response",
                java.util.Map.of(
                        "contentType", result.getContentType(),
                        "filename", result.getFilename(),
                        "bodyBytes", result.getData() != null ? result.getData().length : 0));
        // #endregion
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=" + result.getFilename())
                .contentType(MediaType.parseMediaType(result.getContentType()))
                .body(result.getData());
    }

    // #region agent log
    private static void exportDebugLog(String hypothesisId, String location, String message,
                                       java.util.Map<String, Object> data) {
        try {
            java.util.Map<String, Object> line = new java.util.LinkedHashMap<>();
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
    // #endregion

  private java.util.List<String> resolveGroupKeys(String groupLabel, String currentUserId,
                                                    String role, String majorId) {
        if ("ROLE_MENTOR".equals(role)) {
            try {
                return java.util.List.of(mcpGroupService.resolveGroupKeyForMentor(groupLabel, currentUserId));
            } catch (RuntimeException e) {
                return java.util.List.of();
            }
        }
        return mcpGroupService.resolveGroupKeysByLabel(groupLabel, majorId);
    }
}
