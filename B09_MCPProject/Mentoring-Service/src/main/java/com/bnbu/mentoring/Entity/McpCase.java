package com.bnbu.mentoring.Entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@TableName("mcp_case")
public class McpCase {
    @TableId(type = IdType.ASSIGN_UUID)
    private String caseId;
    private String studentId;
    private String submitterId;
    private String coordinatorId;
    private String consultantId;
    private String description;
    private String status;
    private LocalDateTime createTime;
    private LocalDateTime updateTime;
}
