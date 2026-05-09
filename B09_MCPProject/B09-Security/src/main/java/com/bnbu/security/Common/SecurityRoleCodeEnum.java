package com.bnbu.security.Common;

public enum SecurityRoleCodeEnum {
    ADMIN("ADMIN", "系统管理员"),
    FACULTY_CONSULTANT("FACULTY_CONSULTANT", "院级顾问"),
    COORDINATOR("COORDINATOR", "协调员"),
    MENTOR("MENTOR", "导师"),
    STUDENT("STUDENT", "学生");

    private final String code;
    private final String desc;

    SecurityRoleCodeEnum(String code, String desc) {
        this.code = code;
        this.desc = desc;
    }

    public String getCode() { return code; }
    public String getDesc() { return desc; }
}
