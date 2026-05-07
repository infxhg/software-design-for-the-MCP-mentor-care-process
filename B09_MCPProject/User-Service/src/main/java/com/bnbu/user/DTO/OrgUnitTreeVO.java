package com.bnbu.user.DTO;

import lombok.Data;

import java.util.ArrayList;
import java.util.List;

import lombok.Data;
import java.util.ArrayList;
import java.util.List;

@Data
public class OrgUnitTreeVO {
    private String id;
    private String name;
    private String type; // FACULTY, DEPARTMENT, MAJOR, MCP_GROUP
    private String parentId;

    // 关键字段：存放下级组织
    private List<OrgUnitTreeVO> children = new ArrayList<>();
}
