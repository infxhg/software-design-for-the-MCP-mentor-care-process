package com.bnbu.mentoring.DTO;

import lombok.Data;

import java.util.List;

/**
 * 发送给 User-Service 的搜索请求体
 */
@Data
public class UserSearchRequestDTO {
    /** 角色标识，传 "STUDENT" */
    private String roleCode;
    /** 关键字（模糊匹配姓名/邮箱/学号），可为空 */
    private String keyword;
    /** 限制搜索范围的用户 ID 列表（此处为同组学生 ID） */
    private List<String> userIds;
}
