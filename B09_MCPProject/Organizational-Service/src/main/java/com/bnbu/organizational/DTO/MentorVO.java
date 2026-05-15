package com.bnbu.organizational.DTO;

import lombok.Data;

/**
 * 返回给前端的 Mentor 视图对象 (View Object)
 */
@Data
public class MentorVO {
    private String mentorId;
    private String mentorName;
    private String email;
    private String office;
    private String departmentName; // 冗余一个所属系名称，前端展示更友好
}