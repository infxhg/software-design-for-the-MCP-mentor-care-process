package com.bnbu.user.Entity;

import com.baomidou.mybatisplus.annotation.*;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@TableName("sys_permission")
public class Permission {
    @TableId(type = IdType.ASSIGN_ID)
    private String id;
    private String permCode;   // 如 user:list, appointment:create
    private String permName;   // 如 用户列表, 创建预约
    private String type;       // MENU, BUTTON, API
    private Integer status;
    @TableLogic
    private Integer isDeleted;
    @TableField(fill = FieldFill.INSERT) private LocalDateTime createTime;
}
