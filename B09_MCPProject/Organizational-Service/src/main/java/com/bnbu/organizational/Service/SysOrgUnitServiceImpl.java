package com.bnbu.organizational.Service;

import com.alibaba.nacos.api.model.v2.Result;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.bnbu.organizational.DTO.MentorVO;
import com.bnbu.organizational.DTO.UserRemoteDTO;
import com.bnbu.organizational.DTO.UserSearchDTO;
import com.bnbu.organizational.Entity.SysMentorInfo;
import com.bnbu.organizational.Entity.SysOrgUnit;
import com.bnbu.organizational.Mapper.SysMentorInfoMapper;
import com.bnbu.organizational.Mapper.SysOrgUnitMapper;
import com.bnbu.organizational.Mapper.SysUserOrgMapper;
import com.bnbu.organizational.DTO.StudentExtRemoteDTO;
import com.bnbu.organizational.DTO.StudentProfileVO;
import com.bnbu.organizational.OpenFeign.MentoringAccessClient;
import com.bnbu.organizational.OpenFeign.UserFeignClient;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.util.CollectionUtils;
import org.springframework.util.StringUtils;

import com.bnbu.organizational.DTO.CoordinatorScopeSearchVO;
import com.bnbu.organizational.DTO.FacultyConsultantVO;
import com.bnbu.organizational.DTO.McpGroupDetailVO;
import com.bnbu.organizational.DTO.McpGroupVO;

