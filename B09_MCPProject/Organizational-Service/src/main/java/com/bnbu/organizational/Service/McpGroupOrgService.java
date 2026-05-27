package com.bnbu.organizational.Service;

import com.alibaba.nacos.api.model.v2.Result;
import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import com.bnbu.organizational.DTO.McpGroupVO;
import com.bnbu.organizational.DTO.OrgSubtreeVO;
import com.bnbu.organizational.DTO.UserRemoteDTO;
import com.bnbu.organizational.DTO.UserSearchDTO;
import com.bnbu.organizational.Entity.SysOrgUnit;
import com.bnbu.organizational.Entity.SysUserOrg;
import com.bnbu.organizational.Mapper.SysOrgUnitMapper;
import com.bnbu.organizational.Mapper.SysUserOrgMapper;
import com.bnbu.organizational.OpenFeign.UserFeignClient;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.CollectionUtils;
import org.springframework.util.StringUtils;

import java.time.LocalDateTime;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardOpenOption;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * MCP 小组：以 sys_org_unit(type=GROUP) + sys_user_org 建模，不单独建 mcp_group 表。
 */
@Service
@RequiredArgsConstructor
public class McpGroupOrgService {

    public static final String TYPE_GROUP = "GROUP";
    public static final String TYPE_FACULTY = "FACULTY";
    public static final String TYPE_MAJOR = "MAJOR";
    public static final String TYPE_DEPARTMENT = "DEPARTMENT";

    private final SysOrgUnitMapper sysOrgUnitMapper;
    private final SysUserOrgMapper sysUserOrgMapper;
    private final SysUserOrgService sysUserOrgService;
    private final UserFeignClient userFeignClient;
    private final ObjectMapper objectMapper;

    // #region agent log
    private static void debugNdjson(String hypothesisId, String location, String message, String dataJson) {
        try {
            String payload = "{\"sessionId\":\"6b255a\",\"hypothesisId\":\"" + hypothesisId
                    + "\",\"location\":\"" + location
                    + "\",\"message\":\"" + message
                    + "\",\"data\":" + (dataJson == null ? "{}" : dataJson)
                    + ",\"timestamp\":" + System.currentTimeMillis() + "}\n";
            Files.writeString(
                    Path.of("/Users/houshuoran/IdeaProjects/B09/.cursor/debug-6b255a.log"),
                    payload,
                    StandardCharsets.UTF_8,
                    StandardOpenOption.CREATE,
                    StandardOpenOption.APPEND);
        } catch (Exception ignored) {
        }
    }
    // #endregion

    public McpGroupVO getGroup(String groupId) {
        SysOrgUnit unit = requireGroupUnit(groupId);
        return toVO(unit);
    }

    public List<McpGroupVO> listByMentor(String mentorId) {
        if (!StringUtils.hasText(mentorId)) {
            return List.of();
        }
        List<String> orgIds = sysUserOrgMapper.selectOrgIdsByUserId(mentorId);
        if (CollectionUtils.isEmpty(orgIds)) {
            return List.of();
        }
        return sysOrgUnitMapper.selectBatchIds(orgIds).stream()
                .filter(u -> TYPE_GROUP.equalsIgnoreCase(u.getUnitType()))
                .map(this::toVO)
                .collect(Collectors.toList());
    }

