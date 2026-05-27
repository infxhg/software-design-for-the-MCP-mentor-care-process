package com.bnbu.mentoring.Service;

import com.bnbu.mentoring.Client.OrgServiceClient;
import com.bnbu.mentoring.Client.UserServiceClient;
import com.bnbu.mentoring.DTO.ChangeGroupMentorRequest;
import com.bnbu.mentoring.DTO.EnsureMcpGroupRequest;
import com.bnbu.mentoring.DTO.McpGroupDTO;
import com.bnbu.mentoring.DTO.Result;
import com.bnbu.mentoring.DTO.UserSearchRequestDTO;
import com.bnbu.mentoring.Entity.McpStudentExt;
import com.bnbu.mentoring.Util.GroupKeyUtils;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * MCP 小组门面：小组元数据在组织服务（sys_org_unit + sys_user_org），
 * 学生扩展字段（专业/状态）仍在 mcp_student_ext。
 */
@Service
@RequiredArgsConstructor
public class McpGroupService {

    private final OrgServiceClient orgServiceClient;
    private final UserServiceClient userServiceClient;
    private final McpStudentExtService mcpStudentExtService;
    private final ObjectMapper objectMapper;

    public McpGroupDTO getGroup(String groupId) {
        return requireGroupFromOrg(groupId);
    }

    public List<McpGroupDTO> listByMentor(String mentorId) {
        Result res = orgServiceClient.listGroupsByMentor(mentorId);
        if (!isOk(res) || res.getData() == null) {
            return List.of();
        }
        List<McpGroupDTO> groups = objectMapper.convertValue(
                res.getData(),
                objectMapper.getTypeFactory().constructCollectionType(List.class, McpGroupDTO.class));
        if (groups != null) {
            groups.forEach(this::enrichGroupIdentity);
        }
        return groups != null ? groups : List.of();
    }

    /**
     * 导师负责的小组唯一键（sys_org_unit.id / groupKey）。
     * @deprecated 请使用 {@link #listGroupKeysByMentor(String)}
     */
    @Deprecated
    public List<String> listGroupIdsByMentor(String mentorId) {
        return listGroupKeysByMentor(mentorId);
    }

    /** 导师负责的小组 groupKey（UUID）列表 */
    public List<String> listGroupKeysByMentor(String mentorId) {
        return listByMentor(mentorId).stream()
                .map(this::resolveGroupKeyFromDto)
                .filter(StringUtils::hasText)
                .distinct()
                .toList();
    }

    /**
     * 从学生扩展行解析 groupKey（组织 UUID）。
     * <ul>
     *   <li>优先 {@code group_key}</li>
     *   <li>兼容 legacy：{@code group_id} 直接为组织节点 id（如 group_a1）</li>
     *   <li>新模型：{@code group_id} 为展示标签，结合组织树 MAJOR 定位唯一组</li>
     * </ul>
     */
    public String resolveGroupKeyForStudent(McpStudentExt ext) {
        if (ext == null) {
            return null;
        }
        if (StringUtils.hasText(ext.getGroupKey())) {
            return ext.getGroupKey().trim();
        }
        if (!StringUtils.hasText(ext.getGroupId())) {
            return null;
        }
        String raw = ext.getGroupId().trim();
        if (com.bnbu.mentoring.Util.GroupKeyUtils.isOrgUnitUuid(raw)) {
            return raw;
        }
        if (isExistingOrgGroup(raw)) {
            return raw;
        }
        List<String> keys = new LinkedHashSet<>(collectGroupKeysFromExtRows(raw)).stream().toList();
        if (keys.isEmpty()) {
            keys = findGroupKeysFromOrgByLabel(raw);
        }
        if (keys.isEmpty()) {
            return null;
        }
        if (keys.size() == 1) {
            return keys.get(0);
        }
        String studentId = ext.getStudentId();
        if (StringUtils.hasText(studentId)) {
            for (String gk : keys) {
                if (listStudentIdsFromOrg(gk).contains(studentId)) {
                    return gk;
                }
            }
        }
        return null;
    }

    /** 组织库中是否存在该 GROUP 节点（用于 legacy group_id=group_a1 等） */
    public boolean isExistingOrgGroup(String orgUnitId) {
        if (!StringUtils.hasText(orgUnitId)) {
            return false;
        }
        try {
            getGroup(orgUnitId.trim());
            return true;
        } catch (RuntimeException e) {
            return false;
        }
    }

    /**
     * 确保小组存在（不存在则创建）。新建时挂在专业 MAJOR 下。
     *
     * @param majorId 专业代码或 MAJOR 节点 id（如 CST、org_cst），不可传学院 org_fst
     */
    @Transactional
    public McpGroupDTO ensureGroup(String groupId, String mentorId, String majorId, String displayName) {
        String majorParentOrgId = resolveMajorOrgIdRequired(majorId);
        EnsureMcpGroupRequest req = new EnsureMcpGroupRequest();
        req.setGroupId(groupId);
        req.setMentorId(mentorId);
        req.setParentOrgId(majorParentOrgId);
        req.setDisplayName(displayName);
        Result res = orgServiceClient.ensureGroup(req);
        if (!isOk(res)) {
            throw new RuntimeException("ensure group failed: " + (res != null ? res.getMessage() : "no response"));
        }
        McpGroupDTO dto = objectMapper.convertValue(res.getData(), McpGroupDTO.class);
        enrichGroupIdentity(dto);
        return dto;
    }

