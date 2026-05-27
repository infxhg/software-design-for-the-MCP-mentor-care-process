package com.bnbu.mentoring.Service;

import com.bnbu.mentoring.Client.UserServiceClient;
import com.bnbu.mentoring.DTO.ExportDownloadResult;
import com.bnbu.mentoring.DTO.RecordExportFilter;
import com.bnbu.mentoring.DTO.Result;
import com.bnbu.mentoring.DTO.UserSearchRequestDTO;
import com.bnbu.mentoring.Entity.McpRecord;
import com.bnbu.mentoring.Entity.McpStudentExt;
import com.bnbu.mentoring.Util.AcademicYearUtils;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import org.apache.poi.xwpf.usermodel.*;
import org.openxmlformats.schemas.wordprocessingml.x2006.main.CTTcBorders;
import org.openxmlformats.schemas.wordprocessingml.x2006.main.CTTcPr;
import org.openxmlformats.schemas.wordprocessingml.x2006.main.STBorder;
import java.math.BigInteger;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.stream.Collectors;
import java.util.zip.ZipEntry;
import java.util.zip.ZipOutputStream;

@Service
@RequiredArgsConstructor
public class RecordExportService {

    private static final DateTimeFormatter EXPORT_DATE = DateTimeFormatter.ofPattern("M/d/yyyy");

    private final McpRecordService mcpRecordService;
    private final McpStudentExtService mcpStudentExtService;
    private final MentoringAccessService mentoringAccessService;
    private final McpGroupService mcpGroupService;
    private final UserServiceClient userServiceClient;
    private final ObjectMapper objectMapper;

    public ExportDownloadResult exportGroupRecords(String groupLabel, String majorId, String faculty,
                                                   String department, String major, String currentUserId, String role) {
        List<String> groupKeys = resolveGroupKeysForExport(groupLabel, majorId, currentUserId, role);
        return exportGroupRecordsByKeys(groupKeys, faculty, department, major, majorId);
    }

    public ExportDownloadResult exportGroupRecordsByKeys(List<String> groupKeys, String faculty,
                                                         String department, String major,
                                                         String majorIdQuery) {
        if (groupKeys == null || groupKeys.isEmpty()) {
            ExportHeader header = resolveHeader(faculty, department, major, majorIdQuery, List.of());
            return ExportDownloadResult.docx(buildDocumentBytes(header, List.of()), "group-records.docx");
        }
        Set<String> orgScope = resolveOrgScope(faculty, department, major);
        List<String> effectiveGroupKeys = filterGroupKeysByOrgScope(groupKeys, orgScope);
        if (effectiveGroupKeys.isEmpty()) {
            ExportHeader header = resolveHeader(faculty, department, major, majorIdQuery, List.of());
            return ExportDownloadResult.docx(buildDocumentBytes(header, List.of()), "group-records.docx");
        }
        Set<String> studentIds = collectStudentsFromGroupKeys(effectiveGroupKeys).stream()
                .map(McpStudentExt::getStudentId)
                .filter(StringUtils::hasText)
                .collect(Collectors.toCollection(LinkedHashSet::new));
        RecordExportFilter filter = new RecordExportFilter();
        filter.setFaculty(faculty);
        filter.setDepartment(department);
        filter.setMajor(major);
        List<McpRecord> filtered = filterRecordsForExport(studentIds, filter, orgScope);
        return buildExportFromFilteredRecords(faculty, department, major, majorIdQuery, "group-records", filtered);
    }

