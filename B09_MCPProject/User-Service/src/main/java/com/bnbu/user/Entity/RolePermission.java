package com.bnbu.user.Entity;

import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

@Data
@TableName("sys_role_permission")
public class RolePermission {
    private String roleId;
    private String permissionId;
}