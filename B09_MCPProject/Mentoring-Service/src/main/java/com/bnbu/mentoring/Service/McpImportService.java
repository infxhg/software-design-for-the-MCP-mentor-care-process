package com.bnbu.mentoring.Service;

import com.bnbu.mentoring.Client.OrgServiceClient;
import com.bnbu.mentoring.Client.UserServiceClient;
import com.bnbu.mentoring.DTO.BindUserOrgRequest;
import com.bnbu.mentoring.Common.StudentMentoringStatus;
import com.bnbu.mentoring.DTO.EnsureUserRequest;
import com.bnbu.mentoring.DTO.McpGroupDTO;
import com.bnbu.mentoring.DTO.Result;
import com.bnbu.mentoring.DTO.UserSearchRequestDTO;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.poi.ss.usermodel.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;

import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardOpenOption;
import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.regex.Pattern;

@Service
@RequiredArgsConstructor
@Slf4j
public class McpImportService {

    private static final Pattern NINE_DIGIT_ID = Pattern.compile("^\\d{9}$");

    private final UserServiceClient userServiceClient;
    private final OrgServiceClient orgServiceClient;
    private final McpGroupService mcpGroupService;

    @Transactional
    public int importMcpAllocation(MultipartFile file, String facultyOrgId, String consultantUserId) {
        String resolvedFacultyOrgId = resolveFacultyOrgIdForImport(facultyOrgId, consultantUserId);
        int rows = 0;
        try (InputStream in = file.getInputStream();
             Workbook workbook = WorkbookFactory.create(in)) {
            Sheet sheet = workbook.getSheetAt(0);
            Map<String, AllocationRow> rowsByStudent = parseAllocationRows(sheet);
            // #region agent log
            debugLog("import", "McpImportService.importMcpAllocation", "parsed rows", Map.of(
                    "uniqueStudents", rowsByStudent.size(),
                    "facultyOrgId", resolvedFacultyOrgId != null ? resolvedFacultyOrgId : ""));
            // #endregion
            for (AllocationRow row : rowsByStudent.values()) {
                processAllocationRow(row, resolvedFacultyOrgId);
                rows++;
            }
        } catch (RuntimeException e) {
            log.warn("[importMcpAllocation] failed: {}", e.getMessage());
            throw e;
        } catch (Exception e) {
            log.warn("[importMcpAllocation] failed: {}", e.getMessage(), e);
            throw new RuntimeException("Import failed: " + e.getMessage(), e);
        }
        return rows;
    }

    private Map<String, AllocationRow> parseAllocationRows(Sheet sheet) {
        Map<String, AllocationRow> rowsByStudent = new LinkedHashMap<>();
        int rowNum = 0;
        for (Row row : sheet) {
            rowNum++;
            String studentId = cell(row, 0);
            String studentName = cell(row, 1);
            String major = cell(row, 2);
            String status = cell(row, 3);
            String groupId = cell(row, 4);
            String mentorName = cell(row, 5);
            // col 6 = Office（展示用，跳过）
            String mentorEmail = cell(row, 7);

            if (isHeaderRow(rowNum, studentId, groupId)) {
                continue;
            }
            if (isBlank(studentId) && isBlank(groupId)) {
                continue;
            }
            if (isBlank(studentId) || isBlank(groupId)) {
                throw new RuntimeException("Row " + rowNum + ": studentId and groupId are required");
            }

            String sid = normalizeStudentId(studentId, rowNum);
            rowsByStudent.put(sid, new AllocationRow(
                    rowNum, sid, studentName, major, status, groupId.trim(), mentorName, mentorEmail));
        }
        return rowsByStudent;
    }

    private void processAllocationRow(AllocationRow row, String facultyOrgId) {
        String mentorId = resolveMentorId(row.mentorEmail(), row.mentorName());
        if (!StringUtils.hasText(mentorId)
                && (StringUtils.hasText(row.mentorEmail()) || StringUtils.hasText(row.mentorName()))) {
            throw new RuntimeException("Row " + row.rowNum() + ": mentor not found for "
                    + (StringUtils.hasText(row.mentorEmail()) ? row.mentorEmail() : row.mentorName()));
        }

        McpGroupDTO group = mcpGroupService.ensureGroup(
                row.groupLabel(), mentorId, row.major(), row.groupLabel());
        String groupKey = StringUtils.hasText(group.getGroupKey()) ? group.getGroupKey() : group.getGroupId();

        EnsureUserRequest studentReq = new EnsureUserRequest();
        studentReq.setId(row.studentId());
        studentReq.setUsername(row.studentId());
        studentReq.setRealName(row.studentName());
        studentReq.setRoleCode("STUDENT");
        studentReq.setEmail(row.studentId() + "@mail.bnbu.edu.cn");
        // #region agent log
        debugLog("H1", "McpImportService.processAllocationRow", "ensure-user request",
                Map.of("rowNum", row.rowNum(), "fileStudentId", row.studentId(),
                        "requestId", studentReq.getId() != null ? studentReq.getId() : ""));
        // #endregion
        String ensuredStudentId = ensureAndGetUserId(studentReq);
        if (!row.studentId().equals(ensuredStudentId)) {
            throw new RuntimeException("Row " + row.rowNum() + ": user id mismatch, file="
                    + row.studentId() + " ensured=" + ensuredStudentId);
        }
        // #region agent log
        debugLog("H3", "McpImportService.processAllocationRow", "ensure-user result",
                Map.of("rowNum", row.rowNum(), "fileStudentId", row.studentId(),
                        "ensuredStudentId", ensuredStudentId));
        // #endregion
        bindUserOrgQuietly(ensuredStudentId, row.major());

        String mentoringStatus;
        try {
            mentoringStatus = StudentMentoringStatus.resolveForInsert(row.status());
        } catch (IllegalArgumentException e) {
            throw new RuntimeException("Row " + row.rowNum() + ": " + e.getMessage());
        }
        mcpGroupService.addMemberFromImport(groupKey, ensuredStudentId, row.major(), mentoringStatus);
    }