    @Transactional
    public McpGroupVO ensureGroup(String groupLabel, String mentorId, String parentOrgId, String displayName) {
        if (!StringUtils.hasText(groupLabel)) {
            throw new RuntimeException("groupId (label) is required");
        }
        String label = groupLabel.trim();

        // ── 1. 优先按 (label + mentor) 查：同一导师不会有两个同名组 ──────────────
        SysOrgUnit unit = null;
        if (StringUtils.hasText(mentorId)) {
            List<String> mentorOrgIds = sysUserOrgMapper.selectOrgIdsByUserId(mentorId.trim());
            if (!mentorOrgIds.isEmpty()) {
                unit = sysOrgUnitMapper.selectOne(
                        new com.baomidou.mybatisplus.core.conditions.query.QueryWrapper<SysOrgUnit>()
                                .eq("name", label)
                                .eq("type", TYPE_GROUP)
                                .in("id", mentorOrgIds));
            }
        }

        // ── 2. 未找到 → 创建新组（UUID 主键，彻底隔离同名组） ───────────────────
        if (unit == null) {
            // 创建时需要父节点
            if (!StringUtils.hasText(parentOrgId)) {
                throw new RuntimeException("parentOrgId (MAJOR id or code, e.g. org_cst / CST) is required when creating group: " + label);
            }
            SysOrgUnit parent = requireMajorParentForNewGroup(parentOrgId);
            // #region agent log
            debugNdjson("H7_group_parent", "McpGroupOrgService.ensureGroup", "createGroup",
                    "{\"label\":\"" + label + "\",\"parentOrgId\":\"" + parent.getUnitId()
                            + "\",\"parentType\":\"" + (parent.getUnitType() != null ? parent.getUnitType() : "")
                            + "\",\"parentName\":\"" + (parent.getName() != null ? parent.getName() : "") + "\"}");
            // #endregion
            String uuid = UUID.randomUUID().toString().replace("-", "");
            unit = new SysOrgUnit();
            unit.setUnitId(uuid);
            unit.setName(StringUtils.hasText(displayName) ? displayName.trim() : label);
            unit.setUnitType(TYPE_GROUP);
            unit.setParentId(parent.getUnitId());
            unit.setPath(buildChildPath(parent.getPath(), uuid));
            unit.setSortOrder(0);
            unit.setCreateTime(LocalDateTime.now());
            sysOrgUnitMapper.insert(unit);
        }

        // ── 3. 已存在但类型不是 GROUP 时报错 ─────────────────────────────────────
        if (!TYPE_GROUP.equalsIgnoreCase(unit.getUnitType())) {
            throw new RuntimeException("Organization unit exists but is not a GROUP: " + unit.getUnitId());
        }

        // ── 4. 绑定/更新导师 ──────────────────────────────────────────────────────
        if (StringUtils.hasText(mentorId)) {
            bindMentorToGroup(unit.getUnitId(), mentorId.trim());
        }
        return toVO(unit);
    }

    @Transactional
    public McpGroupVO changeMentor(String groupId, String newMentorId) {
        requireGroupUnit(groupId);
        if (!StringUtils.hasText(newMentorId)) {
            throw new RuntimeException("mentorId is required");
        }
        unbindAllMentorsFromGroup(groupId.trim());
        bindMentorToGroup(groupId.trim(), newMentorId.trim());
        return getGroup(groupId);
    }

    @Transactional
    public void bindMember(String groupId, String userId) {
        requireGroupUnit(groupId);
        sysUserOrgService.bindUserToOrg(userId, groupId.trim(), true);
    }

    @Transactional
    public void unbindMember(String groupId, String userId) {
        requireGroupUnit(groupId);
        sysUserOrgMapper.delete(new QueryWrapper<SysUserOrg>()
                .eq("user_id", userId)
                .eq("org_unit_id", groupId.trim()));
    }

    public boolean isMentorOfGroup(String mentorId, String groupId) {
        if (!StringUtils.hasText(mentorId) || !StringUtils.hasText(groupId)) {
            return false;
        }
        String gid = groupId.trim();
        String mid = mentorId.trim();
        SysOrgUnit unit = sysOrgUnitMapper.selectById(gid);
        if (unit == null || !TYPE_GROUP.equalsIgnoreCase(unit.getUnitType())) {
            return false;
        }
        List<String> mentorOrgIds = sysUserOrgMapper.selectOrgIdsByUserId(mid);
        if (mentorOrgIds != null && mentorOrgIds.contains(gid)) {
            return true;
        }
        // 与 getGroup().mentorId / my-mentor 展示一致：按组内 MENTOR 角色判定
        String assignedMentor = findMentorIdForGroup(gid);
        return mid.equals(assignedMentor);
    }