    @Transactional
    public McpGroupDTO changeMentor(String groupId, String newMentorId) {
        ChangeGroupMentorRequest req = new ChangeGroupMentorRequest();
        req.setMentorId(newMentorId);
        Result res = orgServiceClient.changeGroupMentor(groupId, req);
        if (!isOk(res)) {
            throw new RuntimeException("change mentor failed: " + (res != null ? res.getMessage() : "no response"));
        }
        return objectMapper.convertValue(res.getData(), McpGroupDTO.class);
    }

    @Transactional
    public void addMember(String groupKey, String studentId, String majorId, String status) {
        assertStudentExistsInUserService(studentId);
        addMemberInternal(groupKey, studentId, majorId, status);
    }

    /** 导入流程专用：调用方已通过 ensure-user 创建学生，跳过重复校验。 */
    @Transactional
    public void addMemberFromImport(String groupKey, String studentId, String majorId, String status) {
        addMemberInternal(groupKey, studentId, majorId, status);
    }

    private void addMemberInternal(String groupKey, String studentId, String majorId, String status) {
        // groupKey 是 UUID，获取该组的展示标签（如 2024-2025-Y1）用于写入 groupId 字段
        McpGroupDTO groupDTO = getGroup(groupKey);
        String groupLabel = groupDTO.getName(); // "2024-2025-Y1"

        getGroup(groupKey); // validate group exists (already done above)
        Result bindRes = orgServiceClient.bindGroupMember(groupKey, studentId);
        if (!isOk(bindRes)) {
            throw new RuntimeException("bind student to group failed: " + bindRes.getMessage());
        }
        McpStudentExt ext = mcpStudentExtService.getById(studentId);
        if (ext == null) {
            ext = new McpStudentExt();
            ext.setStudentId(studentId);
            ext.setGroupKey(groupKey);   // UUID
            ext.setGroupId(groupLabel);  // 展示标签
            ext.setStatus(status != null ? status : "Normal");
            ext.setUpdateTime(LocalDateTime.now());
            mcpStudentExtService.save(ext);
        } else {
            ext.setGroupKey(groupKey);
            ext.setGroupId(groupLabel);
            if (StringUtils.hasText(majorId) && !isGroupKeyUnderMajor(groupKey, majorId)) {
                throw new RuntimeException("Group " + groupKey + " is not under major " + majorId.trim());
            }
            if (status != null) {
                ext.setStatus(status);
            }
            ext.setUpdateTime(LocalDateTime.now());
            mcpStudentExtService.updateById(ext);
        }
    }

    @Transactional
    public void removeMember(String groupKey, String studentId) {
        if (!StringUtils.hasText(groupKey) || !StringUtils.hasText(studentId)) {
            throw new RuntimeException("groupKey and studentId are required");
        }
        String gk = groupKey.trim();
        String sid = studentId.trim();
        McpGroupDTO group = getGroup(gk);
        String groupLabel = group.getName();
        if (!isMemberOfGroup(gk, sid)) {
            throw new RuntimeException("Student " + sid + " is not a member of this group");
        }

        orgServiceClient.unbindGroupMember(gk, sid);

        McpStudentExt ext = mcpStudentExtService.getById(sid);
        if (ext != null && isStudentAssignedToGroup(ext, gk, groupLabel)) {
            // updateById 默认忽略 null 字段，必须用 lambdaUpdate 才能真正清空 group_key / group_id
            mcpStudentExtService.lambdaUpdate()
                    .eq(McpStudentExt::getStudentId, sid)
                    .set(McpStudentExt::getGroupKey, null)
                    .set(McpStudentExt::getGroupId, null)
                    .set(McpStudentExt::getUpdateTime, LocalDateTime.now())
                    .update();
        }
    }

    /**
     * 写操作（加组员）解析唯一 groupKey：可按标签+专业定位目标组，即使 ext 中 group_id 尚未一致。
     */
    public String resolveUniqueGroupKeyForMemberWrite(String groupLabel, String majorId, String studentId) {
        return resolveUniqueGroupKeyForMemberWrite(groupLabel, majorId, studentId, false, null);
    }

    /**
     * 写操作（加/删成员）解析唯一 groupKey。
     * 加人：ext 与请求标签不一致时仍可按组织树 label+majorId 定位目标组。
     * 删人：须能证明学生已在目标组（org 绑定或 ext/group_key 一致），避免误删。
     * 同标签+专业存在多个 GROUP 时，传 mentorId 与换导师接口同理消歧。
     */
    public String resolveUniqueGroupKeyForMemberWrite(String groupLabel, String majorId, String studentId,
                                                      boolean forRemove) {
        return resolveUniqueGroupKeyForMemberWrite(groupLabel, majorId, studentId, forRemove, null);
    }

