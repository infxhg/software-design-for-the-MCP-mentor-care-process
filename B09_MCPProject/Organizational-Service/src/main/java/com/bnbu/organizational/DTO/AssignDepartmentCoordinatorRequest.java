package com.bnbu.organizational.DTO;

import lombok.Data;

@Data
public class AssignDepartmentCoordinatorRequest {
    /** 必填：要绑定的 Coordinator 用户 ID */
    private String coordinatorUserId;
    /** 可选：用于 ensure-user 时补充邮箱 */
    private String email;
    /** 可选：用于 ensure-user 时补充姓名 */
    private String realName;
}

