package com.bnbu.organizational.Service;

import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import com.bnbu.organizational.DTO.CreateOrgUnitRequest;
import com.bnbu.organizational.DTO.OrgUnitVO;
import com.bnbu.organizational.DTO.UpdateOrgUnitRequest;
import com.bnbu.organizational.Entity.SysOrgUnit;
import com.bnbu.organizational.Mapper.SysOrgUnitMapper;
import lombok.RequiredArgsConstructor;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardOpenOption;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class AdminOrgService {
    private static final Logger LOG = LoggerFactory.getLogger(AdminOrgService.class);

    private static final String TYPE_FACULTY = "FACULTY";
    private static final String TYPE_DEPARTMENT = "DEPARTMENT";
    private static final String TYPE_MAJOR = "MAJOR";

    private final SysOrgUnitService sysOrgUnitService;
    private final SysOrgUnitMapper sysOrgUnitMapper;

    // #region agent log
    private static final String LOG_PATH = "/Users/houshuoran/IdeaProjects/B09/.cursor/debug-6b255a.log";

    private static String jsonEscape(String s) {
        if (s == null) return "";
        return s.replace("\\", "\\\\").replace("\"", "\\\"").replace("\n", "\\n").replace("\r", "\\r");
    }

    private static void debugNdjson(String runId, String hypothesisId, String location, String message, Map<String, Object> data) {
        try {
            long ts = System.currentTimeMillis();
            StringBuilder sb = new StringBuilder();
            sb.append("{\"sessionId\":\"6b255a\"");
            sb.append(",\"runId\":\"").append(jsonEscape(runId)).append("\"");
            sb.append(",\"hypothesisId\":\"").append(jsonEscape(hypothesisId)).append("\"");
            sb.append(",\"location\":\"").append(jsonEscape(location)).append("\"");
            sb.append(",\"message\":\"").append(jsonEscape(message)).append("\"");
            sb.append(",\"data\":{");
            boolean first = true;
            if (data != null) {
                for (Map.Entry<String, Object> e : data.entrySet()) {
                    if (!first) sb.append(",");
                    first = false;
                    sb.append("\"").append(jsonEscape(e.getKey())).append("\":");
                    Object v = e.getValue();
                    if (v == null) {
                        sb.append("null");
                    } else if (v instanceof Number || v instanceof Boolean) {
                        sb.append(v);
                    } else {
                        sb.append("\"").append(jsonEscape(String.valueOf(v))).append("\"");
                    }
                }
            }
            sb.append("},\"timestamp\":").append(ts).append("}\n");
            // 控制台同时输出，避免文件写入在某些运行环境不可见
            LOG.info("[agent-log] {}", sb.toString().trim());
            Files.writeString(Path.of(LOG_PATH), sb.toString(), StandardCharsets.UTF_8,
                    StandardOpenOption.CREATE, StandardOpenOption.APPEND);
        } catch (Exception ignored) {
        }
    }
    // #endregion

    public List<OrgUnitVO> listAll() {
        List<SysOrgUnit> units = sysOrgUnitService.lambdaQuery()
                .orderByAsc(SysOrgUnit::getSortOrder)
                .orderByAsc(SysOrgUnit::getUnitId)
                .list();
        return units.stream().map(this::toVO).collect(Collectors.toList());
    }

    public OrgUnitVO getById(String id) {
        SysOrgUnit unit = requireUnit(id);
        return toVO(unit);
    }

    @Transactional
    public OrgUnitVO create(CreateOrgUnitRequest request) {
        validateCreateRequest(request);

        String generatedId = generateOrgId(request.getName(), request.getType());
        // #region agent log
        Map<String, Object> logGeneratedId = new HashMap<>();
        logGeneratedId.put("name", request.getName());
        logGeneratedId.put("type", request.getType());
        logGeneratedId.put("parentId", request.getParentId()); // may be null, do not use Map.of
        logGeneratedId.put("generatedId", generatedId);
        debugNdjson("repro-admin-create", "H1_admin_create_returns_wrong_unit",
                "AdminOrgService.java:create", "generatedId", logGeneratedId);
        // #endregion
        // 如果已存在直接返回，不重复创建（幂等操作）
        SysOrgUnit existing = sysOrgUnitService.getById(generatedId);
        if (existing != null) {
            // #region agent log
            Map<String, Object> logExisting = new HashMap<>();
            logExisting.put("generatedId", generatedId);
            logExisting.put("existingName", existing.getName());
            logExisting.put("existingType", existing.getUnitType());
            logExisting.put("existingParentId", existing.getParentId()); // may be null, do not use Map.of
            debugNdjson("repro-admin-create", "H1_admin_create_returns_wrong_unit",
                    "AdminOrgService.java:create", "hitExistingReturn",
                    logExisting);
            // #endregion
            return toVO(existing);
        }

        SysOrgUnit unit = new SysOrgUnit();
        unit.setUnitId(generatedId);
        unit.setName(request.getName().trim());
        unit.setUnitType(request.getType().trim().toUpperCase(Locale.ROOT));
        unit.setParentId(resolveParentId(request));
        unit.setSortOrder(request.getSortOrder() != null ? request.getSortOrder() : 0);
        unit.setPath(buildPath(unit.getUnitId(), unit.getParentId()));
        unit.setCreateTime(LocalDateTime.now());

        sysOrgUnitService.save(unit);
        // #region agent log
        Map<String, Object> logSaved = new HashMap<>();
        logSaved.put("unitId", unit.getUnitId());
        logSaved.put("name", unit.getName());
        logSaved.put("type", unit.getUnitType());
        logSaved.put("parentId", unit.getParentId()); // may be null, do not use Map.of
        logSaved.put("path", unit.getPath());
        debugNdjson("repro-admin-create", "H2_admin_create_save_not_persisted",
                "AdminOrgService.java:create", "saved",
                logSaved);
        // #endregion
        return toVO(unit);
    }

    @Transactional
    public OrgUnitVO update(String id, UpdateOrgUnitRequest request) {
        SysOrgUnit unit = requireUnit(id);
        if (request.getName() != null && !request.getName().isBlank()) {
            unit.setName(request.getName().trim());
        }
        if (request.getSortOrder() != null) {
            unit.setSortOrder(request.getSortOrder());
        }
        sysOrgUnitService.updateById(unit);
        return toVO(sysOrgUnitService.getById(id));
    }

    @Transactional
    public void delete(String id) {
        requireUnit(id);
        List<String> children = sysOrgUnitMapper.selectChildOrgIds(id);
        if (children != null && !children.isEmpty()) {
            throw new RuntimeException("Cannot delete org unit with child nodes");
        }
        sysOrgUnitService.removeById(id);
    }

    @Transactional
    public int importFromExcel(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new RuntimeException("Excel file is required");
        }
        int importedRows = 0;
        try (InputStream in = file.getInputStream(); Workbook workbook = new XSSFWorkbook(in)) {
            Sheet sheet = workbook.getSheetAt(0);
            boolean headerSkipped = false;
            for (Row row : sheet) {
                if (!headerSkipped) {
                    headerSkipped = true;
                    continue;
                }
                String faculty = readCell(row, 0);
                String department = readCell(row, 1);
                String major = readCell(row, 2);
                if (isBlank(faculty) && isBlank(department) && isBlank(major)) {
                    continue;
                }
                if (isBlank(faculty)) {
                    throw new RuntimeException("Invalid Excel row: faculty name is required");
                }
                SysOrgUnit facultyUnit = findOrCreate(faculty, TYPE_FACULTY, null);
                importedRows++;

                if (!isBlank(department)) {
                    SysOrgUnit deptUnit = findOrCreate(department, TYPE_DEPARTMENT, facultyUnit.getUnitId());
                    importedRows++;
                    if (!isBlank(major)) {
                        findOrCreate(major, TYPE_MAJOR, deptUnit.getUnitId());
                        importedRows++;
                    }
                }
            }
        } catch (RuntimeException e) {
            throw e;
        } catch (Exception e) {
            throw new RuntimeException("Failed to import Excel: " + e.getMessage());
        }
        return importedRows;
    }

    private SysOrgUnit findOrCreate(String name, String type, String parentId) {
        QueryWrapper<SysOrgUnit> wrapper = new QueryWrapper<SysOrgUnit>()
                .eq("name", name.trim())
                .eq("type", type);
        if (parentId == null) {
            // FACULTY 无父节点：兼容 parent_id IS NULL 、'0' 、'' 三种存储形式
            wrapper.and(w -> w.isNull("parent_id")
                    .or().eq("parent_id", "0")
                    .or().eq("parent_id", ""));
        } else {
            wrapper.eq("parent_id", parentId);
        }
        SysOrgUnit existing = sysOrgUnitService.getOne(wrapper, false);
        if (existing != null) {
            return existing;
        }

        CreateOrgUnitRequest req = new CreateOrgUnitRequest();
        req.setName(name.trim());
        req.setType(type);
        req.setParentId(parentId);
        return sysOrgUnitService.getById(create(req).getId());
    }

    private void validateCreateRequest(CreateOrgUnitRequest request) {
        String type = request.getType().trim().toUpperCase(Locale.ROOT);
        if (!TYPE_FACULTY.equals(type) && !TYPE_DEPARTMENT.equals(type) && !TYPE_MAJOR.equals(type)) {
            throw new RuntimeException("Invalid org type, must be FACULTY, DEPARTMENT or MAJOR");
        }
        if (!TYPE_FACULTY.equals(type) && isBlank(request.getParentId())) {
            throw new RuntimeException("parentId is required for DEPARTMENT and MAJOR");
        }
        if (TYPE_FACULTY.equals(type) && request.getParentId() != null && !request.getParentId().isBlank()) {
            throw new RuntimeException("FACULTY must not have parentId");
        }
    }

    private String resolveParentId(CreateOrgUnitRequest request) {
        if (TYPE_FACULTY.equals(request.getType().trim().toUpperCase(Locale.ROOT))) {
            return null;
        }
        requireUnit(request.getParentId());
        return request.getParentId();
    }

    private String buildPath(String id, String parentId) {
        if (parentId == null || parentId.isBlank()) {
            return "/" + id;
        }
        SysOrgUnit parent = requireUnit(parentId);
        String parentPath = parent.getPath() != null ? parent.getPath() : "/" + parentId;
        return parentPath + "/" + id;
    }

    private String generateOrgId(String name, String type) {
        return "org_" + name.trim().toLowerCase(Locale.ROOT).replaceAll("[^a-z0-9]", "");
    }

    private SysOrgUnit requireUnit(String id) {
        SysOrgUnit unit = sysOrgUnitService.getById(id);
        if (unit == null) {
            throw new RuntimeException("Org unit not found: " + id);
        }
        return unit;
    }

    private OrgUnitVO toVO(SysOrgUnit unit) {
        OrgUnitVO vo = new OrgUnitVO();
        vo.setId(unit.getUnitId());
        vo.setName(unit.getName());
        vo.setType(unit.getUnitType());
        vo.setParentId(unit.getParentId());
        vo.setPath(unit.getPath());
        vo.setSortOrder(unit.getSortOrder());
        vo.setCreateTime(unit.getCreateTime());
        return vo;
    }

    private final DataFormatter dataFormatter = new DataFormatter();

    private String readCell(Row row, int index) {
        if (row == null) return "";
        Cell cell = row.getCell(index, Row.MissingCellPolicy.RETURN_BLANK_AS_NULL);
        if (cell == null) return "";
        // 对数字单元格直接取整数字符串，避免逗号分隔符
        if (cell.getCellType() == CellType.NUMERIC) {
            double d = cell.getNumericCellValue();
            if (d == Math.floor(d) && !Double.isInfinite(d)) {
                return String.valueOf((long) d);
            }
        }
        return dataFormatter.formatCellValue(cell).trim();
    }

    private boolean isBlank(String value) {
        return value == null || value.isBlank();
    }
}
