package com.bnbu.user.Mapper;



import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.bnbu.user.Entity.OrgUnit;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Select;
import java.util.List;

@Mapper
public interface OrgUnitMapper extends BaseMapper<OrgUnit> {

    /**
     * 根据用户ID查询其绑定的组织节点
     * （用于获取该用户是哪个学院、哪个系、或者哪个专业的）
     */
    @Select("SELECT o.* FROM sys_org_unit o " +
            "INNER JOIN sys_user_org uo ON o.id = uo.org_unit_id " +
            "WHERE uo.user_id = #{userId} AND o.status = 1 AND o.is_deleted = 0")
    List<OrgUnit> selectOrgUnitsByUserId(@Param("userId") String userId);

    /**
     * 数据权限穿透：根据父节点 path 获取所有子节点
     * （例如：传入 /100/，利用 LIKE 索引匹配查出该学院下所有系和专业）
     */
    @Select("SELECT * FROM sys_org_unit " +
            "WHERE path LIKE CONCAT(#{path}, '%') AND status = 1 AND is_deleted = 0")
    List<OrgUnit> selectChildNodesByPath(@Param("path") String path);

    /**
     * 获取全校所有节点（用于组装完整的组织架构树）
     * 按 sort_order 排序，保证前端渲染的顺序
     */
    @Select("SELECT * FROM sys_org_unit WHERE status = 1 AND is_deleted = 0 ORDER BY sort_order ASC")
    List<OrgUnit> selectAllActiveUnits();


}
