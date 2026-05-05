package com.bnbu.user.Entity;

import com.baomidou.mybatisplus.annotation.FieldFill;
import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableLogic;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;
import java.time.LocalDateTime;

@Data
@TableName("sys_user_role")
public class UserRole {
    private String userId;
    private String roleId;
    @TableField(fill = FieldFill.INSERT)
    private LocalDateTime createTime;
}