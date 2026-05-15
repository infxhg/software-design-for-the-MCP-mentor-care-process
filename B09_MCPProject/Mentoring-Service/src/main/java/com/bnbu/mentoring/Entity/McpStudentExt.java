package com.bnbu.mentoring.Entity;

import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@TableName("mcp_student_ext")
public class McpStudentExt {
    @TableId
    private String studentId;
    private String majorId;
    private String status;
    private String groupId;
    private LocalDateTime updateTime;
}
