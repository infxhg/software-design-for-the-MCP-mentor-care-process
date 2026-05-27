package com.bnbu.mentoring.DTO;

import com.bnbu.mentoring.Entity.McpRecord;
import lombok.Data;

import java.util.List;

@Data
public class StudentGroupRecordDTO {
    private String studentId;
    private String majorId;
    private String status;
    /** 展示标签，如 2024-2025-Y1 */
    private String groupId;
    /** 组织 UUID（groupKey） */
    private String groupKey;
    private List<McpRecord> interviewRecords;
}