    public String resolveFacultyOrgId(String groupId) {
        SysOrgUnit unit = sysOrgUnitMapper.selectById(groupId);
        if (unit == null) {
            return null;
        }
        SysOrgUnit current = unit;
        int guard = 0;
        while (current != null && guard++ < 20) {
            if (TYPE_FACULTY.equalsIgnoreCase(current.getUnitType())) {
                return current.getUnitId();
            }
            if (!StringUtils.hasText(current.getParentId())) {
                break;
            }
            current = sysOrgUnitMapper.selectById(current.getParentId());
        }
        return null;
    }

    public List<String> listMemberUserIds(String groupId) {
        requireGroupUnit(groupId);
        List<String> userIds = sysUserOrgMapper.selectUserIdsByOrgId(groupId.trim());
        return userIds != null ? userIds : List.of();
    }

    /** 小组内学生 userId（sys_user_org + 角色 STUDENT） */
    /**
     * 按展示标签（如 2024-2025-Y1）查找所有 GROUP 节点的 UUID。
     */
    public List<String> findGroupKeysByLabel(String groupLabel) {
        if (!StringUtils.hasText(groupLabel)) {
            return List.of();
        }
        List<SysOrgUnit> groups = sysOrgUnitMapper.selectList(
                new QueryWrapper<SysOrgUnit>()
                        .eq("name", groupLabel.trim())
                        .eq("type", TYPE_GROUP));
        if (CollectionUtils.isEmpty(groups)) {
            return List.of();
        }
        return groups.stream()
                .map(SysOrgUnit::getUnitId)
                .filter(StringUtils::hasText)
                .distinct()
                .collect(Collectors.toList());
    }

    /**
     * 按展示标签 + 专业（MAJOR 节点 name 或 id，如 CST / org_cst）定位 GROUP 的 UUID。
     * 用于 FC 加组员：groupId=2024-2025-Y1 &amp; majorId=CST 应唯一对应一个 org 小组。
     */
    public List<String> findGroupKeysByLabelAndMajor(String groupLabel, String majorId) {
        if (!StringUtils.hasText(groupLabel) || !StringUtils.hasText(majorId)) {
            return List.of();
        }
        String label = groupLabel.trim();
        String majorToken = majorId.trim();
        List<SysOrgUnit> groups = sysOrgUnitMapper.selectList(
                new QueryWrapper<SysOrgUnit>()
                        .eq("name", label)
                        .eq("type", TYPE_GROUP));
        if (CollectionUtils.isEmpty(groups)) {
            return List.of();
        }
        return groups.stream()
                .filter(g -> isGroupUnderMajor(g, majorToken))
                .map(SysOrgUnit::getUnitId)
                .filter(StringUtils::hasText)
                .distinct()
                .collect(Collectors.toList());
    }

    private boolean isGroupUnderMajor(SysOrgUnit group, String majorIdOrCode) {
        if (group == null || !StringUtils.hasText(majorIdOrCode)) {
            return false;
        }
        SysOrgUnit current = group;
        int guard = 0;
        while (current != null && guard++ < 25) {
            if (TYPE_MAJOR.equalsIgnoreCase(current.getUnitType())
                    && majorUnitMatches(current, majorIdOrCode)) {
                return true;
            }
            if (!StringUtils.hasText(current.getParentId())) {
                break;
            }
            current = sysOrgUnitMapper.selectById(current.getParentId());
        }
        String path = group.getPath();
        if (!StringUtils.hasText(path)) {
            return false;
        }
        SysOrgUnit majorByName = sysOrgUnitMapper.selectOne(
                new QueryWrapper<SysOrgUnit>()
                        .eq("type", TYPE_MAJOR)
                        .and(w -> w.eq("name", majorIdOrCode).or().eq("id", majorIdOrCode)));
        if (majorByName == null || !StringUtils.hasText(majorByName.getUnitId())) {
            return false;
        }
        String majorSeg = "/" + majorByName.getUnitId().trim() + "/";
        String normalized = path.endsWith("/") ? path : path + "/";
        return normalized.contains(majorSeg) || normalized.endsWith("/" + majorByName.getUnitId().trim());
    }

