package com.bnbu.mentoring.DTO;

import lombok.Data;

/**
 * 供 Organizational-Service 等内部 Feign 读取；majorId 由 group_key 在组织树解析，非 ext 表列。
 */
@Data
public class StudentExtRemoteView {
    private String studentId;
    private String majorId;
    private String status;
    private String groupId;
    private String groupKey;
}
