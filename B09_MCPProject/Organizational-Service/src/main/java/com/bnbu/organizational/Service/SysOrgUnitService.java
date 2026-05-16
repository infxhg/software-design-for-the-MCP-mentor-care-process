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

    /**
     * Coordinator 按用户 ID 查询 Mentor 或 Student，且校验目标用户必须在 Coordinator 的部门范围内
     * @param coordinatorId 当前登录的 Coordinator 用户 ID（来自 X-User-Id）
     * @param targetUserId  被查询的目标用户 ID
     * @return 用户信息；若目标用户不在 Coordinator 部门内则返回 null
     */
    Object searchMemberInMyDept(String coordinatorId, String targetUserId);

    /**
     * Coordinator 通过姓名/邮箱搜索自己所属部门内的所有 Mentor
     * 后端自动从 coordinatorId 推断所在部门，无需前端传 orgUnitId
     */
    List<MentorVO> searchMentorsInMyDept(String coordinatorId, String keyword);
}