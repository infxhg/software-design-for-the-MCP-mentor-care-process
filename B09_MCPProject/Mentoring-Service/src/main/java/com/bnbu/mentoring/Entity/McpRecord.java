package com.bnbu.mentoring.Entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.util.Date;
import java.time.LocalTime;

@Data
@TableName("mcp_record")
public class McpRecord {
    @TableId(type = IdType.ASSIGN_UUID)
    private String recordId;
    private String studentId;
    private String mentorId;
    private String groupId;
    private Date interviewDate;
    private LocalTime interviewTime;
    private String problemStatement;
    private String interviewSummary;
    private String followupAction;
    private Date createTime;
}