    public String resolveUniqueGroupKeyForMemberWrite(String groupLabel, String majorId, String studentId,
                                                      boolean forRemove, String mentorId) {
        if (!StringUtils.hasText(groupLabel)) {
            throw new RuntimeException("groupId is required");
        }
        String label = groupLabel.trim();

        if (StringUtils.hasText(studentId) && StringUtils.hasText(majorId)) {
            String sid = studentId.trim();
            String mid = majorId.trim();
            String fromStudent = resolveGroupKeyFromStudentMajorAndLabel(sid, label, mid);
            if (StringUtils.hasText(fromStudent)) {
                // #region agent log
                debugResolveGroupKeyLog("H5_student_major_label", "resolveUniqueGroupKeyForMemberWrite",
                        "resolvedFromStudent", sid, label, mid, fromStudent);
                // #endregion
                return fromStudent;
            }
            // 加组员：ext 与标签不一致时继续；删组员：须靠下方成员关系过滤定位
        }

        if (StringUtils.hasText(majorId)) {
            String fromLabelMajor = resolveUniqueGroupKeyByLabelAndMajor(label, majorId.trim(), mentorId);
            if (StringUtils.hasText(fromLabelMajor)) {
                boolean accept = !forRemove || !StringUtils.hasText(studentId)
                        || isMemberOfGroup(fromLabelMajor, studentId.trim());
                if (accept) {
                    // #region agent log
                    debugResolveGroupKeyLog("H6_label_major", "resolveUniqueGroupKeyForMemberWrite",
                            "resolvedFromLabelMajor",
                            studentId != null ? studentId.trim() : "",
                            label, majorId.trim(), fromLabelMajor);
                    // #endregion
                    return fromLabelMajor;
                }
            }
        }

        List<String> keys = filterGroupKeysByMentor(resolveGroupKeysByLabel(label, majorId), mentorId);
        if (keys.isEmpty() && StringUtils.hasText(mentorId)) {
            throw new RuntimeException("Group \"" + label + "\" not found for mentor " + mentorId.trim());
        }
        if (keys.isEmpty()) {
            throw new RuntimeException("Group not found: " + label);
        }
        if (keys.size() == 1) {
            String only = keys.get(0);
            if (forRemove && StringUtils.hasText(studentId)
                    && !isMemberOfGroup(only, studentId.trim())) {
                throw new RuntimeException("Student " + studentId.trim()
                        + " is not a member of group \"" + label + "\"");
            }
            return only;
        }
        if (!StringUtils.hasText(studentId)) {
            throw new RuntimeException("Group \"" + label
                    + "\" is ambiguous; please specify majorId and studentId");
        }
        String sid = studentId.trim();
        List<String> keysWithStudent = keys.stream()
                .filter(gk -> isMemberOfGroup(gk, sid))
                .distinct()
                .collect(Collectors.toList());
        if (keysWithStudent.size() == 1) {
            return keysWithStudent.get(0);
        }
        if (keysWithStudent.isEmpty()) {
            throw new RuntimeException("Student " + sid + " is not a member of group \"" + label + "\"");
        }
        throw new RuntimeException("Group \"" + label
                + "\" is ambiguous for student " + sid
                + "; specify majorId, mentorId, or fix duplicate org bindings");
    }

    private List<String> filterGroupKeysByMentor(List<String> groupKeys, String mentorId) {
        if (!StringUtils.hasText(mentorId) || groupKeys == null || groupKeys.isEmpty()) {
            return groupKeys;
        }
        String mid = resolveMentorUserId(mentorId);
        List<String> matched = groupKeys.stream()
                .filter(gk -> isMentorOfGroup(mid, gk))
                .distinct()
                .collect(Collectors.toList());
        // #region agent log
        if (matched.isEmpty()) {
            debugResolveGroupKeyLog("H7_mentor_filter", "filterGroupKeysByMentor", "noGroupForMentor",
                    mentorId.trim(), "", "", "resolvedMentorId=" + mid
                            + ",candidateGroups=" + String.join(",", groupKeys));
        }
        // #endregion
        return matched;
    }

    /**
     * 将 mentorId 参数解析为 sys_user.id：支持直接传 id，也支持用户名/邮箱/姓名关键字（与导入、导出一致）。
     */
    public String resolveMentorUserId(String mentorToken) {
        if (!StringUtils.hasText(mentorToken)) {
            throw new RuntimeException("mentorId is required when multiple groups share the same label and major");
        }
        String token = mentorToken.trim();
        try {
            Result byId = userServiceClient.getUserById(token);
            if (isOk(byId) && byId.getData() != null) {
                String id = extractUserIdFromPayload(byId.getData());
                if (StringUtils.hasText(id)) {
                    return id;
                }
            }
        } catch (Exception ignored) {
            // fall through to keyword search
        }
        UserSearchRequestDTO dto = new UserSearchRequestDTO();
        dto.setRoleCode("MENTOR");
        dto.setKeyword(token);
        List<Map<String, Object>> users = searchMentorUsers(dto);
        if (users.isEmpty()) {
            throw new RuntimeException("Mentor not found for mentorId=\"" + token
                    + "\". Use groups[].mentorId from GET /api/mentoring/groups/search (not FC account id).");
        }
        for (Map<String, Object> u : users) {
            String id = u.get("id") != null ? String.valueOf(u.get("id")).trim() : "";
            String username = u.get("username") != null ? String.valueOf(u.get("username")).trim() : "";
            if (token.equals(id) || token.equalsIgnoreCase(username)) {
                return id;
            }
        }
        if (users.size() == 1) {
            return String.valueOf(users.get(0).get("id")).trim();
        }
        throw new RuntimeException("Multiple mentors match \"" + token
                + "\"; pass the exact groups[].mentorId from search response");
    }

