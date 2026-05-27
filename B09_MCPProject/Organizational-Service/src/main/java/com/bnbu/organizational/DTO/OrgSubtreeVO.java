package com.bnbu.organizational.DTO;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * 组织子树：根节点及其所有下属单位 ID（含根）。
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class OrgSubtreeVO {
    private String rootOrgId;
    private String rootName;
    private String rootType;
    private List<String> orgUnitIds;
}