    public ExportDownloadResult exportStudentRecords(String studentId) {
        McpStudentExt ext = mcpStudentExtService.getById(studentId);
        String majorCode = ext != null ? nullToEmpty(mcpGroupService.resolveMajorDisplayNameForStudent(ext)) : "";
        List<McpRecord> records = mcpRecordService.lambdaQuery()
                .eq(McpRecord::getStudentId, studentId)
                .orderByAsc(McpRecord::getInterviewDate)
                .orderByAsc(McpRecord::getInterviewTime)
                .list();
        Map<String, String> names = resolveUserDisplayNames(List.of(studentId));
        String studentName = names.getOrDefault(studentId, studentId);
        List<InterviewExportEntry> entries = buildEntriesForStudent(studentId, studentName, records);
        ExportHeader header = resolveHeader(null, null, majorCode, null,
                ext != null ? List.of(ext) : List.of());
        byte[] doc = buildDocumentBytes(header, entries);
        return ExportDownloadResult.docx(doc, "student-" + studentId + "-records.docx");
    }

    /**
     * Faculty Consultant：按学院范围内学生访谈记录筛选并导出。
     * 不同专业分不同 Word 文件（多专业时打包为 zip）。
     */
    public ExportDownloadResult exportConsultantFiltered(String consultantId, RecordExportFilter filter) {
        Set<String> scopeStudentIds = mentoringAccessService.listStudentIdsInFacultyConsultantScope(consultantId);
        if (scopeStudentIds.isEmpty()) {
            return emptyConsultantExport(filter);
        }

        Set<String> targetStudentIds = resolveTargetStudentIds(scopeStudentIds, filter);
        if (targetStudentIds.isEmpty()) {
            return emptyConsultantExport(filter);
        }

        Set<String> orgScope = resolveOrgScope(filter.getFaculty(), filter.getDepartment(), filter.getMajor());
        if (orgScope != null) {
            targetStudentIds = targetStudentIds.stream()
                    .filter(sid -> isStudentInOrgScope(mcpStudentExtService.getById(sid), orgScope))
                    .collect(Collectors.toCollection(LinkedHashSet::new));
            if (targetStudentIds.isEmpty()) {
                return emptyConsultantExport(filter);
            }
        }

        List<McpRecord> filtered = filterRecordsForExport(targetStudentIds, filter, orgScope);
        return buildExportFromFilteredRecords(
                filter.getFaculty(),
                filter.getDepartment(),
                filter.getMajor(),
                null,
                "consultant-records",
                filtered);
    }

    private ExportDownloadResult emptyConsultantExport(RecordExportFilter filter) {
        return ExportDownloadResult.docx(
                buildConsultantDocumentBytes(filter, List.of()),
                "consultant-records.docx");
    }

    private ExportDownloadResult buildExportFromFilteredRecords(String faculty, String department, String majorParam,
                                                                String majorIdQuery, String filenamePrefix,
                                                                List<McpRecord> filteredRecords) {
        if (filteredRecords == null || filteredRecords.isEmpty()) {
            ExportHeader header = resolveHeader(faculty, department, majorParam, majorIdQuery, List.of());
            return ExportDownloadResult.docx(buildDocumentBytes(header, List.of()),
                    filenamePrefix + ".docx");
        }

        Map<String, List<McpRecord>> byStudent = filteredRecords.stream()
                .collect(Collectors.groupingBy(McpRecord::getStudentId, LinkedHashMap::new, Collectors.toList()));

        List<McpStudentExt> studentRows = byStudent.keySet().stream()
                .map(mcpStudentExtService::getById)
                .filter(Objects::nonNull)
                .toList();

        if (StringUtils.hasText(majorParam)) {
            String majorLabel = mcpGroupService.resolveMajorDisplayName(majorParam.trim());
            RecordExportFilter headerFilter = new RecordExportFilter();
            headerFilter.setFaculty(faculty);
            headerFilter.setDepartment(department);
            headerFilter.setMajor(majorLabel);
            byte[] doc = buildConsultantDocumentBytes(headerFilter, filteredRecords);
            return ExportDownloadResult.docx(doc,
                    filenamePrefix + "-" + sanitizeFilename(majorLabel) + ".docx");
        }

        return buildExportByMajor(studentRows, faculty, department, null, majorIdQuery, filenamePrefix, byStudent);
    }

