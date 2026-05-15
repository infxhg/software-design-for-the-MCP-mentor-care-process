package com.bnbu.mentoring.DTO;

import com.bnbu.mentoring.Entity.McpRecord;
import lombok.Data;

import java.util.List;

@Data
public class StudentGroupRecordDTO {
    private String studentId;
    private String majorId;
    private String status;
    private String groupId;
    private List<McpRecord> interviewRecords;
}