    private String resolveFacultyOrgIdForImport(String facultyOrgId, String consultantUserId) {
        if (StringUtils.hasText(facultyOrgId)) {
            return facultyOrgId.trim();
        }
        if (!StringUtils.hasText(consultantUserId)) {
            throw new RuntimeException(
                    "facultyOrgId is required when creating a new group (or login via gateway with X-User-Id)");
        }
        List<String> facultyIds = listFacultyOrgIdsForConsultant(consultantUserId.trim());
        if (facultyIds.isEmpty()) {
            throw new RuntimeException(
                    "Cannot resolve faculty: FC account is not bound to a FACULTY organization node");
        }
        if (facultyIds.size() > 1) {
            throw new RuntimeException(
                    "Multiple faculties found for this FC; please pass facultyOrgId explicitly: " + facultyIds);
        }
        return facultyIds.get(0);
    }

    private List<String> listFacultyOrgIdsForConsultant(String consultantUserId) {
        try {
            Result res = orgServiceClient.listFacultyOrgIdsForConsultant(consultantUserId);
            if (res == null || res.getCode() == null || res.getCode() != 200 || res.getData() == null) {
                return List.of();
            }
            if (res.getData() instanceof List<?> list) {
                List<String> ids = new ArrayList<>();
                for (Object item : list) {
                    if (item != null) {
                        ids.add(String.valueOf(item));
                    }
                }
                return ids;
            }
        } catch (Exception ignored) {
            // fall through
        }
        return List.of();
    }

    private boolean isHeaderRow(int rowNum, String studentId, String groupId) {
        String first = studentId != null ? studentId.trim().toLowerCase() : "";
        return first.contains("student") && first.contains("id");
    }

    @Transactional
    public int importCoordinators(MultipartFile file) {
        int rows = 0;
        try (InputStream in = file.getInputStream(); Workbook workbook = WorkbookFactory.create(in)) {
            Sheet sheet = workbook.getSheetAt(0);
            boolean headerSkipped = false;
            for (Row row : sheet) {
                if (!headerSkipped) {
                    headerSkipped = true;
                    continue;
                }
                String name = cell(row, 0);
                String email = cell(row, 1);
                String department = cell(row, 2);
                if (isBlank(email)) {
                    continue;
                }
                EnsureUserRequest req = new EnsureUserRequest();
                req.setUsername(email.trim());
                req.setEmail(email.trim());
                req.setRealName(name);
                req.setRoleCode("COORDINATOR");
                String coordinatorId = ensureAndGetUserId(req);
                if (StringUtils.hasText(department)) {
                    bindUserOrgQuietly(coordinatorId, department.trim());
                }
                rows++;
            }
        } catch (RuntimeException e) {
            throw e;
        } catch (Exception e) {
            throw new RuntimeException("Coordinator import failed: " + e.getMessage());
        }
        return rows;
    }

    private String ensureAndGetUserId(EnsureUserRequest request) {
        Result res = userServiceClient.ensureUser(request);
        if (res == null || res.getCode() == null || res.getCode() != 200) {
            throw new RuntimeException("ensure-user failed: " + (res != null ? res.getMessage() : "no response"));
        }
        String id = extractUserId(res.getData());
        if (!StringUtils.hasText(id)) {
            throw new RuntimeException("ensure-user did not return user id");
        }
        return id;
    }

    private void bindUserOrgQuietly(String userId, String orgUnitIdOrName) {
        if (!StringUtils.hasText(userId) || !StringUtils.hasText(orgUnitIdOrName)) {
            return;
        }
        try {
            BindUserOrgRequest bind = new BindUserOrgRequest();
            bind.setUserId(userId);
            bind.setOrgUnitIdOrName(orgUnitIdOrName);
            bind.setPrimary(true);
            orgServiceClient.bindUserOrg(bind);
        } catch (Exception ignored) {
            // 组织名未配置时不阻断导入主流程
        }
    }

    private String extractUserId(Object data) {
        if (data == null) {
            return null;
        }
        if (data instanceof Map<?, ?> map) {
            Object id = map.get("id");
            return id != null ? String.valueOf(id) : null;
        }
        try {
            var getter = data.getClass().getMethod("getId");
            Object id = getter.invoke(data);
            return id != null ? String.valueOf(id) : null;
        } catch (ReflectiveOperationException ignored) {
            return null;
        }
    }

