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
import com.bnbu.organizational.OpenFeign.UserFeignClient;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.util.CollectionUtils;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class SysOrgUnitServiceImpl extends ServiceImpl<SysOrgUnitMapper, SysOrgUnit> implements SysOrgUnitService {

    private final SysUserOrgMapper sysUserOrgMapper;
    private final SysMentorInfoMapper sysMentorInfoMapper; // 新增：用于查询本地 office 信息
    private final UserFeignClient userFeignClient;
    private final ObjectMapper objectMapper; // 💡 新增：Spring Boot 自动注入的 JSON 转换神器

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
        // 全局搜索，不限制 userIds
        UserSearchDTO searchDTO = new UserSearchDTO();
        searchDTO.setRoleCode("MENTOR");
        searchDTO.setKeyword(keyword); 

        // 提取并返回
        return executeMentorSearchGlobal(searchDTO);
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
            vo.setDepartmentName(defaultDepartmentName); 
            vo.setOffice(officeMap.getOrDefault(u.getId(), "未分配"));
            return vo;
        }).collect(Collectors.toList());
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
            return vo;
        }).collect(Collectors.toList());
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

    @Override
    public Object searchMemberInMyDept(String coordinatorId, String targetUserId) {
        // 1. 查询当前 Coordinator 所属的所有组织 ID
        List<String> coordinatorOrgIds = sysUserOrgMapper.selectOrgIdsByUserId(coordinatorId);
        if (coordinatorOrgIds == null || coordinatorOrgIds.isEmpty()) {
            return null; // Coordinator 未绑定任何部门
        }

        // 2. 查询目标用户所属的所有组织 ID
        List<String> targetOrgIds = sysUserOrgMapper.selectOrgIdsByUserId(targetUserId);
        if (targetOrgIds == null || targetOrgIds.isEmpty()) {
            return null; // 目标用户不在任何组织中
        }

        // 3. 判断两者是否有共同的组织单元（部门范围校验）
        boolean inSameDept = targetOrgIds.stream().anyMatch(coordinatorOrgIds::contains);
        if (!inSameDept) {
            return null; // 目标用户不在 Coordinator 的部门范围内
        }

        // 4. 通过 Feign 从 User-Service 获取目标用户信息并返回
        com.alibaba.nacos.api.model.v2.Result result = userFeignClient.getStudentById(targetUserId);
        if (result != null && result.getCode() == 200) {
            return result.getData();
        }
        return null;
    }

    @Override
    public List<MentorVO> searchMentorsInMyDept(String coordinatorId, String keyword) {
        // 1. 查询 Coordinator 所属的所有组织 ID
        List<String> coordinatorOrgIds = sysUserOrgMapper.selectOrgIdsByUserId(coordinatorId);
        if (CollectionUtils.isEmpty(coordinatorOrgIds)) {
            return new ArrayList<>();
        }

        // 2. 对每个组织 ID，获取其下的所有用户 ID，合并去重
        List<String> allUserIdsInDept = coordinatorOrgIds.stream()
                .flatMap(orgId -> sysUserOrgMapper.selectUserIdsByOrgId(orgId).stream())
                .distinct()
                .collect(Collectors.toList());

        if (CollectionUtils.isEmpty(allUserIdsInDept)) {
            return new ArrayList<>();
        }

        // 3. 构造搜索条件：角色=MENTOR，用户范围=部门内所有用户，keyword 匹配姓名或邮箱
        UserSearchDTO searchDTO = new UserSearchDTO();
        searchDTO.setRoleCode("MENTOR");
        searchDTO.setUserIds(allUserIdsInDept);
        searchDTO.setKeyword(keyword);

        // 4. 复用已有的 executeMentorSearch 查询逻辑
        SysOrgUnit firstOrg = this.getById(coordinatorOrgIds.get(0));
        String deptName = firstOrg != null ? firstOrg.getName() : "";
        return executeMentorSearch(searchDTO, deptName);
    }

}