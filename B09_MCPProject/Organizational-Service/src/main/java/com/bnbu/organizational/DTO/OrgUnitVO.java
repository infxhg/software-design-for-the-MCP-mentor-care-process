package com.bnbu.organizational.DTO;

import lombok.Data;

import java.time.LocalDateTime;

@Data
public class OrgUnitVO {
    private String id;
    private String name;
    private String type;
    private String parentId;
    private String path;
    private Integer sortOrder;
    private LocalDateTime createTime;
}