    private List<McpRecord> filterRecordsForExport(Set<String> studentIds, RecordExportFilter filter,
                                                     Set<String> orgScope) {
        if (studentIds == null || studentIds.isEmpty()) {
            return List.of();
        }
        Set<String> mentorIdFilter = resolveMentorIdsByKeyword(filter.getMentorKeyword());
        return mcpRecordService.lambdaQuery()
                .in(McpRecord::getStudentId, studentIds)
                .list()
                .stream()
                .filter(r -> mentorIdFilter == null || mentorIdFilter.contains(r.getMentorId()))
                .filter(r -> isRecordInOrgScope(r, orgScope))
                .filter(r -> matchesDateRange(r, filter))
                .filter(r -> matchesAcademicYear(r, filter))
                .sorted(Comparator
                        .comparing(McpRecord::getStudentId, Comparator.nullsLast(String::compareTo))
                        .thenComparing(McpRecord::getInterviewDate, Comparator.nullsLast(LocalDate::compareTo)))
                .toList();
    }

    // ── 按专业拆分：一专业一文件 ─────────────────────────────────────────────

    private ExportDownloadResult buildExportByMajor(List<McpStudentExt> students, String faculty, String department,
                                                    String majorOverride, String majorIdQuery,
                                                    String filenamePrefix) {
        return buildExportByMajor(students, faculty, department, majorOverride, majorIdQuery, filenamePrefix, null);
    }

    private ExportDownloadResult buildExportByMajor(List<McpStudentExt> students, String faculty, String department,
                                                    String majorOverride, String majorIdQuery, String filenamePrefix,
                                                    Map<String, List<McpRecord>> preloadedByStudent) {
        Map<String, List<McpStudentExt>> byMajor = new LinkedHashMap<>();
        for (McpStudentExt s : students) {
            String code = resolveMajorCode(s, majorOverride);
            byMajor.computeIfAbsent(code, k -> new ArrayList<>()).add(s);
        }

        Set<String> allStudentIds = students.stream().map(McpStudentExt::getStudentId).filter(StringUtils::hasText).collect(Collectors.toSet());
        Map<String, List<McpRecord>> recordsByStudent = preloadedByStudent != null
                ? preloadedByStudent
                : loadRecordsByStudentIds(allStudentIds);
        Map<String, String> displayNames = resolveUserDisplayNames(new ArrayList<>(allStudentIds));

        // #region agent log
        String sampleName = displayNames.values().stream().filter(StringUtils::hasText).findFirst().orElse("");
        boolean sampleHasCjk = sampleName.codePoints().anyMatch(cp -> cp >= 0x4E00 && cp <= 0x9FFF);
        exportDebugLog("H-A", "RecordExportService.buildExportByMajor",
                "export shape",
                Map.of(
                        "majorCount", byMajor.size(),
                        "willZip", byMajor.size() > 1,
                        "filenamePrefix", filenamePrefix,
                        "sampleNameLen", sampleName.length(),
                        "sampleHasCjk", sampleHasCjk));
        exportDebugLog("H-B", "RecordExportService.buildExportByMajor",
                "display name encoding probe",
                Map.of("sampleHasCjk", sampleHasCjk, "sampleNameLen", sampleName.length()));
        // #endregion

        if (byMajor.size() == 1) {
            Map.Entry<String, List<McpStudentExt>> only = byMajor.entrySet().iterator().next();
            String majorCode = only.getKey();
            List<InterviewExportEntry> entries = buildEntriesForMajor(only.getValue(), recordsByStudent, displayNames);
            ExportHeader header = resolveHeader(faculty, department, majorOverride, majorIdQuery, only.getValue());
            header = header.withMajor(majorCode);
            byte[] doc = buildDocumentBytes(header, entries);
            ExportDownloadResult single = ExportDownloadResult.docx(doc, filenamePrefix + "-" + sanitizeFilename(majorCode) + ".docx");
            // #region agent log
            exportDebugLog("H-A", "RecordExportService.buildExportByMajor", "returning docx",
                    Map.of("filename", single.getFilename(), "contentType", single.getContentType(), "bytes", doc.length));
            // #endregion
            return single;
        }

        Map<String, byte[]> zipEntries = new LinkedHashMap<>();
        for (Map.Entry<String, List<McpStudentExt>> e : byMajor.entrySet()) {
            String majorCode = e.getKey();
            List<InterviewExportEntry> entries = buildEntriesForMajor(e.getValue(), recordsByStudent, displayNames);
            ExportHeader header = resolveHeader(faculty, department, majorOverride, majorIdQuery, e.getValue());
            header = header.withMajor(majorCode);
            zipEntries.put(sanitizeFilename(majorCode) + "-records.docx",
                    buildDocumentBytes(header, entries));
        }
        try {
            byte[] zipBytes = buildZip(zipEntries);
            ExportDownloadResult zipped = ExportDownloadResult.zip(zipBytes, filenamePrefix + "-by-major.zip");
            // #region agent log
            exportDebugLog("H-A", "RecordExportService.buildExportByMajor", "returning zip",
                    Map.of("filename", zipped.getFilename(), "contentType", zipped.getContentType(),
                            "bytes", zipBytes.length, "zipEntryCount", zipEntries.size()));
            // #endregion
            return zipped;
        } catch (IOException ex) {
            throw new RuntimeException("Export zip failed: " + ex.getMessage(), ex);
        }
    }

