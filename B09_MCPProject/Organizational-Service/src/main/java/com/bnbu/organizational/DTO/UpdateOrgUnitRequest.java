package com.bnbu.organizational.DTO;

import lombok.Data;

@Data
public class UpdateOrgUnitRequest {
    private String name;
    private Integer sortOrder;
}
