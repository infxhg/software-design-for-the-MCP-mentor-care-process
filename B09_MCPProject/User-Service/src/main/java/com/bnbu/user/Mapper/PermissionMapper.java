package com.bnbu.user.Mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.bnbu.user.Entity.Permission;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Select;
import java.util.List;

@Mapper
public interface PermissionMapper extends BaseMapper<Permission> {

    /**
     * 核心：根据用户ID查询其拥有的所有权限标识（用于装载到 Spring Security 或 Sa-Token）
     * 联查逻辑：User -> UserRole -> RolePermission -> Permission
     */
    @Select("SELECT DISTINCT p.perm_code FROM sys_permission p " +
            "INNER JOIN sys_role_permission rp ON p.id = rp.permission_id " +
            "INNER JOIN sys_user_role ur ON rp.role_id = ur.role_id " +
            "INNER JOIN sys_role r ON ur.role_id = r.id " +
            "WHERE ur.user_id = #{userId} " +
            "AND p.status = 1 AND p.is_deleted = 0 " +
            "AND r.status = 1 AND r.is_deleted = 0")
    List<String> selectPermCodesByUserId(@Param("userId") String userId);

    /**
     * 根据角色ID获取权限列表（用于前端角色管理界面的数据回显）
     */
    @Select("SELECT p.* FROM sys_permission p " +
            "INNER JOIN sys_role_permission rp ON p.id = rp.permission_id " +
            "WHERE rp.role_id = #{roleId} AND p.is_deleted = 0")
    List<Permission> selectPermissionsByRoleId(@Param("roleId") String roleId);
}
