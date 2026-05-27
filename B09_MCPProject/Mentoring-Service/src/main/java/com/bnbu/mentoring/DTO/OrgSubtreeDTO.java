package com.bnbu.mentoring.DTO;

import lombok.Data;

import java.util.List;

@Data
public class OrgSubtreeDTO {
    private String rootOrgId;
    private String rootName;
    private String rootType;
    private List<String> orgUnitIds;
}