    @SuppressWarnings("unchecked")
    private List<Map<String, Object>> searchMentorUsers(UserSearchRequestDTO dto) {
        try {
            Result res = userServiceClient.searchUsersByConditions(dto);
            if (!isOk(res) || res.getData() == null) {
                return List.of();
            }
            return objectMapper.convertValue(
                    res.getData(),
                    objectMapper.getTypeFactory().constructCollectionType(List.class, Map.class));
        } catch (Exception e) {
            return List.of();
        }
    }

    private String extractUserIdFromPayload(Object data) {
        if (data instanceof Map<?, ?> map && map.get("id") != null) {
            return String.valueOf(map.get("id")).trim();
        }
        try {
            Map<?, ?> map = objectMapper.convertValue(data, Map.class);
            if (map != null && map.get("id") != null) {
                return String.valueOf(map.get("id")).trim();
            }
        } catch (Exception ignored) {
            // ignore
        }
        return null;
    }

    /**
     * 用「学号 + 展示标签 + 专业」定位该学生所属组的 UUID（仅看该生 ext，不看其他同专业学生的组）。
     */
    private String resolveGroupKeyFromStudentMajorAndLabel(String studentId, String groupLabel, String majorId) {
        McpStudentExt ext = mcpStudentExtService.getById(studentId);
        if (ext == null || !labelMatches(ext.getGroupId(), groupLabel)) {
            return null;
        }
        String gk = StringUtils.hasText(ext.getGroupKey()) ? ext.getGroupKey().trim() : resolveGroupKeyForStudent(ext);
        if (!StringUtils.hasText(gk)) {
            return null;
        }
        if (StringUtils.hasText(majorId) && !isGroupKeyUnderMajor(gk, majorId)) {
            return null;
        }
        return gk;
    }

    public boolean isGroupKeyUnderMajor(String groupKey, String majorToken) {
        if (!StringUtils.hasText(groupKey) || !StringUtils.hasText(majorToken)) {
            return false;
        }
        try {
            return resolveMajorSubtreeOrgIds(majorToken).contains(groupKey.trim());
        } catch (RuntimeException e) {
            return false;
        }
    }

    public List<McpStudentExt> filterMembersByMajorSubtree(List<McpStudentExt> members, String majorToken) {
        if (members == null || members.isEmpty() || !StringUtils.hasText(majorToken)) {
            return members;
        }
        return members.stream()
                .filter(ext -> {
                    String gk = resolveGroupKeyForStudent(ext);
                    return StringUtils.hasText(gk) && isGroupKeyUnderMajor(gk, majorToken);
                })
                .collect(Collectors.toList());
    }

    private static boolean labelMatches(String stored, String requested) {
        return stored != null && requested != null && stored.trim().equals(requested.trim());
    }

    /**
     * 写操作：仅凭展示标签 + 专业定位唯一 groupKey（加组员时尚无该生 ext 记录时使用）。
     * 优先组织树（GROUP 挂在对应 MAJOR 下），其次 ext 表上已出现的 group_key 共识。
     */
    /**
     * 换导师：展示标签 + 原导师；同标签多组时再传 majorId 消歧。
     * 与组织服务 ensureGroup 按 (label + mentor) 查找逻辑一致。
     */
    public String resolveUniqueGroupKeyForMentorChange(String groupLabel, String majorId, String previousMentorId) {
        if (!StringUtils.hasText(groupLabel)) {
            throw new RuntimeException("groupId is required");
        }
        if (!StringUtils.hasText(previousMentorId)) {
            throw new RuntimeException("previousMentorId is required to identify the group");
        }
        String label = groupLabel.trim();
        String prevMentor = previousMentorId.trim();

        List<McpGroupDTO> matched = listByMentor(prevMentor).stream()
                .filter(g -> matchesGroupLabel(g, label))
                .collect(Collectors.toList());

        if (StringUtils.hasText(majorId)) {
            String mid = majorId.trim();
            List<String> underMajor = findGroupKeysFromOrgByLabelAndMajor(label, mid);
            matched = matched.stream()
                    .filter(g -> underMajor.contains(resolveGroupKeyFromDto(g)))
                    .collect(Collectors.toList());
        }

        if (matched.size() == 1) {
            return resolveGroupKeyFromDto(matched.get(0));
        }
        if (matched.isEmpty() && StringUtils.hasText(majorId)) {
            for (String gk : findGroupKeysFromOrgByLabelAndMajor(label, majorId.trim())) {
                if (isMentorOfGroup(prevMentor, gk)) {
                    return gk;
                }
            }
        }
        if (matched.isEmpty()) {
            throw new RuntimeException("Group \"" + label + "\" not found for previous mentor " + prevMentor);
        }
        throw new RuntimeException("Multiple groups match label \"" + label + "\" and mentor " + prevMentor
                + "; specify majorId");
    }

    public String resolveUniqueGroupKeyByLabelAndMajor(String groupLabel, String majorId) {
        return resolveUniqueGroupKeyByLabelAndMajor(groupLabel, majorId, null);
    }

