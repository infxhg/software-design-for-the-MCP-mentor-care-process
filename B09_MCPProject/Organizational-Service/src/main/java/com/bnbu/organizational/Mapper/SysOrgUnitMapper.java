package com.bnbu.organizational.Mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.bnbu.organizational.Entity.SysOrgUnit;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Select;

import java.util.List;

@Mapper
public interface SysOrgUnitMapper extends BaseMapper<SysOrgUnit> {

    /**
     * 查询某个组织节点的所有直接子节点 ID
     */
    @Select("SELECT id FROM sys_org_unit WHERE parent_id = #{parentId}")
    List<String> selectChildOrgIds(@Param("parentId") String parentId);
}
