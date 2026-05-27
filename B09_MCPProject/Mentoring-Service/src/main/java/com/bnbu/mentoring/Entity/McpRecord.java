package com.bnbu.mentoring.Entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import com.fasterxml.jackson.annotation.JsonFormat;
import lombok.Data;

import java.time.LocalDate;
import java.util.Date;

@Data
@TableName("mcp_record")
public class McpRecord {
    @TableId(type = IdType.ASSIGN_UUID)
    private String recordId;
    private String studentId;
    private String mentorId;
    /** 展示标签，格式如 2024-2025-Y1，用于学年过滤 */
    private String groupId;
    /** 组的唯一标识（sys_org_unit.id UUID），用于精确查询记录 */
    private String groupKey;

    // LocalDate 是无时区的纯日期类型，序列化直接输出 "yyyy-MM-dd"，彻底消除 UTC 偏移问题
    @JsonFormat(pattern = "yyyy-MM-dd")
    private LocalDate interviewDate;

    // 前端格式为 HH:mm（如 "10:00"），用 String 避免 LocalTime 反序列化依赖问题
    private String interviewTime;

    private String problemStatement;
    private String interviewSummary;
    private String followupAction;

    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss", timezone = "Asia/Shanghai")
    private Date createTime;
}