    /**
     * 按展示标签 + 专业定位唯一 groupKey；同专业下多组时可用 mentorId 消歧。
     */
    public String resolveUniqueGroupKeyByLabelAndMajor(String groupLabel, String majorId, String mentorId) {
        if (!StringUtils.hasText(groupLabel) || !StringUtils.hasText(majorId)) {
            return null;
        }
        String label = groupLabel.trim();
        String mid = majorId.trim();

        List<String> orgKeys = findGroupKeysFromOrgByLabelAndMajor(label, mid);
        orgKeys = filterGroupKeysByMentor(orgKeys, mentorId);
        if (orgKeys.size() == 1) {
            return orgKeys.get(0);
        }
        if (orgKeys.size() > 1) {
            String hint = StringUtils.hasText(mentorId)
                    ? " for mentor " + mentorId.trim()
                    : "; specify mentorId";
            throw new RuntimeException("Multiple org groups named \"" + label + "\" under major " + mid + hint);
        }
        if (StringUtils.hasText(mentorId) && !findGroupKeysFromOrgByLabelAndMajor(label, mid).isEmpty()) {
            throw new RuntimeException("Group \"" + label + "\" under major " + mid
                    + " not found for mentor " + mentorId.trim()
                    + ". Check groups[].mentorId in GET /api/mentoring/groups/search — search merges all matching groups.");
        }

        List<String> extKeys = collectDistinctGroupKeysFromExtRows(label, mid);
        extKeys = filterGroupKeysByMentor(extKeys, mentorId);
        if (extKeys.size() == 1) {
            return extKeys.get(0);
        }
        if (extKeys.size() > 1) {
            String hint = StringUtils.hasText(mentorId) ? " (mentorId=" + mentorId.trim() + ")" : "";
            throw new RuntimeException("Multiple group_key in mcp_student_ext for \"" + label + "\" / " + mid + hint);
        }
        return null;
    }

    private List<String> findGroupKeysFromOrgByLabelAndMajor(String groupLabel, String majorId) {
        try {
            Result res = orgServiceClient.findGroupKeysByLabelAndMajor(groupLabel.trim(), majorId.trim());
            if (!isOk(res) || res.getData() == null) {
                return List.of();
            }
            return objectMapper.convertValue(
                    res.getData(),
                    objectMapper.getTypeFactory().constructCollectionType(List.class, String.class));
        } catch (Exception e) {
            return List.of();
        }
    }

    /** ext 中该标签+专业下已出现的非空 group_key（去重）。 */
    private List<String> collectDistinctGroupKeysFromExtRows(String groupLabel, String majorId) {
        if (StringUtils.hasText(majorId)) {
            return findGroupKeysFromOrgByLabelAndMajor(groupLabel, majorId);
        }
        return collectGroupKeysFromExtRows(groupLabel).stream()
                .filter(StringUtils::hasText)
                .distinct()
                .collect(Collectors.toList());
    }

    private boolean isMemberOfGroup(String groupKey, String studentId) {
        if (listStudentIdsFromOrg(groupKey).contains(studentId)) {
            return true;
        }
        McpStudentExt ext = mcpStudentExtService.getById(studentId);
        if (ext == null) {
            return false;
        }
        McpGroupDTO group = getGroup(groupKey);
        return isStudentAssignedToGroup(ext, groupKey, group.getName());
    }

    private static boolean isStudentAssignedToGroup(McpStudentExt ext, String groupKey, String groupLabel) {
        if (ext == null || !StringUtils.hasText(groupKey)) {
            return false;
        }
        if (StringUtils.hasText(ext.getGroupKey())) {
            return groupKey.equals(ext.getGroupKey().trim());
        }
        String gid = ext.getGroupId() != null ? ext.getGroupId().trim() : "";
        if (GroupKeyUtils.isOrgUnitUuid(gid) || groupKey.equals(gid)) {
            return groupKey.equals(gid);
        }
        // group_id 仅为展示标签时不能据此认定属于任意同名 UUID；成员关系以 org 绑定为准（见 isMemberOfGroup）
        return false;
    }

    public List<McpStudentExt> listMembers(String groupKey) {
        getGroup(groupKey);
        Set<String> studentIds = new LinkedHashSet<>(listStudentIdsFromOrg(groupKey));
        mcpStudentExtService.lambdaQuery()
                .eq(McpStudentExt::getGroupKey, groupKey)
                .list()
                .forEach(ext -> studentIds.add(ext.getStudentId()));
        if (studentIds.isEmpty()) {
            return List.of();
        }
        List<McpStudentExt> members = new ArrayList<>();
        for (String studentId : studentIds) {
            McpStudentExt ext = mcpStudentExtService.getById(studentId);
            if (ext == null) {
                ext = new McpStudentExt();
                ext.setStudentId(studentId);
                ext.setGroupKey(groupKey);
            } else if (!groupKey.equals(ext.getGroupKey())) {
                ext.setGroupKey(groupKey);
            }
            members.add(ext);
        }
        return members;
    }

