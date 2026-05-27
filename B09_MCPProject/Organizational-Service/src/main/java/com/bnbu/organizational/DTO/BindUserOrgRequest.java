package com.bnbu.organizational.DTO;

import lombok.Data;

@Data
public class BindUserOrgRequest {
    private String userId;
    /** 组织 unitId，或系/专业名称（将尝试按名称解析） */
    private String orgUnitIdOrName;
    private Boolean primary;
}
