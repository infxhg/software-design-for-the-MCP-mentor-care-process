package com.bnbu.user.Mapper;



import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.bnbu.user.Entity.Role;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Select;
import java.util.List;

@Mapper
public interface RoleMapper extends BaseMapper<Role> {

    /**
     * 根据用户ID查询拥有的角色列表（包含数据范围规则）
     */
    @Select("SELECT r.* FROM sys_role r " +
            "INNER JOIN sys_user_role ur ON r.id = ur.role_id " +
            "WHERE ur.user_id = #{userId} AND r.status = 1 AND r.is_deleted = 0")
    List<Role> selectRolesByUserId(@Param("userId") String userId);
}