    public List<String> listStudentIdsFromOrg(String groupId) {
        try {
            Result res = orgServiceClient.listGroupStudentMemberIds(groupId);
            if (!isOk(res) || res.getData() == null) {
                return List.of();
            }
            return objectMapper.convertValue(
                    res.getData(),
                    objectMapper.getTypeFactory().constructCollectionType(List.class, String.class));
        } catch (Exception e) {
            return List.of();
        }
    }

    public String resolveFacultyOrgId(String groupId) {
        Result res = orgServiceClient.getGroupFacultyOrgId(groupId);
        if (!isOk(res) || res.getData() == null) {
            return null;
        }
        return String.valueOf(res.getData());
    }

    public boolean isMentorOfGroup(String mentorId, String groupId) {
        try {
            Result res = orgServiceClient.isMentorOfGroup(groupId, mentorId);
            return isOk(res) && isFeignBooleanTrue(res.getData());
        } catch (Exception e) {
            return false;
        }
    }

    private static boolean isFeignBooleanTrue(Object data) {
        if (Boolean.TRUE.equals(data)) {
            return true;
        }
        if (data instanceof String s) {
            return "true".equalsIgnoreCase(s.trim());
        }
        return false;
    }

    /**
     * Mentor scope: resolve groupKey (UUID) from label by matching name in mentor's own groups.
     * Throws if the label doesn't match any of the mentor's groups.
     */
    public String resolveGroupKeyForMentor(String groupLabel, String mentorId) {
        return listByMentor(mentorId).stream()
                .filter(g -> matchesGroupLabel(g, groupLabel))
                .map(this::resolveGroupKeyFromDto)
                .findFirst()
                .orElseThrow(() -> new RuntimeException(
                        "Group \"" + groupLabel + "\" not found in mentor's groups"));
    }

    /**
     * FC/Admin：按展示标签解析 groupKey；传 majorId 时仅返回该 MAJOR 子树下的 GROUP（组织树为准）。
     */
    public List<String> resolveGroupKeysByLabel(String groupLabel, String majorId) {
        if (!StringUtils.hasText(groupLabel)) {
            return List.of();
        }
        String label = groupLabel.trim();
        if (StringUtils.hasText(majorId)) {
            return findGroupKeysFromOrgByLabelAndMajor(label, majorId.trim());
        }
        Set<String> keys = new LinkedHashSet<>();
        keys.addAll(findGroupKeysFromOrgByLabel(label));
        keys.addAll(collectGroupKeysFromExtRows(label));
        for (McpStudentExt row : mcpStudentExtService.lambdaQuery().eq(McpStudentExt::getGroupId, label).list()) {
            String gk = resolveGroupKeyForStudent(row);
            if (StringUtils.hasText(gk)) {
                keys.add(gk.trim());
            }
        }
        return new ArrayList<>(keys);
    }

    private List<String> findGroupKeysFromOrgByLabel(String groupLabel) {
        try {
            Result res = orgServiceClient.findGroupKeysByLabel(groupLabel.trim());
            if (!isOk(res) || res.getData() == null) {
                return List.of();
            }
            return objectMapper.convertValue(
                    res.getData(),
                    objectMapper.getTypeFactory().constructCollectionType(List.class, String.class));
        } catch (Exception e) {
            return List.of();
        }
    }

    /** 从 ext 表读取已知的 group_key（不触发 resolveGroupKeyForStudent，避免递归）。 */
    private List<String> collectGroupKeysFromExtRows(String groupLabel) {
        if (!StringUtils.hasText(groupLabel)) {
            return List.of();
        }
        Set<String> keys = new LinkedHashSet<>();
        for (McpStudentExt row : mcpStudentExtService.lambdaQuery()
                .eq(McpStudentExt::getGroupId, groupLabel.trim())
                .list()) {
            if (StringUtils.hasText(row.getGroupKey())) {
                keys.add(row.getGroupKey().trim());
                continue;
            }
            String raw = row.getGroupId() != null ? row.getGroupId().trim() : "";
            if (com.bnbu.mentoring.Util.GroupKeyUtils.isOrgUnitUuid(raw) || isExistingOrgGroup(raw)) {
                keys.add(raw);
            }
        }
        return new ArrayList<>(keys);
    }

    /**
     * 解析成功后回写 group_key，避免 legacy 数据反复解析失败。
     */
    public void persistGroupKeyIfResolved(McpStudentExt ext, String groupKey) {
        if (ext == null || !StringUtils.hasText(groupKey) || groupKey.equals(ext.getGroupKey())) {
            return;
        }
        ext.setGroupKey(groupKey.trim());
        mcpStudentExtService.updateById(ext);
    }

    private McpGroupDTO requireGroupFromOrg(String groupId) {
        Result res = orgServiceClient.getGroup(groupId);
        if (res == null || res.getCode() == null) {
            throw new RuntimeException("组织服务无响应");
        }
        if (res.getCode() != 200) {
            throw new RuntimeException(res.getMessage() != null ? res.getMessage() : "Group not found: " + groupId);
        }
        if (res.getData() == null) {
            throw new RuntimeException("Group not found: " + groupId);
        }
        McpGroupDTO dto;
        if (res.getData() instanceof Map<?, ?> map) {
            dto = objectMapper.convertValue(map, McpGroupDTO.class);
        } else {
            dto = objectMapper.convertValue(res.getData(), McpGroupDTO.class);
        }
        enrichGroupIdentity(dto);
        return dto;
    }

