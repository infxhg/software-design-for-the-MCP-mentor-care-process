package com.bnbu.organizational.DTO;

import lombok.Data;

import java.util.ArrayList;
import java.util.List;

/**
 * Coordinator 管辖范围内统一搜索结果（导师 / 学生 / 院级顾问）
 */
@Data
public class CoordinatorScopeSearchVO {
    private List<MentorVO> mentors = new ArrayList<>();
    private List<UserRemoteDTO> students = new ArrayList<>();
    private List<FacultyConsultantVO> facultyConsultants = new ArrayList<>();
}
