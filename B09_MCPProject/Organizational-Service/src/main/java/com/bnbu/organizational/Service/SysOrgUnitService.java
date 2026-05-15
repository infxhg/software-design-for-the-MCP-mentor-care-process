package com.bnbu.organizational.Service;

import com.baomidou.mybatisplus.extension.service.IService;
import com.bnbu.organizational.DTO.MentorVO;
import com.bnbu.organizational.Entity.SysOrgUnit;

import java.util.List;

public interface SysOrgUnitService extends IService<SysOrgUnit> {

    /**
     * 根据组织单位ID (如 Department ID) 和关键字 查询该组织下的所有 Mentor
     */
    List<MentorVO> searchMentorsByOrgId(String orgUnitId, String keyword);

    /**
     * 全局根据关键字查询 Mentor (给 Faculty Consultant 使用)
     */
    List<MentorVO> searchAllMentors(String keyword);

    /**
     * 根据组织单位ID (如 Department ID) 和关键字 查询该组织下的所有 Student (给 Coordinator 使用)
     */
    List<com.bnbu.organizational.DTO.UserRemoteDTO> searchStudentsByOrgId(String orgUnitId, String keyword);

    /**
     * 全局根据关键字查询 Student
     */
    List<com.bnbu.organizational.DTO.UserRemoteDTO> searchAllStudents(String keyword);

    /**
     * 根据学生 ID 精确查询单个学生（透传 User-Service 结果）
     */
    com.alibaba.nacos.api.model.v2.Result getStudentById(String studentId);
}