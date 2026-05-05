package com.bnbu.user.Entity;

import com.baomidou.mybatisplus.annotation.*;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@TableName("sys_role")
public class Role {
    @TableId(type = IdType.ASSIGN_ID)
    private String id;
    private String roleCode;   // 如 ADMIN, MENTOR, STUDENT
    private String roleName;   // 如 系统管理员, 导师, 学生
    private String dataScope;  // ALL, DEPT, MAJOR, MCP, SELF
    private Integer status;    // 0停用 1启用
    @TableLogic
    private Integer isDeleted;
    @TableField(fill = FieldFill.INSERT) private LocalDateTime createTime;
    @TableField(fill = FieldFill.INSERT_UPDATE) private LocalDateTime updateTime;
}
