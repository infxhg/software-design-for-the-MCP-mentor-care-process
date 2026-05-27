package com.bnbu.organizational.DTO;

import lombok.Data;

/** Mentoring-Service mcp_student_ext 远程 DTO */
@Data
public class StudentExtRemoteDTO {
    private String studentId;
    private String majorId;
    private String status;
    private String groupId;
    private String groupKey;
}