    private static boolean majorUnitMatches(SysOrgUnit majorUnit, String majorIdOrCode) {
        if (majorUnit == null || !StringUtils.hasText(majorIdOrCode)) {
            return false;
        }
        String token = majorIdOrCode.trim();
        return token.equalsIgnoreCase(majorUnit.getUnitId())
                || token.equalsIgnoreCase(majorUnit.getName());
    }

    public String resolveMajorOrgId(String majorIdOrCode) {
        if (!StringUtils.hasText(majorIdOrCode)) {
            return null;
        }
        SysOrgUnit major = findMajorUnit(majorIdOrCode.trim());
        return major != null ? major.getUnitId() : null;
    }

    /**
     * 将 majorId / org_cst / CST 等统一为组织表 MAJOR 节点的 name（如 CST、AI），用于导出分组与筛选。
     */
    public String resolveMajorDisplayName(String majorIdOrCode) {
        if (!StringUtils.hasText(majorIdOrCode)) {
            return null;
        }
        SysOrgUnit major = findMajorUnit(majorIdOrCode.trim());
        if (major != null && StringUtils.hasText(major.getName())) {
            return major.getName().trim();
        }
        return majorIdOrCode.trim();
    }

    private SysOrgUnit findMajorUnit(String token) {
        String t = token.trim();
        SysOrgUnit major = sysOrgUnitMapper.selectOne(
                new QueryWrapper<SysOrgUnit>()
                        .eq("type", TYPE_MAJOR)
                        .and(w -> w.eq("name", t)
                                .or()
                                .eq("id", t)
                                .or()
                                .apply("LOWER(name) = LOWER({0})", t)));
        if (major == null && t.matches("(?i)[A-Za-z]{2,12}") && !t.toLowerCase().startsWith("org_")) {
            major = sysOrgUnitMapper.selectOne(
                    new QueryWrapper<SysOrgUnit>()
                            .eq("type", TYPE_MAJOR)
                            .eq("id", "org_" + t.toLowerCase()));
        }
        return major;
    }

    /** MAJOR 节点及其下属（含各 GROUP）的全部 org id。 */
    public List<String> listMajorSubtreeOrgIds(String majorIdOrCode) {
        SysOrgUnit major = findMajorUnit(majorIdOrCode);
        if (major == null) {
            throw new RuntimeException("Major not found: " + majorIdOrCode);
        }
        return listOrgIdsInSubtree(major);
    }

    /** 从 GROUP 节点向上查找所属 MAJOR 的 name。 */
    public String resolveMajorDisplayNameForGroup(String groupOrgId) {
        if (!StringUtils.hasText(groupOrgId)) {
            return null;
        }
        SysOrgUnit current = sysOrgUnitMapper.selectById(groupOrgId.trim());
        int guard = 0;
        while (current != null && guard++ < 25) {
            if (TYPE_MAJOR.equalsIgnoreCase(current.getUnitType())) {
                return StringUtils.hasText(current.getName()) ? current.getName().trim() : current.getUnitId();
            }
            if (!StringUtils.hasText(current.getParentId())) {
                break;
            }
            current = sysOrgUnitMapper.selectById(current.getParentId());
        }
        return null;
    }