    private List<InterviewExportEntry> buildEntriesForMajor(List<McpStudentExt> students,
                                                            Map<String, List<McpRecord>> recordsByStudent,
                                                            Map<String, String> displayNames) {
        List<InterviewExportEntry> entries = new ArrayList<>();
        List<McpStudentExt> sorted = students.stream()
                .sorted(Comparator.comparing(s -> displayNames.getOrDefault(s.getStudentId(), s.getStudentId())))
                .toList();
        for (McpStudentExt student : sorted) {
            String sid = student.getStudentId();
            String name = displayNames.getOrDefault(sid, sid);
            List<McpRecord> records = recordsByStudent.getOrDefault(sid, List.of()).stream()
                    .sorted(Comparator.comparing(McpRecord::getInterviewDate, Comparator.nullsLast(LocalDate::compareTo))
                            .thenComparing(McpRecord::getInterviewTime, Comparator.nullsLast(String::compareTo)))
                    .toList();
            if (records.isEmpty()) {
                continue;
            }
            entries.addAll(buildEntriesForStudent(sid, name, records));
        }
        return entries;
    }

    private List<InterviewExportEntry> buildEntriesForStudent(String studentId, String studentName,
                                                              List<McpRecord> records) {
        if (records == null || records.isEmpty()) {
            return List.of();
        }
        List<InterviewExportEntry> entries = new ArrayList<>();
        for (McpRecord r : records) {
            entries.add(new InterviewExportEntry(
                    studentName,
                    r.getInterviewDate(),
                    r.getProblemStatement(),
                    r.getInterviewSummary(),
                    r.getFollowupAction()));
        }
        return entries;
    }

    private Map<String, List<McpRecord>> loadRecordsByStudentIds(Set<String> studentIds) {
        if (studentIds.isEmpty()) {
            return Map.of();
        }
        List<McpRecord> all = mcpRecordService.lambdaQuery().in(McpRecord::getStudentId, studentIds).list();
        return all.stream().collect(Collectors.groupingBy(McpRecord::getStudentId));
    }

    private String resolveMajorCode(McpStudentExt ext, String majorOverride) {
        if (StringUtils.hasText(majorOverride)) {
            return normalizeMajorCode(majorOverride.trim());
        }
        if (ext != null) {
            String fromOrg = mcpGroupService.resolveMajorDisplayNameForStudent(ext);
            if (StringUtils.hasText(fromOrg)) {
                return fromOrg;
            }
        }
        return "UNKNOWN";
    }

    /** 对齐 sys_org_unit(type=MAJOR).name（支持 CST、org_cst、全称）。 */
    private String normalizeMajorCode(String rawMajorToken) {
        if (!StringUtils.hasText(rawMajorToken)) {
            return "UNKNOWN";
        }
        String display = mcpGroupService.resolveMajorDisplayName(rawMajorToken);
        return StringUtils.hasText(display) ? display : rawMajorToken.trim();
    }

