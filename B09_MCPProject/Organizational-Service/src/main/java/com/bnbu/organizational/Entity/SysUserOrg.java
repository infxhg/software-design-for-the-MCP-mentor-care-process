package com.bnbu.organizational.Entity;

import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;
import java.time.LocalDateTime;

/**
 * 用户组织绑定表
 */
@Data
@TableName("sys_user_org")
public class SysUserOrg {

    // MyBatis-Plus 默认不支持复合主键的 @TableId，
    // 对于关联表，通常作为普通字段映射即可，复杂的查询通过 Mapper XML 解决。
    private String userId;

    private String orgUnitId;

    /**
     * 是否主归属: 0否 1是
     */
    private Integer isPrimary;

    private LocalDateTime createTime;
}