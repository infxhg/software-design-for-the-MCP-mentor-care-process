package com.bnbu.organizational.DTO;

import lombok.Data;

/**
 * Coordinator 范围内 Faculty Consultant 视图
 */
@Data
public class FacultyConsultantVO {
    private String consultantId;
    private String consultantName;
    private String email;
    /** 所属学院组织节点 ID */
    private String facultyOrgId;
    /** 学院名称 */
    private String facultyName;
}
