package com.bnbu.user.Mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.bnbu.user.Entity.OrgUnit;
import com.bnbu.user.Entity.User;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Select;

import java.util.List;


@Mapper
public interface UserMapper extends BaseMapper<User> {

    /**
     * 根据登录账号查询用户（用于 Security 登录认证）
     */
    @Select("SELECT * FROM sys_user WHERE username = #{username} AND is_deleted = 0")
    User selectByUsername(@Param("username") String username);

    /**
     * 根据用户ID查询其拥有的所有角色编码
     */
    @Select("SELECT r.role_code " +
            "FROM sys_role r " +
            "LEFT JOIN sys_user_role ur ON r.id = ur.role_id " +
            "WHERE ur.user_id = #{userId}")
    List<String> getRoleCodesByUserId(@Param("userId") String userId);


    /**
     * 根据用户ID查询其拥有的所有权限编码
     */
    @Select("SELECT DISTINCT p.perm_code"+
            " FROM sys_permission p"+
            " LEFT JOIN sys_role_permission rp ON p.id = rp.permission_id" +
            " LEFT JOIN sys_user_role ur ON ur.role_id = rp.role_id"+
            " WHERE ur.user_id = #{userId}"
    )
    List<String> getPermissionsByUserId(@Param("userId") String userId );

    @Select("SELECT o.* FROM sys_org_unit o " +
            "INNER JOIN sys_user_org uo ON o.id = uo.org_unit_id " +
            "WHERE uo.user_id = #{userId}")
    List<OrgUnit> getOrgUnitsByUserId(@Param("userId") String userId);
}