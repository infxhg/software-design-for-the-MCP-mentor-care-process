package com.bnbu.user.Entity;

import com.baomidou.mybatisplus.annotation.FieldFill;
import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;
import java.time.LocalDateTime;

@Data
@TableName("sys_user_org")
public class UserOrg {
    private String userId;
    private String orgUnitId;
    private Integer isPrimary; // 0否 1是
    @TableField(fill = FieldFill.INSERT)
    private LocalDateTime createTime;
}