    /**
     * 新建 GROUP 的父节点必须是 MAJOR。支持传 org_cst 或 CST；禁止传学院/系节点。
     */
    private SysOrgUnit requireMajorParentForNewGroup(String parentOrgIdOrMajorCode) {
        if (!StringUtils.hasText(parentOrgIdOrMajorCode)) {
            throw new RuntimeException("parentOrgId is required");
        }
        String token = parentOrgIdOrMajorCode.trim();
        SysOrgUnit unit = sysOrgUnitMapper.selectById(token);
        if (unit != null) {
            if (TYPE_MAJOR.equalsIgnoreCase(unit.getUnitType())) {
                return unit;
            }
            if (TYPE_FACULTY.equalsIgnoreCase(unit.getUnitType())
                    || TYPE_DEPARTMENT.equalsIgnoreCase(unit.getUnitType())) {
                throw new RuntimeException(
                        "新建小组必须挂在专业(MAJOR)下，不能挂在学院/系下。请传 majorId（如 CST）或 org_cst，当前为: "
                                + unit.getName() + " (" + unit.getUnitType() + ")");
            }
            throw new RuntimeException("GROUP parent must be MAJOR, got: " + unit.getUnitType());
        }
        String majorOrgId = resolveMajorOrgId(token);
        if (!StringUtils.hasText(majorOrgId)) {
            throw new RuntimeException("Major organization not found: " + token);
        }
        SysOrgUnit major = sysOrgUnitMapper.selectById(majorOrgId);
        if (major == null || !TYPE_MAJOR.equalsIgnoreCase(major.getUnitType())) {
            throw new RuntimeException("Major organization not found: " + token);
        }
        return major;
    }

    public List<String> listStudentMemberIds(String groupId) {
        List<String> userIds = listMemberUserIds(groupId);
        if (CollectionUtils.isEmpty(userIds)) {
            return List.of();
        }
        UserSearchDTO searchDTO = new UserSearchDTO();
        searchDTO.setRoleCode("STUDENT");
        searchDTO.setUserIds(userIds);
        return fetchUsers(searchDTO).stream()
                .map(UserRemoteDTO::getId)
                .distinct()
                .collect(Collectors.toList());
    }

    private SysOrgUnit requireGroupUnit(String groupId) {
        if (!StringUtils.hasText(groupId)) {
            throw new RuntimeException("groupId is required");
        }
        SysOrgUnit unit = sysOrgUnitMapper.selectById(groupId.trim());
        if (unit == null) {
            throw new RuntimeException("Group not found: " + groupId);
        }
        if (!TYPE_GROUP.equalsIgnoreCase(unit.getUnitType())) {
            throw new RuntimeException("Not an MCP group organization unit: " + groupId);
        }
        return unit;
    }

    private McpGroupVO toVO(SysOrgUnit unit) {
        McpGroupVO vo = new McpGroupVO();
        String label = unit.getName();
        vo.setGroupKey(unit.getUnitId());
        vo.setGroupId(label);
        vo.setName(label);
        vo.setGroupLabel(label);
        vo.setParentId(unit.getParentId());
        vo.setFacultyOrgId(resolveFacultyOrgId(unit.getUnitId()));
        vo.setMentorId(findMentorIdForGroup(unit.getUnitId()));
        return vo;
    }

    private String findMentorIdForGroup(String groupId) {
        List<String> userIds = sysUserOrgMapper.selectUserIdsByOrgId(groupId);
        if (CollectionUtils.isEmpty(userIds)) {
            return null;
        }
        UserSearchDTO searchDTO = new UserSearchDTO();
        searchDTO.setRoleCode("MENTOR");
        searchDTO.setUserIds(userIds);
        List<UserRemoteDTO> mentors = fetchUsers(searchDTO);
        if (CollectionUtils.isEmpty(mentors)) {
            return null;
        }
        return mentors.get(0).getId();
    }

    private void bindMentorToGroup(String groupId, String mentorId) {
        unbindAllMentorsFromGroup(groupId);
        sysUserOrgService.bindUserToOrg(mentorId, groupId, true);
    }

