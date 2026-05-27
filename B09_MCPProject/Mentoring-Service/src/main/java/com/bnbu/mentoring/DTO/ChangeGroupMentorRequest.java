package com.bnbu.mentoring.DTO;

import lombok.Data;

@Data
public class ChangeGroupMentorRequest {
    /** 新导师 userId */
    private String mentorId;
    /**
     * 原导师 userId（可选）。
     * 通过展示标签 groupId 换导师时，与 majorId 一起用于唯一定位 groupKey。
     */
    private String previousMentorId;
}
