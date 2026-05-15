package com.bnbu.organizational.Mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.bnbu.organizational.Entity.SysUserOrg;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Select;

import java.util.List;

@Mapper
public interface SysUserOrgMapper extends BaseMapper<SysUserOrg> {

    // 预留一个自定义方法：根据组织ID查询该组织下的所有用户ID
    // 这个在 "Search Mentor Info" 时可能会用到
    @Select("SELECT user_id FROM sys_user_org WHERE org_unit_id = #{orgUnitId}")
    List<String> selectUserIdsByOrgId(@Param("orgUnitId") String orgUnitId);

}