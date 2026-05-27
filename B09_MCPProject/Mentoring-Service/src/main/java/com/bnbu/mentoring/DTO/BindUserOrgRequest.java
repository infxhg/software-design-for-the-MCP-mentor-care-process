package com.bnbu.mentoring.DTO;

import lombok.Data;

@Data
public class BindUserOrgRequest {
    private String userId;
    private String orgUnitIdOrName;
    private Boolean primary;
}