    private void enrichGroupIdentity(McpGroupDTO dto) {
        if (dto == null) {
            return;
        }
        if (StringUtils.hasText(dto.getGroupKey())) {
            if (!StringUtils.hasText(dto.getGroupLabel())) {
                dto.setGroupLabel(StringUtils.hasText(dto.getName()) ? dto.getName() : dto.getGroupId());
            }
            if (!StringUtils.hasText(dto.getGroupId()) && StringUtils.hasText(dto.getGroupLabel())) {
                dto.setGroupId(dto.getGroupLabel());
            }
            return;
        }
        String rawId = dto.getGroupId();
        if (GroupKeyUtils.isOrgUnitUuid(rawId)) {
            dto.setGroupKey(rawId);
            dto.setGroupLabel(StringUtils.hasText(dto.getName()) ? dto.getName() : null);
        } else if (StringUtils.hasText(dto.getName())) {
            dto.setGroupLabel(dto.getName());
            if (!StringUtils.hasText(dto.getGroupId())) {
                dto.setGroupId(dto.getName());
            }
        }
        enrichGroupMajor(dto);
    }

    private void enrichGroupMajor(McpGroupDTO dto) {
        String gk = resolveGroupKeyFromDto(dto);
        if (StringUtils.hasText(gk)) {
            dto.setMajor(resolveMajorDisplayNameForGroup(gk));
        }
    }

    private String resolveGroupKeyFromDto(McpGroupDTO dto) {
        if (dto == null) {
            return null;
        }
        if (StringUtils.hasText(dto.getGroupKey())) {
            return dto.getGroupKey().trim();
        }
        if (GroupKeyUtils.isOrgUnitUuid(dto.getGroupId())) {
            return dto.getGroupId().trim();
        }
        return null;
    }

    private boolean matchesGroupLabel(McpGroupDTO dto, String groupLabel) {
        if (groupLabel == null || dto == null) {
            return false;
        }
        String label = groupLabel.trim();
        return label.equals(dto.getName())
                || label.equals(dto.getGroupLabel())
                || label.equals(dto.getGroupId());
    }

    /**
     * 加组成员前校验：sys_user 中存在该用户，且拥有 STUDENT 角色、账号未封禁。
     */
    private void assertStudentExistsInUserService(String studentId) {
        if (!StringUtils.hasText(studentId)) {
            throw new RuntimeException("studentId is required");
        }
        String sid = studentId.trim();
        Result res = userServiceClient.getStudentById(sid);
        if (!isOk(res) || res.getData() == null) {
            String msg = res != null && StringUtils.hasText(res.getMessage())
                    ? res.getMessage()
                    : "学生不存在或未分配 STUDENT 角色";
            throw new RuntimeException(msg + ": " + sid);
        }
    }

    private boolean isOk(Result res) {
        return res != null && res.getCode() != null && res.getCode() == 200;
    }

    /**
     * 按系级组织 name（sys_org_unit.name，type=DEPARTMENT）解析子树，返回含根在内的全部下属单位 id。
     */
    public Set<String> resolveOrgUnitIdsUnderDepartmentName(String departmentName) {
        if (!StringUtils.hasText(departmentName)) {
            return Set.of();
        }
        com.bnbu.mentoring.DTO.OrgSubtreeDTO subtree = resolveSubtreeByName(departmentName.trim(), "DEPARTMENT");
        if (subtree.getOrgUnitIds() == null || subtree.getOrgUnitIds().isEmpty()) {
            return StringUtils.hasText(subtree.getRootOrgId())
                    ? Set.of(subtree.getRootOrgId())
                    : Set.of();
        }
        return new LinkedHashSet<>(subtree.getOrgUnitIds());
    }

    public com.bnbu.mentoring.DTO.OrgSubtreeDTO resolveSubtreeByName(String name, String type) {
        try {
            Result res = orgServiceClient.resolveSubtreeByName(name, type);
            if (!isOk(res) || res.getData() == null) {
                String msg = res != null && StringUtils.hasText(res.getMessage())
                        ? res.getMessage()
                        : "Organization unit not found";
                throw new RuntimeException(msg + ": " + name);
            }
            return objectMapper.convertValue(res.getData(), com.bnbu.mentoring.DTO.OrgSubtreeDTO.class);
        } catch (RuntimeException e) {
            throw e;
        } catch (Exception e) {
            throw new RuntimeException("Failed to resolve org subtree for name=" + name + ": " + e.getMessage(), e);
        }
    }

    public Set<String> resolveOrgSubtreeOrgIds(String orgName, String unitType) {
        com.bnbu.mentoring.DTO.OrgSubtreeDTO subtree = resolveSubtreeByName(orgName, unitType);
        if (subtree.getOrgUnitIds() == null || subtree.getOrgUnitIds().isEmpty()) {
            return StringUtils.hasText(subtree.getRootOrgId())
                    ? Set.of(subtree.getRootOrgId())
                    : Set.of();
        }
        return new LinkedHashSet<>(subtree.getOrgUnitIds());
    }

