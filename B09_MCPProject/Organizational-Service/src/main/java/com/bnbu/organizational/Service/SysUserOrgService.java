package com.bnbu.organizational.Service;

import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import com.bnbu.organizational.Entity.SysOrgUnit;
import com.bnbu.organizational.Entity.SysUserOrg;
import com.bnbu.organizational.Mapper.SysOrgUnitMapper;
import com.bnbu.organizational.Mapper.SysUserOrgMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class SysUserOrgService {

    private final SysUserOrgMapper sysUserOrgMapper;
    private final SysOrgUnitMapper sysOrgUnitMapper;

    @Transactional
    public void bindUserToOrg(String userId, String orgUnitIdOrName, boolean primary) {
        if (!StringUtils.hasText(userId) || !StringUtils.hasText(orgUnitIdOrName)) {
            throw new RuntimeException("userId and orgUnitIdOrName are required");
        }
        String orgUnitId = resolveOrgUnitId(orgUnitIdOrName.trim());
        if (orgUnitId == null) {
            throw new RuntimeException("Organization unit not found: " + orgUnitIdOrName);
        }

        SysUserOrg existing = sysUserOrgMapper.selectOne(new QueryWrapper<SysUserOrg>()
                .eq("user_id", userId)
                .eq("org_unit_id", orgUnitId));
        if (existing == null) {
            SysUserOrg link = new SysUserOrg();
            link.setUserId(userId);
            link.setOrgUnitId(orgUnitId);
            link.setIsPrimary(primary ? 1 : 0);
            link.setCreateTime(LocalDateTime.now());
            sysUserOrgMapper.insert(link);
        } else if (primary && (existing.getIsPrimary() == null || existing.getIsPrimary() == 0)) {
            existing.setIsPrimary(1);
            sysUserOrgMapper.update(existing, new QueryWrapper<SysUserOrg>()
                    .eq("user_id", userId)
                    .eq("org_unit_id", orgUnitId));
        }
    }

    public String resolveOrgUnitId(String orgUnitIdOrName) {
        SysOrgUnit byId = sysOrgUnitMapper.selectById(orgUnitIdOrName);
        if (byId != null) {
            return byId.getUnitId();
        }
        List<SysOrgUnit> byName = sysOrgUnitMapper.selectList(new QueryWrapper<SysOrgUnit>()
                .eq("name", orgUnitIdOrName));
        if (byName != null && !byName.isEmpty()) {
            return byName.get(0).getUnitId();
        }
        return null;
    }

    public boolean isUserInOrgScope(String scopeUserId, String targetUserId) {
        if (scopeUserId == null || targetUserId == null) {
            return false;
        }
        if (scopeUserId.equals(targetUserId)) {
            return true;
        }
        List<String> scopeOrgIds = collectDescendantOrgIds(sysUserOrgMapper.selectOrgIdsByUserId(scopeUserId));
        if (scopeOrgIds.isEmpty()) {
            return false;
        }
        List<String> targetOrgIds = sysUserOrgMapper.selectOrgIdsByUserId(targetUserId);
        if (targetOrgIds == null || targetOrgIds.isEmpty()) {
            return false;
        }
        return targetOrgIds.stream().anyMatch(scopeOrgIds::contains);
    }

    /**
     * 判断组织节点是否在用户管辖范围内（含子孙节点）。
     */
    public boolean isOrgInUserScope(String scopeUserId, String orgUnitId) {
        if (!StringUtils.hasText(scopeUserId) || !StringUtils.hasText(orgUnitId)) {
            return false;
        }
        List<String> scopeOrgIds = collectDescendantOrgIds(sysUserOrgMapper.selectOrgIdsByUserId(scopeUserId));
        return scopeOrgIds.contains(orgUnitId.trim());
    }

    /**
     * 解析用户绑定的学院（FACULTY）组织 ID 列表（含从系/专业向上解析）。
     */
    public List<String> listFacultyOrgIdsForUser(String userId) {
        if (!StringUtils.hasText(userId)) {
            return List.of();
        }
        List<String> directOrgIds = sysUserOrgMapper.selectOrgIdsByUserId(userId.trim());
        if (directOrgIds == null || directOrgIds.isEmpty()) {
            return List.of();
        }
        Set<String> facultyIds = new LinkedHashSet<>();
        for (String orgId : directOrgIds) {
            String facultyId = resolveFacultyOrgId(orgId);
            if (StringUtils.hasText(facultyId)) {
                facultyIds.add(facultyId);
            }
        }
        return new ArrayList<>(facultyIds);
    }

    private String resolveFacultyOrgId(String orgUnitId) {
        if (!StringUtils.hasText(orgUnitId)) {
            return null;
        }
        SysOrgUnit current = sysOrgUnitMapper.selectById(orgUnitId.trim());
        int guard = 0;
        while (current != null && guard++ < 20) {
            if (McpGroupOrgService.TYPE_FACULTY.equalsIgnoreCase(current.getUnitType())) {
                return current.getUnitId();
            }
            if (!StringUtils.hasText(current.getParentId())) {
                break;
            }
            current = sysOrgUnitMapper.selectById(current.getParentId());
        }
        return null;
    }

    public boolean isGroupFacultyInConsultantScope(String consultantId, String facultyOrgId) {
        if (!StringUtils.hasText(facultyOrgId)) {
            return false;
        }
        List<String> consultantOrgIds = collectDescendantOrgIds(sysUserOrgMapper.selectOrgIdsByUserId(consultantId));
        if (consultantOrgIds.isEmpty()) {
            return false;
        }
        return consultantOrgIds.contains(facultyOrgId);
    }

    private List<String> collectDescendantOrgIds(List<String> rootOrgIds) {
        if (rootOrgIds == null || rootOrgIds.isEmpty()) {
            return List.of();
        }
        List<String> all = new ArrayList<>(rootOrgIds);
        java.util.Queue<String> queue = new java.util.LinkedList<>(rootOrgIds);
        while (!queue.isEmpty()) {
            String current = queue.poll();
            List<String> children = sysOrgUnitMapper.selectChildOrgIds(current);
            if (children != null) {
                for (String child : children) {
                    if (!all.contains(child)) {
                        all.add(child);
                        queue.add(child);
                    }
                }
            }
        }
        return all.stream().distinct().collect(Collectors.toList());
    }
}
