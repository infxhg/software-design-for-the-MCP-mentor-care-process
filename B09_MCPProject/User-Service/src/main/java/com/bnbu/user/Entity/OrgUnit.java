package com.bnbu.user.Entity;

import com.baomidou.mybatisplus.annotation.*;
import lombok.Data;
import java.time.LocalDateTime;

@Data
@TableName("sys_org_unit")
public class OrgUnit {
    @TableId(type = IdType.ASSIGN_ID)
    private String id;

    private String name;
    private String type;       // FACULTY, DEPARTMENT, MAJOR, MCP_GROUP
    private String parentId;   // 父节点ID（顶级节点为 null 或 ""）
    private String path;       // 层级路径，如 /F001/D002/M003（加速子树查询）
    private Integer sortOrder; // 同级排序
    private Integer status;    // 0停用 1启用
    @TableLogic
    private Integer isDeleted; // 逻辑删除

    @TableField(fill = FieldFill.INSERT)
    private LocalDateTime createTime;
    @TableField(fill = FieldFill.INSERT_UPDATE)
    private LocalDateTime updateTime;
}