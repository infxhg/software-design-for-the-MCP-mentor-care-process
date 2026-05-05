package com.bnbu.user.Mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.bnbu.user.Entity.User;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Select;

@Mapper
public interface UserMapper extends BaseMapper<User> {

    /**
     * 根据登录账号查询用户（用于 Security 登录认证）
     */
    @Select("SELECT * FROM sys_user WHERE username = #{username} AND is_deleted = 0")
    User selectByUsername(@Param("username") String username);
}