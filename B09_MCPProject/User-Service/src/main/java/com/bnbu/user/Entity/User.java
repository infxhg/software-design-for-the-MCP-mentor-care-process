package com.bnbu.user.Entity;

import com.baomidou.mybatisplus.annotation.*;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@TableName("sys_user")
public class User {
    @TableId(type = IdType.ASSIGN_UUID)
    private String id;
    private String username;
    private String passwordHash;
    private String realName;
    private String phone;
    private String email;
    private Integer status;
    @TableLogic
    private Integer isDeleted;
    @TableField(fill = FieldFill.INSERT) private LocalDateTime createTime;
    @TableField(fill = FieldFill.INSERT_UPDATE) private LocalDateTime updateTime;
}