    /**
     * Excel 学号列规范为 9 位纯数字，与文件中一致（禁止后续随机生成替代）。
     */
    private String normalizeStudentId(String raw, int rowNum) {
        if (raw == null || raw.isBlank()) {
            throw new RuntimeException("Row " + rowNum + ": studentId is required");
        }
        String s = raw.trim();
        if (s.matches("^\\d+\\.0+$")) {
            s = s.substring(0, s.indexOf('.'));
        }
        if (s.matches("(?i)^\\d+(\\.\\d+)?[eE][+-]?\\d+$")) {
            try {
                s = new BigDecimal(s).toPlainString();
                if (s.contains(".")) {
                    s = s.substring(0, s.indexOf('.'));
                }
            } catch (NumberFormatException e) {
                throw new RuntimeException("Row " + rowNum + ": invalid studentId: " + raw);
            }
        }
        if (!NINE_DIGIT_ID.matcher(s).matches()) {
            throw new RuntimeException("Row " + rowNum + ": studentId must be exactly 9 digits, got: " + raw);
        }
        return s;
    }

    private String resolveMentorId(String mentorEmail, String mentorName) {
        // 「Mentor」列常为登录名 mentor_new_xxx：优先于邮箱解析，避免邮箱单元格异常/过短时 LIKE 命中多名导师
        if (looksLikeMentorLoginToken(mentorName)) {
            String id = firstUserId(searchMentorsByKeyword(mentorName.trim()));
            if (id != null) {
                // #region agent log
                debugLog("H-mentor", "McpImportService.resolveMentorId", "resolved from mentor column",
                        Map.of("source", "mentorName", "keyword", mentorName.trim(), "mentorId", id));
                // #endregion
                return id;
            }
        }
        if (!isBlank(mentorEmail)) {
            UserSearchRequestDTO dto = new UserSearchRequestDTO();
            dto.setRoleCode("MENTOR");
            dto.setKeyword(mentorEmail.trim());
            Result res = userServiceClient.searchUsersByConditions(dto);
            String id = firstUserId(res);
            if (id != null) {
                // #region agent log
                debugLog("H-mentor", "McpImportService.resolveMentorId", "resolved from email",
                        Map.of("source", "mentorEmail", "keyword", mentorEmail.trim(), "mentorId", id));
                // #endregion
                return id;
            }
        }
        if (!isBlank(mentorName)) {
            UserSearchRequestDTO dto = new UserSearchRequestDTO();
            dto.setRoleCode("MENTOR");
            dto.setKeyword(mentorName.trim());
            Result res = userServiceClient.searchUsersByConditions(dto);
            String id = firstUserId(res);
            if (id != null) {
                debugLog("H-mentor", "McpImportService.resolveMentorId", "resolved from mentor name fuzzy",
                        Map.of("source", "mentorName", "keyword", mentorName.trim(), "mentorId", id));
            }
            return id;
        }
        return null;
    }

    /** Excel「Mentor」列：登录名 mentor_new_xxx 或纯 token，优先走精确 id/username 查询 */
    private static boolean looksLikeMentorLoginToken(String s) {
        if (s == null || s.isBlank()) {
            return false;
        }
        String t = s.trim();
        return t.matches("^[A-Za-z0-9_.-]{5,}$");
    }

    private Result searchMentorsByKeyword(String keyword) {
        UserSearchRequestDTO dto = new UserSearchRequestDTO();
        dto.setRoleCode("MENTOR");
        dto.setKeyword(keyword);
        return userServiceClient.searchUsersByConditions(dto);
    }

    private String firstUserId(Result res) {
        if (res != null && res.getData() instanceof List<?> list && !list.isEmpty()) {
            Object first = list.get(0);
            if (first instanceof Map<?, ?> map && map.get("id") != null) {
                return String.valueOf(map.get("id"));
            }
        }
        return null;
    }

    private final DataFormatter dataFormatter = new DataFormatter();

    private String cell(Row row, int idx) {
        if (row == null) {
            return "";
        }
        Cell cell = row.getCell(idx, Row.MissingCellPolicy.RETURN_BLANK_AS_NULL);
        if (cell == null) {
            return "";
        }
        if (cell.getCellType() == CellType.NUMERIC) {
            double d = cell.getNumericCellValue();
            if (d == Math.floor(d) && !Double.isInfinite(d)) {
                return String.format("%.0f", d);
            }
        }
        String formatted = dataFormatter.formatCellValue(cell).trim();
        if (formatted.matches("^\\d+\\.0+$")) {
            return formatted.substring(0, formatted.indexOf('.'));
        }
        return formatted;
    }

    private boolean isBlank(String s) {
        return s == null || s.isBlank();
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

    private record AllocationRow(
            int rowNum,
            String studentId,
            String studentName,
            String major,
            String status,
            String groupLabel,
            String mentorName,
            String mentorEmail) {
    }
}
