package com.bnbu.organizational.DTO;

import lombok.Data;

@Data
public class ChangeGroupMentorRequest {
    /** 新导师 userId */
    private String mentorId;
    /** 原导师（仅 Mentoring 按标签换导师时用于消歧，组织服务忽略） */
    private String previousMentorId;
}