import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class SysOrgUnitServiceImpl extends ServiceImpl<SysOrgUnitMapper, SysOrgUnit> implements SysOrgUnitService {

    private final SysUserOrgMapper sysUserOrgMapper;
    private final SysMentorInfoMapper sysMentorInfoMapper; // 新增：用于查询本地 office 信息
    private final UserFeignClient userFeignClient;
    private final MentoringAccessClient mentoringAccessClient;
    private final ObjectMapper objectMapper; // 💡 新增：Spring Boot 自动注入的 JSON 转换神器
    private final SysOrgUnitMapper sysOrgUnitMapper;
    private final McpGroupOrgService mcpGroupOrgService;
    private final SysUserOrgService sysUserOrgService;

    @Override
    public List<MentorVO> searchMentorsByOrgId(String orgUnitId, String keyword) {

        // 1. 查询当前组织机构的基本信息
        SysOrgUnit orgUnit = this.getById(orgUnitId);
        if (orgUnit == null) {
            throw new RuntimeException("组织机构不存在");
        }

        // 2. 查询本地 sys_user_org 表，获取挂在这个 Department 下的所有用户 ID
        List<String> userIdsInOrg = sysUserOrgMapper.selectUserIdsByOrgId(orgUnitId);
        if (CollectionUtils.isEmpty(userIdsInOrg)) {
            return new ArrayList<>();
        }

        // 3. 构造搜索条件 DTO，透传 keyword
        UserSearchDTO searchDTO = new UserSearchDTO();
        searchDTO.setRoleCode("MENTOR");
        searchDTO.setUserIds(userIdsInOrg);
        searchDTO.setKeyword(keyword); 

        return executeMentorSearch(searchDTO, orgUnit.getName());
    }

    @Override
    public List<MentorVO> searchAllMentors(String keyword) {
        return searchMentorsForFacultyConsultant(null, keyword);
    }

    @Override
    public List<MentorVO> searchMentorsForFacultyConsultant(String consultantId, String keyword) {
        if (!StringUtils.hasText(keyword)) {
            return List.of();
        }
        String kw = keyword.trim();
        java.util.LinkedHashSet<String> mentorIds = new java.util.LinkedHashSet<>();

        // 1) 姓名 / 邮箱 / 学号式 id 搜索（User-Service）
        UserSearchDTO userSearch = new UserSearchDTO();
        userSearch.setRoleCode("MENTOR");
        userSearch.setKeyword(kw);
        List<UserRemoteDTO> byUser = fetchMentorsFromUserService(userSearch);
        if (!CollectionUtils.isEmpty(byUser)) {
            for (UserRemoteDTO u : byUser) {
                if (u.getId() != null && mentorInConsultantScope(consultantId, u.getId())) {
                    mentorIds.add(u.getId());
                }
            }
        }

        // 2) 按小组展示标签 groupId（如 2024-2025-Y1）反查绑定导师
        for (String groupKey : mcpGroupOrgService.findGroupKeysByLabel(kw)) {
            if (!groupInConsultantScope(consultantId, groupKey)) {
                continue;
            }
            McpGroupVO group = mcpGroupOrgService.getGroup(groupKey);
            if (StringUtils.hasText(group.getMentorId())) {
                mentorIds.add(group.getMentorId());
            }
        }

        return mentorIds.stream()
                .map(this::buildMentorVOById)
                .filter(java.util.Objects::nonNull)
                .collect(Collectors.toList());
    }

    @Override
    public McpGroupDetailVO getGroupDetailByKeyForFacultyConsultant(String consultantId, String groupKey) {
        if (!StringUtils.hasText(groupKey)) {
            throw new RuntimeException("groupKey is required");
        }
        if (!StringUtils.hasText(consultantId)) {
            throw new RuntimeException("未获取到当前登录 FC ID，请通过网关访问");
        }
        McpGroupVO group = mcpGroupOrgService.getGroup(groupKey.trim());
        if (!groupInConsultantScope(consultantId, groupKey.trim())) {
            throw new RuntimeException("权限不足：该小组不在您的学院管理范围内");
        }
        McpGroupDetailVO detail = new McpGroupDetailVO();
        detail.setGroup(group);
        if (StringUtils.hasText(group.getMentorId())) {
            detail.setMentor(buildMentorVOById(group.getMentorId()));
        }
        List<String> studentIds = mcpGroupOrgService.listStudentMemberIds(groupKey.trim());
        detail.setStudentMemberIds(studentIds);
        detail.setStudentCount(studentIds.size());
        return detail;
    }

    private MentorVO buildMentorVOById(String mentorId) {
        if (!StringUtils.hasText(mentorId)) {
            return null;
        }
        UserSearchDTO searchDTO = new UserSearchDTO();
        searchDTO.setRoleCode("MENTOR");
        searchDTO.setUserIds(List.of(mentorId.trim()));
        List<MentorVO> mentors = executeMentorSearch(searchDTO, null);
        return mentors.isEmpty() ? null : mentors.get(0);
    }

    private boolean groupInConsultantScope(String consultantId, String groupKey) {
        if (!StringUtils.hasText(consultantId)) {
            return true;
        }
        String facultyOrgId = mcpGroupOrgService.resolveFacultyOrgId(groupKey);
        return sysUserOrgService.isGroupFacultyInConsultantScope(consultantId.trim(), facultyOrgId);
    }

    private boolean mentorInConsultantScope(String consultantId, String mentorId) {
        if (!StringUtils.hasText(consultantId)) {
            return true;
        }
        List<String> facultyIds = sysUserOrgService.listFacultyOrgIdsForUser(consultantId.trim());
        if (CollectionUtils.isEmpty(facultyIds)) {
            return false;
        }
        List<String> orgIds = sysUserOrgMapper.selectOrgIdsByUserId(mentorId.trim());
        if (CollectionUtils.isEmpty(orgIds)) {
            return false;
        }
        for (String orgId : orgIds) {
            SysOrgUnit unit = this.getById(orgId);
            if (unit == null || !McpGroupOrgService.TYPE_GROUP.equalsIgnoreCase(unit.getUnitType())) {
                continue;
            }
            String facultyOrgId = mcpGroupOrgService.resolveFacultyOrgId(orgId);
            if (StringUtils.hasText(facultyOrgId) && facultyIds.contains(facultyOrgId)) {
                return true;
            }
        }
        return false;
    }

    private List<MentorVO> executeMentorSearch(UserSearchDTO searchDTO, String defaultDepartmentName) {
        List<UserRemoteDTO> remoteMentors = fetchMentorsFromUserService(searchDTO);
        if (CollectionUtils.isEmpty(remoteMentors)) {
            return new ArrayList<>();
        }

        List<String> realMentorIds = remoteMentors.stream()
                .map(UserRemoteDTO::getId)
                .collect(Collectors.toList());

        Map<String, String> officeMap = sysMentorInfoMapper.selectBatchIds(realMentorIds)
                .stream()
                .collect(Collectors.toMap(SysMentorInfo::getUserId, SysMentorInfo::getOffice));

        return remoteMentors.stream().map(u -> {
            MentorVO vo = new MentorVO();
            vo.setMentorId(u.getId());
            vo.setMentorName(u.getRealName());
            vo.setEmail(u.getEmail());
            vo.setDepartmentName(defaultDepartmentName != null ? defaultDepartmentName : resolveMentorDepartmentName(u.getId()));
            vo.setOffice(officeMap.getOrDefault(u.getId(), "未分配"));
            enrichMentorWithGroupIds(vo);
            return vo;
        }).collect(Collectors.toList());
    }

    private String resolveMentorDepartmentName(String mentorId) {
        List<String> orgIds = sysUserOrgMapper.selectOrgIdsByUserId(mentorId);
        if (CollectionUtils.isEmpty(orgIds)) {
            return "未知部门";
        }
        for (String orgId : orgIds) {
            SysOrgUnit unit = this.getById(orgId);
            if (unit == null) {
                continue;
            }
            if (McpGroupOrgService.TYPE_GROUP.equalsIgnoreCase(unit.getUnitType())
                    && StringUtils.hasText(unit.getParentId())) {
                SysOrgUnit parent = this.getById(unit.getParentId());
                if (parent != null && StringUtils.hasText(parent.getName())) {
                    return parent.getName();
                }
            }
            if (StringUtils.hasText(unit.getName())
                    && !McpGroupOrgService.TYPE_GROUP.equalsIgnoreCase(unit.getUnitType())) {
                return unit.getName();
            }
        }
        SysOrgUnit first = this.getById(orgIds.get(0));
        return first != null && StringUtils.hasText(first.getName()) ? first.getName() : "未知部门";
    }

    private List<MentorVO> executeMentorSearchGlobal(UserSearchDTO searchDTO) {
        List<UserRemoteDTO> remoteMentors = fetchMentorsFromUserService(searchDTO);
        if (CollectionUtils.isEmpty(remoteMentors)) {
            return new ArrayList<>();
        }

        List<String> realMentorIds = remoteMentors.stream()
                .map(UserRemoteDTO::getId)
                .collect(Collectors.toList());

        // 查询 Office
        Map<String, String> officeMap = sysMentorInfoMapper.selectBatchIds(realMentorIds)
                .stream()
                .collect(Collectors.toMap(SysMentorInfo::getUserId, SysMentorInfo::getOffice));

        // 查询这些 Mentor 分别属于哪些部门
        List<com.bnbu.organizational.Entity.SysUserOrg> userOrgs = sysUserOrgMapper.selectList(
                new com.baomidou.mybatisplus.core.conditions.query.QueryWrapper<com.bnbu.organizational.Entity.SysUserOrg>()
                        .in("user_id", realMentorIds)
        );

        List<String> orgUnitIds = userOrgs.stream()
                .map(com.bnbu.organizational.Entity.SysUserOrg::getOrgUnitId)
                .distinct()
                .collect(Collectors.toList());

        Map<String, String> orgNameMap = new java.util.HashMap<>();
        if (!CollectionUtils.isEmpty(orgUnitIds)) {
            orgNameMap = this.listByIds(orgUnitIds).stream()
                    .collect(Collectors.toMap(SysOrgUnit::getUnitId, SysOrgUnit::getName));
        }

        // 把 userId 映射到他的第一个部门名称上 (简单处理)
        Map<String, String> userDeptMap = new java.util.HashMap<>();
        for (com.bnbu.organizational.Entity.SysUserOrg uo : userOrgs) {
            userDeptMap.putIfAbsent(uo.getUserId(), orgNameMap.getOrDefault(uo.getOrgUnitId(), "未知部门"));
        }

        return remoteMentors.stream().map(u -> {
            MentorVO vo = new MentorVO();
            vo.setMentorId(u.getId());
            vo.setMentorName(u.getRealName());
            vo.setEmail(u.getEmail());
            vo.setDepartmentName(userDeptMap.getOrDefault(u.getId(), "未知部门"));
            vo.setOffice(officeMap.getOrDefault(u.getId(), "未分配"));
            enrichMentorWithGroupIds(vo);
            return vo;
        }).collect(Collectors.toList());
    }

    /**
     * 从 sys_user_org 填充导师所属的 MCP 小组：groupId/groupIds=学年标签，groupKeys=UUID。
     */
    private void enrichMentorWithGroupIds(MentorVO vo) {
        if (vo == null || vo.getMentorId() == null) {
            return;
        }
        List<String> orgIds = sysUserOrgMapper.selectOrgIdsByUserId(vo.getMentorId());
        if (CollectionUtils.isEmpty(orgIds)) {
            return;
        }
        List<SysOrgUnit> units = this.listByIds(orgIds);
        List<SysOrgUnit> groupUnits = units.stream()
                .filter(u -> u != null && McpGroupOrgService.TYPE_GROUP.equalsIgnoreCase(u.getUnitType()))
                .collect(Collectors.toMap(SysOrgUnit::getUnitId, u -> u, (a, b) -> a, java.util.LinkedHashMap::new))
                .values()
                .stream()
                .collect(Collectors.toList());
        if (groupUnits.isEmpty()) {
            return;
        }
        List<String> groupLabels = groupUnits.stream()
                .map(SysOrgUnit::getName)
                .filter(StringUtils::hasText)
                .distinct()
                .collect(Collectors.toList());
        List<String> groupKeys = groupUnits.stream()
                .map(SysOrgUnit::getUnitId)
                .filter(StringUtils::hasText)
                .distinct()
                .collect(Collectors.toList());
        vo.setGroupIds(groupLabels);
        vo.setGroupKeys(groupKeys);
        vo.setGroupId(groupLabels.isEmpty() ? null : groupLabels.get(0));
        if (!StringUtils.hasText(vo.getDepartmentName()) || "未知部门".equals(vo.getDepartmentName())) {
            SysOrgUnit groupUnit = groupUnits.get(0);
            if (groupUnit != null && StringUtils.hasText(groupUnit.getParentId())) {
                SysOrgUnit parent = this.getById(groupUnit.getParentId());
                if (parent != null) {
                    vo.setDepartmentName(parent.getName());
                }
            }
        }
    }

    private List<UserRemoteDTO> fetchMentorsFromUserService(UserSearchDTO searchDTO) {
        Result result = userFeignClient.searchUsersByConditions(searchDTO);
        if (result == null || result.getCode() != 200) {
            log.error("用户服务返回异常: {}", result != null ? result.getMessage() : "无响应");
            throw new RuntimeException("获取用户身份信息失败");
        }
        return objectMapper.convertValue(
                result.getData(),
                new TypeReference<List<UserRemoteDTO>>() {}
        );
    }

    @Override
    public List<UserRemoteDTO> searchStudentsByOrgId(String orgUnitId, String keyword) {
        SysOrgUnit orgUnit = this.getById(orgUnitId);
        if (orgUnit == null) {
            throw new RuntimeException("组织机构不存在");
        }

        List<String> userIdsInOrg = sysUserOrgMapper.selectUserIdsByOrgId(orgUnitId);
        if (CollectionUtils.isEmpty(userIdsInOrg)) {
            return new ArrayList<>();
        }

        UserSearchDTO searchDTO = new UserSearchDTO();
        searchDTO.setRoleCode("STUDENT"); // 指定查学生
        searchDTO.setUserIds(userIdsInOrg);
        searchDTO.setKeyword(keyword); 

        return fetchMentorsFromUserService(searchDTO);
    }

    @Override
    public List<UserRemoteDTO> searchAllStudents(String keyword) {
        UserSearchDTO searchDTO = new UserSearchDTO();
        searchDTO.setRoleCode("STUDENT");
        searchDTO.setKeyword(keyword); 

        return fetchMentorsFromUserService(searchDTO);
    }

    @Override
    public com.alibaba.nacos.api.model.v2.Result getStudentById(String studentId) {
        return userFeignClient.getStudentById(studentId);
    }

    /**
     * 递归收集一个组织节点及其所有子孙节点的 ID
     * 例如：org_dcs → [org_dcs, group_a1, group_b1]
     */
    private List<String> collectAllDescendantOrgIds(List<String> rootOrgIds) {
        List<String> allOrgIds = new ArrayList<>(rootOrgIds);
        java.util.Queue<String> queue = new java.util.LinkedList<>(rootOrgIds);
        while (!queue.isEmpty()) {
            String currentId = queue.poll();
            List<String> childIds = sysOrgUnitMapper.selectChildOrgIds(currentId);
            if (childIds != null && !childIds.isEmpty()) {
                allOrgIds.addAll(childIds);
                queue.addAll(childIds);
            }
        }
        return allOrgIds.stream().distinct().collect(Collectors.toList());
    }

    @Override
    public Object searchMemberInMyDept(String coordinatorId, String targetUserId) {
        // 1. 查询 Coordinator 直接所属的组织 ID，再递归展开所有子组织
        List<String> coordinatorDirectOrgIds = sysUserOrgMapper.selectOrgIdsByUserId(coordinatorId);
        if (coordinatorDirectOrgIds == null || coordinatorDirectOrgIds.isEmpty()) {
            return null;
        }
        List<String> allOrgIdsInScope = collectAllDescendantOrgIds(coordinatorDirectOrgIds);

        // 2. 查询目标用户所属的所有组织 ID
        List<String> targetOrgIds = sysUserOrgMapper.selectOrgIdsByUserId(targetUserId);
        if (targetOrgIds == null || targetOrgIds.isEmpty()) {
            return null;
        }

        // 3. 判断目标用户是否在 Coordinator 的管辖范围内（含子组织）
        boolean inScope = targetOrgIds.stream().anyMatch(allOrgIdsInScope::contains);
        if (!inScope) {
            return null;
        }

        // 4. 通过 Feign 从 User-Service 获取目标用户信息并返回
        com.alibaba.nacos.api.model.v2.Result result = userFeignClient.getUserById(targetUserId);
        if (result != null && result.getCode() == 200) {
            return result.getData();
        }
        return null;
    }

    @Override
    public List<MentorVO> searchMentorsInMyDept(String coordinatorId, String keyword) {
        List<String> coordinatorDirectOrgIds = sysUserOrgMapper.selectOrgIdsByUserId(coordinatorId);
        if (CollectionUtils.isEmpty(coordinatorDirectOrgIds)) {
            return new ArrayList<>();
        }
        List<String> allUserIdsInDept = collectUserIdsInOrgScope(coordinatorDirectOrgIds);
        if (CollectionUtils.isEmpty(allUserIdsInDept)) {
            return new ArrayList<>();
        }

        UserSearchDTO searchDTO = new UserSearchDTO();
        searchDTO.setRoleCode("MENTOR");
        searchDTO.setUserIds(allUserIdsInDept);
        searchDTO.setKeyword(keyword);

        SysOrgUnit firstOrg = this.getById(coordinatorDirectOrgIds.get(0));
        String deptName = firstOrg != null ? firstOrg.getName() : "";
        return executeMentorSearch(searchDTO, deptName);
    }

    @Override
    public List<UserRemoteDTO> searchStudentsInMyDept(String coordinatorId, String keyword) {
        List<String> coordinatorDirectOrgIds = sysUserOrgMapper.selectOrgIdsByUserId(coordinatorId);
        if (CollectionUtils.isEmpty(coordinatorDirectOrgIds)) {
            return new ArrayList<>();
        }
        List<String> allUserIdsInDept = collectUserIdsInOrgScope(coordinatorDirectOrgIds);
        if (CollectionUtils.isEmpty(allUserIdsInDept)) {
            return new ArrayList<>();
        }

        UserSearchDTO searchDTO = new UserSearchDTO();
        searchDTO.setRoleCode("STUDENT");
        searchDTO.setUserIds(allUserIdsInDept);
        searchDTO.setKeyword(keyword);
        return fetchMentorsFromUserService(searchDTO);
    }

    @Override
    public CoordinatorScopeSearchVO searchInMyScope(String coordinatorId, String keyword, String roleType) {
        CoordinatorScopeSearchVO result = new CoordinatorScopeSearchVO();
        String normalizedRole = normalizeScopeRoleType(roleType);
        if (!StringUtils.hasText(normalizedRole)) {
            result.setMentors(searchMentorsInMyDept(coordinatorId, keyword));
            result.setStudents(searchStudentsInMyDept(coordinatorId, keyword));
            result.setFacultyConsultants(searchFacultyConsultantsInMyFaculty(coordinatorId, keyword));
            return result;
        }
        switch (normalizedRole) {
            case "MENTOR" -> result.setMentors(searchMentorsInMyDept(coordinatorId, keyword));
            case "STUDENT" -> result.setStudents(searchStudentsInMyDept(coordinatorId, keyword));
            case "FACULTY_CONSULTANT" ->
                    result.setFacultyConsultants(searchFacultyConsultantsInMyFaculty(coordinatorId, keyword));
            default -> throw new IllegalArgumentException(
                    "roleType 无效，可选：MENTOR、STUDENT、FACULTY_CONSULTANT（或 FC）");
        }
        return result;
    }

    private List<String> collectUserIdsInOrgScope(List<String> rootOrgIds) {
        List<String> allOrgIdsInScope = collectAllDescendantOrgIds(rootOrgIds);
        return allOrgIdsInScope.stream()
                .flatMap(orgId -> sysUserOrgMapper.selectUserIdsByOrgId(orgId).stream())
                .distinct()
                .collect(Collectors.toList());
    }

    private String normalizeScopeRoleType(String roleType) {
        if (!StringUtils.hasText(roleType)) {
            return "";
        }
        String rt = roleType.trim().toUpperCase();
        if ("FC".equals(rt)) {
            return "FACULTY_CONSULTANT";
        }
        return rt;
    }

    @Override
    public List<FacultyConsultantVO> searchFacultyConsultantsInMyFaculty(String coordinatorId, String keyword) {
        List<String> facultyOrgIds = resolveFacultyOrgIdsForCoordinator(coordinatorId);
        if (CollectionUtils.isEmpty(facultyOrgIds)) {
            return new ArrayList<>();
        }

        Map<String, String> facultyNameMap = this.listByIds(facultyOrgIds).stream()
                .collect(Collectors.toMap(SysOrgUnit::getUnitId, SysOrgUnit::getName, (a, b) -> a));

        Set<String> candidateUserIds = new LinkedHashSet<>();
        for (String facultyOrgId : facultyOrgIds) {
            List<String> bound = sysUserOrgMapper.selectUserIdsByOrgId(facultyOrgId);
            if (bound != null) {
                candidateUserIds.addAll(bound);
            }
        }

        UserSearchDTO searchDTO = new UserSearchDTO();
        searchDTO.setRoleCode("FACULTY_CONSULTANT");
        searchDTO.setKeyword(keyword);
        if (!candidateUserIds.isEmpty()) {
            searchDTO.setUserIds(new ArrayList<>(candidateUserIds));
        }

        List<UserRemoteDTO> consultants = fetchUsersFromUserService(searchDTO);
        if (CollectionUtils.isEmpty(consultants)) {
            return new ArrayList<>();
        }

        return consultants.stream()
                .filter(u -> consultantBoundToFaculties(u.getId(), facultyOrgIds))
                .map(u -> toFacultyConsultantVO(u, facultyOrgIds, facultyNameMap))
                .collect(Collectors.toList());
    }

    /**
     * 从 Coordinator 直接挂载的组织节点向上解析所属学院（FACULTY）ID。
     */
    private List<String> resolveFacultyOrgIdsForCoordinator(String coordinatorId) {
        List<String> directOrgIds = sysUserOrgMapper.selectOrgIdsByUserId(coordinatorId);
        if (CollectionUtils.isEmpty(directOrgIds)) {
            return List.of();
        }
        Set<String> facultyIds = new LinkedHashSet<>();
        for (String orgId : directOrgIds) {
            String facultyOrgId = resolveFacultyOrgId(orgId);
            if (StringUtils.hasText(facultyOrgId)) {
                facultyIds.add(facultyOrgId);
            }
        }
        return new ArrayList<>(facultyIds);
    }

    private String resolveFacultyOrgId(String orgUnitId) {
        if (!StringUtils.hasText(orgUnitId)) {
            return null;
        }
        SysOrgUnit current = this.getById(orgUnitId.trim());
        int guard = 0;
        while (current != null && guard++ < 20) {
            if (McpGroupOrgService.TYPE_FACULTY.equalsIgnoreCase(current.getUnitType())) {
                return current.getUnitId();
            }
            if (!StringUtils.hasText(current.getParentId())) {
                break;
            }
            current = this.getById(current.getParentId());
        }
        return null;
    }

    private boolean consultantBoundToFaculties(String consultantId, List<String> facultyOrgIds) {
        if (!StringUtils.hasText(consultantId) || CollectionUtils.isEmpty(facultyOrgIds)) {
            return false;
        }
        List<String> consultantOrgIds = sysUserOrgMapper.selectOrgIdsByUserId(consultantId.trim());
        if (CollectionUtils.isEmpty(consultantOrgIds)) {
            return false;
        }
        return consultantOrgIds.stream().anyMatch(facultyOrgIds::contains);
    }

    private FacultyConsultantVO toFacultyConsultantVO(
            UserRemoteDTO user, List<String> facultyOrgIds, Map<String, String> facultyNameMap) {
        FacultyConsultantVO vo = new FacultyConsultantVO();
        vo.setConsultantId(user.getId());
        vo.setConsultantName(user.getRealName());
        vo.setEmail(user.getEmail());

        List<String> consultantOrgIds = sysUserOrgMapper.selectOrgIdsByUserId(user.getId());
        String matchedFacultyId = null;
        if (consultantOrgIds != null) {
            matchedFacultyId = consultantOrgIds.stream()
                    .filter(facultyOrgIds::contains)
                    .findFirst()
                    .orElse(null);
        }
        if (StringUtils.hasText(matchedFacultyId)) {
            vo.setFacultyOrgId(matchedFacultyId);
            vo.setFacultyName(facultyNameMap.getOrDefault(matchedFacultyId, matchedFacultyId));
        } else if (!facultyOrgIds.isEmpty()) {
            vo.setFacultyOrgId(facultyOrgIds.get(0));
            vo.setFacultyName(facultyNameMap.getOrDefault(facultyOrgIds.get(0), facultyOrgIds.get(0)));
        }
        return vo;
    }

    private List<UserRemoteDTO> fetchUsersFromUserService(UserSearchDTO searchDTO) {
        Result result = userFeignClient.searchUsersByConditions(searchDTO);
        if (result == null || result.getCode() != 200) {
            log.error("用户服务返回异常: {}", result != null ? result.getMessage() : "无响应");
            throw new RuntimeException("获取用户身份信息失败");
        }
        return objectMapper.convertValue(
                result.getData(),
                new TypeReference<List<UserRemoteDTO>>() {});
    }

    @Override
    public StudentProfileVO getStudentProfileForCaller(
            String callerId, boolean isFacultyConsultant, String studentId) {
        if (!StringUtils.hasText(callerId) || !StringUtils.hasText(studentId)) {
            throw new RuntimeException("callerId and studentId are required");
        }
        String sid = studentId.trim();
        assertCallerCanAccessStudent(callerId.trim(), isFacultyConsultant, sid);
        Map<String, Object> user = fetchUserMapById(sid);
        if (user == null) {
            throw new RuntimeException("用户不存在");
        }
        StudentExtRemoteDTO ext = fetchStudentExt(sid);
        return toStudentProfile(user, ext);
    }

    @Override
    public List<StudentProfileVO> searchStudentProfilesForCaller(
            String callerId, boolean isFacultyConsultant, String keyword) {
        if (!StringUtils.hasText(callerId)) {
            throw new RuntimeException("未获取到当前登录用户ID");
        }
        List<UserRemoteDTO> students = isFacultyConsultant
                ? searchStudentsForFacultyConsultant(callerId.trim(), keyword)
                : searchStudentsInMyDept(callerId.trim(), keyword);
        if (CollectionUtils.isEmpty(students)) {
            return List.of();
        }
        List<String> studentIds = students.stream()
                .map(UserRemoteDTO::getId)
                .filter(StringUtils::hasText)
                .distinct()
                .collect(Collectors.toList());
        Map<String, StudentExtRemoteDTO> extMap = fetchStudentExtMap(studentIds);
        return students.stream()
                .map(u -> toStudentProfile(userRemoteToMap(u), extMap.get(u.getId())))
                .collect(Collectors.toList());
    }

    private List<UserRemoteDTO> searchStudentsForFacultyConsultant(String consultantId, String keyword) {
        List<String> facultyIds = sysUserOrgService.listFacultyOrgIdsForUser(consultantId);
        if (CollectionUtils.isEmpty(facultyIds)) {
            return List.of();
        }
        List<String> allUserIds = collectUserIdsInOrgScope(facultyIds);
        if (CollectionUtils.isEmpty(allUserIds)) {
            return List.of();
        }
        UserSearchDTO searchDTO = new UserSearchDTO();
        searchDTO.setRoleCode("STUDENT");
        searchDTO.setUserIds(allUserIds);
        searchDTO.setKeyword(keyword);
        return fetchMentorsFromUserService(searchDTO);
    }

    private void assertCallerCanAccessStudent(String callerId, boolean isFacultyConsultant, String studentId) {
        if (isFacultyConsultant) {
            if (!facultyConsultantCanAccessStudent(callerId, studentId)) {
                throw new RuntimeException("权限不足：该学生不在您的学院管理范围内");
            }
            return;
        }
        Object member = searchMemberInMyDept(callerId, studentId);
        if (member == null) {
            throw new RuntimeException("该用户不存在或不在您的部门管理范围内");
        }
    }

    private boolean facultyConsultantCanAccessStudent(String consultantId, String studentId) {
        try {
            com.bnbu.organizational.DTO.Result res =
                    mentoringAccessClient.facultyConsultantCanAccessStudent(consultantId, studentId);
            return res != null && res.getCode() == 200 && isFeignBooleanTrue(res.getData());
        } catch (Exception e) {
            log.warn("FC access check failed: {}", e.getMessage());
            return false;
        }
    }

    private static boolean isFeignBooleanTrue(Object data) {
        if (Boolean.TRUE.equals(data)) {
            return true;
        }
        return data instanceof String s && "true".equalsIgnoreCase(s.trim());
    }

    @SuppressWarnings("unchecked")
    private Map<String, Object> fetchUserMapById(String userId) {
        Result result = userFeignClient.getUserById(userId);
        if (result == null || result.getCode() != 200 || result.getData() == null) {
            return null;
        }
        return objectMapper.convertValue(result.getData(), new TypeReference<Map<String, Object>>() {});
    }

    private StudentExtRemoteDTO fetchStudentExt(String studentId) {
        Map<String, StudentExtRemoteDTO> map = fetchStudentExtMap(List.of(studentId));
        return map.get(studentId);
    }

    private Map<String, StudentExtRemoteDTO> fetchStudentExtMap(List<String> studentIds) {
        if (CollectionUtils.isEmpty(studentIds)) {
            return Map.of();
        }
        try {
            com.bnbu.organizational.DTO.Result res = mentoringAccessClient.batchGetStudentExt(studentIds);
            if (res == null || res.getCode() != 200 || res.getData() == null) {
                return Map.of();
            }
            List<StudentExtRemoteDTO> list = objectMapper.convertValue(
                    res.getData(), new TypeReference<List<StudentExtRemoteDTO>>() {});
            Map<String, StudentExtRemoteDTO> map = new java.util.HashMap<>();
            for (StudentExtRemoteDTO ext : list) {
                if (ext != null && StringUtils.hasText(ext.getStudentId())) {
                    map.put(ext.getStudentId().trim(), ext);
                }
            }
            return map;
        } catch (Exception e) {
            log.warn("Failed to fetch student ext batch: {}", e.getMessage());
            return Map.of();
        }
    }

    private StudentProfileVO toStudentProfile(Map<String, Object> user, StudentExtRemoteDTO ext) {
        StudentProfileVO vo = new StudentProfileVO();
        vo.setStudentId(stringVal(user.get("id")));
        vo.setUsername(stringVal(user.get("username")));
        String realName = stringVal(user.get("realName"));
        vo.setName(StringUtils.hasText(realName) ? realName : vo.getUsername());
        vo.setEmail(stringVal(user.get("email")));
        vo.setPhone(stringVal(user.get("phone")));
        if (ext != null) {
            vo.setMajor(ext.getMajorId());
            vo.setStatus(ext.getStatus());
            vo.setGroupId(ext.getGroupId());
            vo.setGroupKey(ext.getGroupKey());
        } else {
            vo.setMajor(null);
            vo.setStatus(accountStatusLabel(user.get("status")));
        }
        return vo;
    }

    private static Map<String, Object> userRemoteToMap(UserRemoteDTO u) {
        Map<String, Object> map = new java.util.HashMap<>();
        map.put("id", u.getId());
        map.put("username", u.getUsername());
        map.put("realName", u.getRealName());
        map.put("email", u.getEmail());
        map.put("phone", u.getPhone());
        return map;
    }

    private static String stringVal(Object v) {
        return v == null ? null : String.valueOf(v);
    }

    private static String accountStatusLabel(Object status) {
        if (status == null) {
            return null;
        }
        if (status instanceof Number n) {
            return n.intValue() == 1 ? "ACTIVE" : "DISABLED";
        }
        return String.valueOf(status);
    }

}