package com.bnbu.organizational.Service;

import com.baomidou.mybatisplus.extension.service.IService;
import com.bnbu.organizational.DTO.CoordinatorScopeSearchVO;
import com.bnbu.organizational.DTO.FacultyConsultantVO;
import com.bnbu.organizational.DTO.McpGroupDetailVO;
import com.bnbu.organizational.DTO.MentorVO;
import com.bnbu.organizational.DTO.StudentProfileVO;
import com.bnbu.organizational.Entity.SysOrgUnit;

import java.util.List;

public interface SysOrgUnitService extends IService<SysOrgUnit> {

    /**
     * 根据组织单位ID (如 Department ID) 和关键字 查询该组织下的所有 Mentor
     */
    List<MentorVO> searchMentorsByOrgId(String orgUnitId, String keyword);

    /**
     * 全局根据关键字查询 Mentor (给 Faculty Consultant 使用)
     * @deprecated 请使用 {@link #searchMentorsForFacultyConsultant(String, String)}
     */
    @Deprecated
    List<MentorVO> searchAllMentors(String keyword);

    /**
     * FC 搜索导师：支持姓名/邮箱，也支持按小组展示标签 groupId（如 2024-2025-Y1）反查该组导师。
     */
    List<MentorVO> searchMentorsForFacultyConsultant(String consultantId, String keyword);

    /**
     * FC 按 groupKey（组织 UUID）获取小组详情（含导师、学生成员 ID 列表）。
     */
    McpGroupDetailVO getGroupDetailByKeyForFacultyConsultant(String consultantId, String groupKey);

    /**
     * 根据组织单位ID (如 Department ID) 和关键字 查询该组织下的所有 Student (给 Coordinator 使用)
     */
    List<com.bnbu.organizational.DTO.UserRemoteDTO> searchStudentsByOrgId(String orgUnitId, String keyword);

    /**
     * 全局根据关键字查询 Student
     */
    List<com.bnbu.organizational.DTO.UserRemoteDTO> searchAllStudents(String keyword);

    /**
     * Faculty Consultant：仅在本院（FACULTY）组织子树内的学生中按关键字搜索。
     */
    List<com.bnbu.organizational.DTO.UserRemoteDTO> searchStudentsForFacultyConsultant(
            String consultantId, String keyword);

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

    /**
     * Coordinator 在本学院范围内搜索 Faculty Consultant（根据 Coordinator 所在组织向上解析 FACULTY 节点）
     */
    List<FacultyConsultantVO> searchFacultyConsultantsInMyFaculty(String coordinatorId, String keyword);

    /**
     * Coordinator 在本系及子组织范围内搜索学生（自动推断部门，无需传 orgUnitId）
     */
    List<com.bnbu.organizational.DTO.UserRemoteDTO> searchStudentsInMyDept(String coordinatorId, String keyword);

    /**
     * Coordinator 统一搜索管辖范围内的 Mentor、Student、Faculty Consultant。
     *
     * @param roleType 可选：MENTOR / STUDENT / FACULTY_CONSULTANT（或 FC）；为空则返回三类
     */
    CoordinatorScopeSearchVO searchInMyScope(String coordinatorId, String keyword, String roleType);

    /**
     * FC / Coordinator：按学号精确查询学生档案（含 email、phone、major、status 等）。
     */
    StudentProfileVO getStudentProfileForCaller(String callerId, boolean isFacultyConsultant, String studentId);

    /**
     * FC / Coordinator：按关键字搜索学生档案列表（数据范围分别为学院 / 本系）。
     */
    List<StudentProfileVO> searchStudentProfilesForCaller(
            String callerId, boolean isFacultyConsultant, String keyword);
}