    // ── Word 文档结构（图示模板）────────────────────────────────────────────

    private byte[] buildDocumentBytes(ExportHeader header, List<InterviewExportEntry> entries) {
        try (XWPFDocument doc = new XWPFDocument(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            writeDocumentHeader(doc, header);
            addBlankLine(doc);
            if (entries.isEmpty()) {
                addLine(doc, "No interview records.");
            } else {
                for (InterviewExportEntry entry : entries) {
                    writeInterviewEntry(doc, entry);
                    addBlankLine(doc);
                }
            }
            doc.write(out);
            return out.toByteArray();
        } catch (Exception e) {
            throw new RuntimeException("Export failed: " + e.getMessage(), e);
        }
    }

    private byte[] buildConsultantDocumentBytes(RecordExportFilter filter, List<McpRecord> records) {
        Map<String, List<McpRecord>> byStudent = records.stream()
                .collect(Collectors.groupingBy(McpRecord::getStudentId, LinkedHashMap::new, Collectors.toList()));
        Set<String> studentIds = new LinkedHashSet<>(byStudent.keySet());
        Map<String, String> displayNames = resolveUserDisplayNames(new ArrayList<>(studentIds));
        List<InterviewExportEntry> entries = new ArrayList<>();
        for (String sid : studentIds.stream().sorted().toList()) {
            entries.addAll(buildEntriesForStudent(sid, displayNames.getOrDefault(sid, sid), byStudent.get(sid)));
        }
        ExportHeader header = resolveHeader(filter.getFaculty(), filter.getDepartment(), filter.getMajor(), null,
                studentIds.stream().map(mcpStudentExtService::getById).filter(Objects::nonNull).toList());
        return buildDocumentBytes(header, entries);
    }

    private void writeDocumentHeader(XWPFDocument doc, ExportHeader header) {
        addLine(doc, "Faculty: " + header.faculty());
        addLine(doc, "Department: " + header.department() + "    Major: " + header.major());
    }

    private ExportHeader resolveHeader(String faculty, String department, String majorParam, String majorIdQuery,
                                       List<McpStudentExt> students) {
        String major = firstNonBlank(majorParam, majorIdQuery, firstStudentMajor(students));
        if (!StringUtils.hasText(major)) {
            major = "—";
        }
        String dept = firstNonBlank(department, inferDepartmentFromMajor(major));
        String fac = firstNonBlank(faculty, "FST");
        return new ExportHeader(fac, dept, major);
    }

    private static String firstNonBlank(String... values) {
        for (String v : values) {
            if (StringUtils.hasText(v)) {
                return v.trim();
            }
        }
        return "";
    }

    private String firstStudentMajor(List<McpStudentExt> students) {
        if (students == null) {
            return "";
        }
        for (McpStudentExt s : students) {
            if (s != null) {
                String name = mcpGroupService.resolveMajorDisplayNameForStudent(s);
                if (StringUtils.hasText(name)) {
                    return name.trim();
                }
            }
        }
        return "";
    }

    /** 专业代码 → 系（与 org 种子数据一致，如 CST → DCS） */
    private static String inferDepartmentFromMajor(String major) {
        if (!StringUtils.hasText(major)) {
            return "";
        }
        String m = major.trim().toUpperCase();
        if ("CST".equals(m) || "AI".equals(m) || "ORG_CST".equalsIgnoreCase(major) || "ORG_AI".equalsIgnoreCase(major)) {
            return "DCS";
        }
        return "";
    }

    private void writeInterviewEntry(XWPFDocument doc, InterviewExportEntry entry) {
        addLine(doc, "Student Name: " + nullToEmpty(entry.studentName()));
        String dateLabel = entry.interviewDate() != null
                ? entry.interviewDate().format(EXPORT_DATE)
                : "N/A";
        addLine(doc, "Interview record: " + dateLabel);
        addDetailBox(doc,
                nullToEmpty(entry.problemStatement()),
                nullToEmpty(entry.interviewSummary()),
                formatFollowupActions(entry.followupAction()));
    }

    /**
     * 单个矩形框内包含 Problem statements / Interview summary / Follow-up actions 三项。
     */
    private void addDetailBox(XWPFDocument doc, String problem, String summary, String followup) {
        XWPFTable table = doc.createTable(1, 1);
        table.setWidth("100%");
        XWPFTableCell cell = table.getRow(0).getCell(0);
        while (cell.getParagraphs().size() > 0) {
            cell.removeParagraph(0);
        }
        applyCellBorders(cell);
        addLabeledCellLine(cell, "Problem statements: ", problem);
        addLabeledCellLine(cell, "Interview summary: ", summary);
        addLabeledCellLine(cell, "Follow-up actions: ", followup);
        addBlankLine(doc);
    }

    private static void addLabeledCellLine(XWPFTableCell cell, String label, String value) {
        XWPFParagraph p = cell.addParagraph();
        XWPFRun labelRun = p.createRun();
        labelRun.setText(label);
        XWPFRun valueRun = p.createRun();
        valueRun.setText(value != null ? value : "");
    }

    private static void applyCellBorders(XWPFTableCell cell) {
        CTTcPr tcPr = cell.getCTTc().isSetTcPr() ? cell.getCTTc().getTcPr() : cell.getCTTc().addNewTcPr();
        CTTcBorders borders = tcPr.isSetTcBorders() ? tcPr.getTcBorders() : tcPr.addNewTcBorders();
        STBorder.Enum single = STBorder.SINGLE;
        BigInteger width = BigInteger.valueOf(8);
        borders.addNewTop().setVal(single);
        borders.getTop().setSz(width);
        borders.addNewBottom().setVal(single);
        borders.getBottom().setSz(width);
        borders.addNewLeft().setVal(single);
        borders.getLeft().setSz(width);
        borders.addNewRight().setVal(single);
        borders.getRight().setSz(width);
    }

    private record ExportHeader(String faculty, String department, String major) {
        ExportHeader withMajor(String newMajor) {
            return new ExportHeader(faculty, department, newMajor);
        }
    }

    private static String formatFollowupActions(String raw) {
        if (!StringUtils.hasText(raw)) {
            return "None.";
        }
        String trimmed = raw.trim();
        if ("none".equalsIgnoreCase(trimmed) || "n/a".equalsIgnoreCase(trimmed)) {
            return "None.";
        }
        if (trimmed.contains("\n")) {
            String[] parts = trimmed.split("\\r?\\n");
            StringBuilder sb = new StringBuilder();
            int n = 1;
            for (String part : parts) {
                if (!StringUtils.hasText(part)) {
                    continue;
                }
                String p = part.trim();
                if (p.matches("^\\d+\\.\\s+.*")) {
                    sb.append(p);
                } else {
                    sb.append(n++).append(". ").append(p);
                }
                sb.append("\n");
            }
            return sb.toString().trim();
        }
        if (trimmed.matches("^\\d+\\.\\s+.*")) {
            return trimmed;
        }
        return trimmed;
    }

    private void addLine(XWPFDocument doc, String text) {
        XWPFParagraph p = doc.createParagraph();
        XWPFRun run = p.createRun();
        run.setText(text);
    }

    private void addBlankLine(XWPFDocument doc) {
        addLine(doc, "");
    }

    private static String nullToEmpty(String s) {
        return s == null ? "" : s;
    }

    private static String sanitizeFilename(String name) {
        if (name == null) {
            return "export";
        }
        return name.replaceAll("[^a-zA-Z0-9._-]", "_");
    }

    private static byte[] buildZip(Map<String, byte[]> namedFiles) throws IOException {
        ByteArrayOutputStream baos = new ByteArrayOutputStream();
        try (ZipOutputStream zos = new ZipOutputStream(baos)) {
            for (Map.Entry<String, byte[]> e : namedFiles.entrySet()) {
                zos.putNextEntry(new ZipEntry(e.getKey()));
                zos.write(e.getValue());
                zos.closeEntry();
            }
        }
        return baos.toByteArray();
    }

    /**
     * 组织树筛选：faculty / department / major 分别解析为 sys_org_unit 子树后取交集。
     * null 表示未传任何组织维度参数。
     */
    private Set<String> resolveOrgScope(String faculty, String department, String major) {
        Set<String> scope = null;
        if (StringUtils.hasText(faculty)) {
            scope = intersectOrgScope(scope, mcpGroupService.resolveOrgSubtreeOrgIds(faculty.trim(), "FACULTY"));
        }
        if (StringUtils.hasText(department)) {
            scope = intersectOrgScope(scope, mcpGroupService.resolveOrgUnitIdsUnderDepartmentName(department.trim()));
        }
        if (StringUtils.hasText(major)) {
            scope = intersectOrgScope(scope, mcpGroupService.resolveMajorSubtreeOrgIds(major.trim()));
        }
        return scope;
    }

    private static Set<String> intersectOrgScope(Set<String> left, Set<String> right) {
        if (right == null || right.isEmpty()) {
            return left;
        }
        if (left == null) {
            return new LinkedHashSet<>(right);
        }
        Set<String> merged = new LinkedHashSet<>(left);
        merged.retainAll(right);
        return merged;
    }

    private List<String> filterGroupKeysByOrgScope(List<String> groupKeys, Set<String> orgScope) {
        if (orgScope == null) {
            return groupKeys;
        }
        return groupKeys.stream()
                .filter(gk -> StringUtils.hasText(gk) && orgScope.contains(gk.trim()))
                .toList();
    }

    /** 学生须能解析出 group_key，且该 GROUP 落在组织子树内。 */
    private boolean isStudentInOrgScope(McpStudentExt ext, Set<String> orgUnitIds) {
        if (orgUnitIds == null) {
            return true;
        }
        if (ext == null || orgUnitIds.isEmpty()) {
            return false;
        }
        String groupKey = mcpGroupService.resolveGroupKeyForStudent(ext);
        return StringUtils.hasText(groupKey) && orgUnitIds.contains(groupKey.trim());
    }

    private boolean isRecordInOrgScope(McpRecord record, Set<String> orgUnitIds) {
        if (orgUnitIds == null) {
            return true;
        }
        if (record == null) {
            return false;
        }
        if (StringUtils.hasText(record.getGroupKey()) && orgUnitIds.contains(record.getGroupKey().trim())) {
            return true;
        }
        return isStudentInOrgScope(mcpStudentExtService.getById(record.getStudentId()), orgUnitIds);
    }

    private List<McpStudentExt> collectStudentsFromGroupKeys(List<String> groupKeys) {
        List<McpStudentExt> students = new ArrayList<>();
        Set<String> seen = new LinkedHashSet<>();
        for (String gk : groupKeys) {
            for (McpStudentExt m : mcpGroupService.listMembers(gk)) {
                if (seen.add(m.getStudentId())) {
                    students.add(m);
                }
            }
        }
        return students;
    }

    private record InterviewExportEntry(
            String studentName,
            LocalDate interviewDate,
            String problemStatement,
            String interviewSummary,
            String followupAction) {
    }

    // ── 筛选与查询（保持不变）────────────────────────────────────────────────

    private Set<String> resolveTargetStudentIds(Set<String> scopeStudentIds, RecordExportFilter filter) {
        if (StringUtils.hasText(filter.getStudentId())) {
            String sid = filter.getStudentId().trim();
            return scopeStudentIds.contains(sid) ? Set.of(sid) : Set.of();
        }
        if (StringUtils.hasText(filter.getStudentKeyword())) {
            UserSearchRequestDTO dto = new UserSearchRequestDTO();
            dto.setRoleCode("STUDENT");
            dto.setKeyword(filter.getStudentKeyword().trim());
            dto.setUserIds(new ArrayList<>(scopeStudentIds));
            List<Map<String, Object>> users = searchUsers(dto);
            return users.stream()
                    .map(u -> String.valueOf(u.get("id")))
                    .filter(scopeStudentIds::contains)
                    .collect(Collectors.toCollection(LinkedHashSet::new));
        }
        return new LinkedHashSet<>(scopeStudentIds);
    }

    private Set<String> resolveMentorIdsByKeyword(String mentorKeyword) {
        if (!StringUtils.hasText(mentorKeyword)) {
            return null;
        }
        UserSearchRequestDTO dto = new UserSearchRequestDTO();
        dto.setRoleCode("MENTOR");
        dto.setKeyword(mentorKeyword.trim());
        List<Map<String, Object>> users = searchUsers(dto);
        if (users.isEmpty()) {
            return Set.of();
        }
        return users.stream()
                .map(u -> String.valueOf(u.get("id")))
                .collect(Collectors.toSet());
    }

    @SuppressWarnings("unchecked")
    private List<Map<String, Object>> searchUsers(UserSearchRequestDTO dto) {
        try {
            Result res = userServiceClient.searchUsersByConditions(dto);
            if (res == null || res.getCode() == null || res.getCode() != 200 || res.getData() == null) {
                return List.of();
            }
            return objectMapper.convertValue(res.getData(),
                    objectMapper.getTypeFactory().constructCollectionType(List.class, Map.class));
        } catch (Exception e) {
            return List.of();
        }
    }

    private Map<String, String> resolveUserDisplayNames(List<String> userIds) {
        if (userIds == null || userIds.isEmpty()) {
            return Map.of();
        }
        UserSearchRequestDTO dto = new UserSearchRequestDTO();
        dto.setUserIds(userIds);
        List<Map<String, Object>> users = searchUsers(dto);
        Map<String, String> map = new HashMap<>();
        for (Map<String, Object> u : users) {
            String id = String.valueOf(u.get("id"));
            String realName = u.get("realName") != null ? String.valueOf(u.get("realName")) : "";
            String username = u.get("username") != null ? String.valueOf(u.get("username")) : id;
            map.put(id, StringUtils.hasText(realName) ? realName : username);
        }
        for (String id : userIds) {
            map.putIfAbsent(id, id);
        }
        return map;
    }

    private boolean matchesDateRange(McpRecord r, RecordExportFilter filter) {
        LocalDate d = r.getInterviewDate();
        if (d == null) {
            return filter.getDateFrom() == null && filter.getDateTo() == null;
        }
        if (filter.getDateFrom() != null && d.isBefore(filter.getDateFrom())) {
            return false;
        }
        if (filter.getDateTo() != null && d.isAfter(filter.getDateTo())) {
            return false;
        }
        return true;
    }

    private boolean matchesAcademicYear(McpRecord r, RecordExportFilter filter) {
        if (filter.getAcademicYearFrom() == null && filter.getAcademicYearTo() == null) {
            return true;
        }
        return AcademicYearUtils.inAcademicYearRange(
                r.getInterviewDate(), filter.getAcademicYearFrom(), filter.getAcademicYearTo());
    }

    private List<String> resolveGroupKeysForExport(String groupLabel, String majorId,
                                                   String currentUserId, String role) {
        if (!StringUtils.hasText(groupLabel)) {
            return List.of();
        }
        if ("ROLE_MENTOR".equals(role)) {
            try {
                return List.of(mcpGroupService.resolveGroupKeyForMentor(groupLabel.trim(), currentUserId));
            } catch (RuntimeException e) {
                return List.of();
            }
        }
        return mcpGroupService.resolveGroupKeysByLabel(groupLabel.trim(), majorId);
    }

    // #region agent log
    private static void exportDebugLog(String hypothesisId, String location, String message,
                                       Map<String, Object> data) {
        try {
            Map<String, Object> line = new LinkedHashMap<>();
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
}
