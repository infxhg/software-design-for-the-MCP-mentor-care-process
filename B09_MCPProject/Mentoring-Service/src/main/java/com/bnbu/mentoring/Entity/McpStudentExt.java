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
    private String status;
    /** 展示标签，格式如 2024-2025-Y1，用于学年过滤和前端展示 */
    private String groupId;
    /** 组的唯一标识（sys_org_unit.id UUID），用于跳越进控制和精确查询 */
    private String groupKey;
    private LocalDateTime updateTime;
}