    private void unbindAllMentorsFromGroup(String groupId) {
        List<String> userIds = sysUserOrgMapper.selectUserIdsByOrgId(groupId);
        if (CollectionUtils.isEmpty(userIds)) {
            return;
        }
        UserSearchDTO searchDTO = new UserSearchDTO();
        searchDTO.setRoleCode("MENTOR");
        searchDTO.setUserIds(userIds);
        List<UserRemoteDTO> mentors = fetchUsers(searchDTO);
        if (CollectionUtils.isEmpty(mentors)) {
            return;
        }
        for (UserRemoteDTO mentor : mentors) {
            sysUserOrgMapper.delete(new QueryWrapper<SysUserOrg>()
                    .eq("user_id", mentor.getId())
                    .eq("org_unit_id", groupId));
        }
    }

    private List<UserRemoteDTO> fetchUsers(UserSearchDTO searchDTO) {
        Result result = userFeignClient.searchUsersByConditions(searchDTO);
        if (result == null || result.getCode() != 200 || result.getData() == null) {
            return new ArrayList<>();
        }
        return objectMapper.convertValue(result.getData(), new TypeReference<List<UserRemoteDTO>>() {});
    }

    private String buildChildPath(String parentPath, String childId) {
        String base = StringUtils.hasText(parentPath) ? parentPath : "";
        return base + "/" + childId;
    }

    /**
     * 按组织单位 name 定位节点（默认 DEPARTMENT），返回该节点及全部下属单位的 id 列表。
     */
    public OrgSubtreeVO resolveSubtreeByName(String name, String unitType) {
        if (!StringUtils.hasText(name)) {
            throw new RuntimeException("Organization name is required");
        }
        String type = StringUtils.hasText(unitType) ? unitType.trim() : TYPE_DEPARTMENT;
        List<SysOrgUnit> matches = sysOrgUnitMapper.selectList(
                new QueryWrapper<SysOrgUnit>()
                        .eq("type", type)
                        .apply("LOWER(name) = LOWER({0})", name.trim()));
        if (matches.isEmpty()) {
            throw new RuntimeException("Organization unit not found: name=" + name.trim() + ", type=" + type);
        }
        if (matches.size() > 1) {
            throw new RuntimeException(
                    "Ambiguous organization name \"" + name.trim() + "\": " + matches.size() + " units of type " + type);
        }
        SysOrgUnit root = matches.get(0);
        List<String> orgUnitIds = listOrgIdsInSubtree(root);
        return new OrgSubtreeVO(root.getUnitId(), root.getName(), root.getUnitType(), orgUnitIds);
    }

    private List<String> listOrgIdsInSubtree(SysOrgUnit root) {
        if (root == null || !StringUtils.hasText(root.getUnitId())) {
            return List.of();
        }
        String path = root.getPath();
        if (StringUtils.hasText(path)) {
            String base = path.endsWith("/") ? path.substring(0, path.length() - 1) : path;
            List<SysOrgUnit> units = sysOrgUnitMapper.selectList(
                    new QueryWrapper<SysOrgUnit>()
                            .eq("path", base)
                            .or()
                            .likeRight("path", base + "/"));
            return units.stream()
                    .map(SysOrgUnit::getUnitId)
                    .filter(StringUtils::hasText)
                    .distinct()
                    .collect(Collectors.toList());
        }
        List<String> ids = new ArrayList<>();
        ids.add(root.getUnitId());
        java.util.Queue<String> queue = new java.util.LinkedList<>();
        queue.add(root.getUnitId());
        while (!queue.isEmpty()) {
            String currentId = queue.poll();
            List<String> childIds = sysOrgUnitMapper.selectChildOrgIds(currentId);
            if (childIds == null || childIds.isEmpty()) {
                continue;
            }
            for (String childId : childIds) {
                if (StringUtils.hasText(childId) && ids.add(childId)) {
                    queue.add(childId);
                }
            }
        }
        return ids;
    }
}