    public Set<String> resolveMajorSubtreeOrgIds(String majorIdOrCode) {
        if (!StringUtils.hasText(majorIdOrCode)) {
            return Set.of();
        }
        try {
            Result res = orgServiceClient.listMajorSubtreeOrgIds(majorIdOrCode.trim());
            if (!isOk(res) || res.getData() == null) {
                throw new RuntimeException("Major not found: " + majorIdOrCode.trim());
            }
            List<String> ids = objectMapper.convertValue(
                    res.getData(),
                    objectMapper.getTypeFactory().constructCollectionType(List.class, String.class));
            return ids == null ? Set.of() : new LinkedHashSet<>(ids);
        } catch (RuntimeException e) {
            throw e;
        } catch (Exception e) {
            throw new RuntimeException("Failed to resolve major subtree: " + majorIdOrCode, e);
        }
    }

    /** 从 GROUP 组织节点向上解析所属 MAJOR 展示名（如 CST）。 */
    public String resolveMajorDisplayNameForGroup(String groupKey) {
        if (!StringUtils.hasText(groupKey)) {
            return null;
        }
        try {
            Result res = orgServiceClient.resolveMajorDisplayNameForGroup(groupKey.trim());
            if (isOk(res) && res.getData() != null) {
                String name = String.valueOf(res.getData()).trim();
                return StringUtils.hasText(name) ? name : null;
            }
        } catch (Exception ignored) {
            // fall through
        }
        return null;
    }

    /** 按学生所属 GROUP 在组织树中定位 MAJOR 展示名。 */
    public String resolveMajorDisplayNameForStudent(McpStudentExt ext) {
        if (ext == null) {
            return null;
        }
        return resolveMajorDisplayNameForGroup(resolveGroupKeyForStudent(ext));
    }

    /** search 等接口：为组员列表附带 major 字段（ext 表不存专业）。 */
    public List<Map<String, Object>> toMemberViews(List<McpStudentExt> members) {
        if (members == null || members.isEmpty()) {
            return List.of();
        }
        List<Map<String, Object>> views = new ArrayList<>();
        for (McpStudentExt ext : members) {
            Map<String, Object> row = new LinkedHashMap<>();
            row.put("studentId", ext.getStudentId());
            row.put("status", ext.getStatus());
            row.put("groupId", ext.getGroupId());
            row.put("groupKey", ext.getGroupKey());
            row.put("updateTime", ext.getUpdateTime());
            row.put("major", resolveMajorDisplayNameForStudent(ext));
            views.add(row);
        }
        return views;
    }

    /** 统一专业展示码：CST、AI（支持传 org_cst、CST 或组织 name）。 */
    public String resolveMajorDisplayName(String majorIdOrCode) {
        if (!StringUtils.hasText(majorIdOrCode)) {
            return null;
        }
        try {
            Result res = orgServiceClient.resolveMajorDisplayName(majorIdOrCode.trim());
            if (!isOk(res) || res.getData() == null) {
                return majorIdOrCode.trim();
            }
            String name = String.valueOf(res.getData()).trim();
            return StringUtils.hasText(name) ? name : majorIdOrCode.trim();
        } catch (Exception e) {
            return majorIdOrCode.trim();
        }
    }

    /** 将 majorId（CST / org_cst）解析为组织库 MAJOR 节点 id，供 ensureGroup 作为 parentOrgId。 */
    public String resolveMajorOrgIdRequired(String majorId) {
        if (!StringUtils.hasText(majorId)) {
            throw new RuntimeException("majorId is required when creating a group (e.g. CST)");
        }
        try {
            Result res = orgServiceClient.resolveMajorOrgId(majorId.trim());
            if (!isOk(res) || res.getData() == null) {
                throw new RuntimeException("Major organization not found for majorId=" + majorId.trim());
            }
            String id = String.valueOf(res.getData()).trim();
            if (!StringUtils.hasText(id)) {
                throw new RuntimeException("Major organization not found for majorId=" + majorId.trim());
            }
            return id;
        } catch (RuntimeException e) {
            throw e;
        } catch (Exception e) {
            throw new RuntimeException("Failed to resolve major org id for majorId=" + majorId.trim() + ": " + e.getMessage(), e);
        }
    }

    // #region agent log
    private static void debugResolveGroupKeyLog(String hypothesisId, String location, String message,
                                                String studentId, String label, String majorId, String groupKey) {
        try {
            String json = "{\"sessionId\":\"6b255a\",\"hypothesisId\":\"" + hypothesisId
                    + "\",\"location\":\"" + location + "\",\"message\":\"" + message
                    + "\",\"data\":{\"studentId\":\"" + studentId + "\",\"groupLabel\":\"" + label
                    + "\",\"majorId\":\"" + majorId + "\",\"groupKey\":\"" + groupKey
                    + "\"},\"timestamp\":" + System.currentTimeMillis() + "}\n";
            java.nio.file.Files.writeString(
                    java.nio.file.Path.of("/Users/houshuoran/IdeaProjects/B09/.cursor/debug-6b255a.log"),
                    json,
                    java.nio.charset.StandardCharsets.UTF_8,
                    java.nio.file.StandardOpenOption.CREATE,
                    java.nio.file.StandardOpenOption.APPEND);
        } catch (Exception ignored) {
        }
    }
    // #endregion
}
