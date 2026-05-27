package com.bnbu.organizational.Controller;


import com.bnbu.organizational.DTO.CoordinatorScopeSearchVO;
import com.bnbu.organizational.DTO.MentorVO;
import com.bnbu.organizational.Common.OperationLogActions;
import com.bnbu.organizational.DTO.Result;
import com.bnbu.organizational.Entity.SysOrgUnit;
import com.bnbu.organizational.OpenFeign.UserFeignClient;
import com.bnbu.organizational.OpenFeign.MentoringAccessClient;
import com.bnbu.organizational.Service.OperationLogRecorder;
import com.bnbu.organizational.DTO.McpGroupDetailVO;
import com.bnbu.organizational.DTO.StudentProfileVO;
import com.bnbu.organizational.Service.SysOrgUnitService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * 组织架构与导师分配控制器
 */
@RestController
@RequestMapping("/api/org")
@RequiredArgsConstructor
public class SysOrgUnitController {

    private final SysOrgUnitService sysOrgUnitService;
    private final UserFeignClient userFeignClient;
    private final MentoringAccessClient mentoringAccessClient;
    private final OperationLogRecorder operationLogRecorder;

    /**
     * 功能：搜索导师信息 (供 Coordinator 使用，或按系搜索)
     * 描述：根据组织节点（如系 ID）查询该部门下的所有导师详情（含姓名、邮箱、办公室）
     */
    @org.springframework.security.access.prepost.PreAuthorize("hasAuthority('ROLE_COORDINATOR')")
    @GetMapping("/mentors/{orgUnitId}")
    public Result getMentorsByOrg(
            @PathVariable String orgUnitId,
            @RequestParam(required = false) String keyword) {
        List<MentorVO> mentors = sysOrgUnitService.searchMentorsByOrgId(orgUnitId, keyword);
        return Result.success("获取成功",mentors);
    }

    /**
     * FC 搜索导师：keyword 可为姓名/邮箱，或小组展示标签 groupId（如 2024-2025-Y1）
     */
    @org.springframework.security.access.prepost.PreAuthorize("hasAuthority('ROLE_FACULTY_CONSULTANT')")
    @GetMapping("/mentors/search")
    public Result searchAllMentors(
            @RequestParam(required = false) String keyword,
            @RequestHeader(value = "X-User-Id", required = false) String consultantId) {
        if (consultantId == null || consultantId.isEmpty()) {
            return Result.error("未获取到当前登录 FC ID，请通过网关访问");
        }
        List<MentorVO> mentors = sysOrgUnitService.searchMentorsForFacultyConsultant(consultantId, keyword);
        return Result.success("获取成功", mentors);
    }

    /**
     * FC 按 groupKey（组织 UUID）获取小组详情
     * GET /api/org/groups/by-key/{groupKey}
     */
    @org.springframework.security.access.prepost.PreAuthorize("hasAuthority('ROLE_FACULTY_CONSULTANT')")
    @GetMapping("/groups/by-key/{groupKey}")
    public Result getGroupByKey(
            @PathVariable String groupKey,
            @RequestHeader(value = "X-User-Id", required = false) String consultantId) {
        if (consultantId == null || consultantId.isEmpty()) {
            return Result.error("未获取到当前登录 FC ID，请通过网关访问");
        }
        try {
            McpGroupDetailVO detail = sysOrgUnitService.getGroupDetailByKeyForFacultyConsultant(consultantId, groupKey);
            return Result.success("获取成功", detail);
        } catch (RuntimeException e) {
            return Result.error(e.getMessage());
        }
    }

    /**
     * 功能：搜索学生信息 (供 Coordinator 使用，按系搜索)
     */
    @org.springframework.security.access.prepost.PreAuthorize("hasAuthority('ROLE_COORDINATOR')")
    @GetMapping("/students/{orgUnitId}")
    public Result getStudentsByOrg(
            @PathVariable String orgUnitId,
            @RequestParam(required = false) String keyword) {
        List<com.bnbu.organizational.DTO.UserRemoteDTO> students = sysOrgUnitService.searchStudentsByOrgId(orgUnitId, keyword);
        return Result.success("获取成功", students);
    }

    /**
     * 功能：全局搜索学生信息 (仅供 Supporting Staff 使用)
     */
    @org.springframework.security.access.prepost.PreAuthorize("hasAuthority('ROLE_SUPPORT_STAFF') or hasAuthority('ROLE_FACULTY_CONSULTANT')")
    @GetMapping("/students/search")
    public Result searchAllStudents(
            @RequestParam(required = false) String keyword,
            @RequestHeader(value = "X-User-Id", required = false) String currentUserId) {
        List<com.bnbu.organizational.DTO.UserRemoteDTO> students = sysOrgUnitService.searchAllStudents(keyword);
        if (currentUserId != null && !currentUserId.isBlank()) {
            operationLogRecorder.recordQuiet(currentUserId,
                    operationLogRecorder.resolveUsername(currentUserId),
                    OperationLogActions.SEARCH_STUDENTS,
                    "keyword=" + (keyword != null ? keyword : "") + ", count=" + students.size());
        }
        return Result.success("获取成功", students);
    }

    /**
     * 功能：获取组织架构树
     * 描述：查询所有的学院、系、专业结构，支持按类型过滤
     */
    @GetMapping("/units")
    public Result getAllUnits(@RequestParam(required = false) Integer unitType) {
        // 直接利用 MyBatis-Plus 的 lambdaQuery 快速实现简单过滤
        List<SysOrgUnit> list = sysOrgUnitService.lambdaQuery()
                .eq(unitType != null, SysOrgUnit::getUnitType, unitType)
                .list();
        return Result.success("获取成功",list);
    }

    /**
     * 功能：新增组织节点
     * 描述：管理员手动添加学院或部门（请优先使用 /api/org/admin/units）
     */
    @org.springframework.security.access.prepost.PreAuthorize("hasAuthority('ROLE_ADMIN')")
    @PostMapping("/unit")
    public Result addUnit(@RequestBody SysOrgUnit sysOrgUnit) {
        boolean saved = sysOrgUnitService.save(sysOrgUnit);
        if(saved){
            return Result.success();
        }else{
            return Result.error("新增失败");
        }

    }

    /**
     * 功能：查询单个组织详情
     */
    @GetMapping("/unit/{unitId}")
    public Result getUnitDetail(@PathVariable String unitId) {
        SysOrgUnit sysOrgUnit = sysOrgUnitService.getById(unitId);
        return Result.success("获取成功",sysOrgUnit);
    }

    /**
     * 功能：按学生 ID 精确查询单个学生信息
     * 描述：供 Mentor 和 Coordinator 使用，通过学生 ID 精确查找对应学生的基本信息
     * GET /api/org/student/{studentId}
     */
    @org.springframework.security.access.prepost.PreAuthorize("hasAuthority('ROLE_MENTOR') or hasAuthority('ROLE_COORDINATOR') or hasAuthority('ROLE_FACULTY_CONSULTANT')")
    @GetMapping("/student/{studentId}")
    public Result getStudentById(
            @PathVariable String studentId,
            @RequestHeader(value = "X-User-Id", required = false) String currentUserId) {
        if (currentUserId == null || currentUserId.isEmpty()) {
            return Result.error("未获取到当前登录用户ID，请通过网关访问");
        }
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (hasRole(auth, "ROLE_COORDINATOR")) {
            Object memberData = sysOrgUnitService.searchMemberInMyDept(currentUserId, studentId);
            if (memberData == null) {
                return Result.error("该用户不存在或不在您的部门管理范围内");
            }
            operationLogRecorder.recordQuiet(currentUserId,
                    operationLogRecorder.resolveUsername(currentUserId),
                    OperationLogActions.VIEW_ORG_STUDENT,
                    "studentId=" + studentId);
            return Result.success("查询成功", memberData);
        }
        if (hasRole(auth, "ROLE_MENTOR")) {
            if (!feignBool(mentoringAccessClient.mentorCanAccessStudent(currentUserId, studentId))) {
                return Result.error("权限不足：该学生不属于您负责的小组");
            }
        } else if (hasRole(auth, "ROLE_FACULTY_CONSULTANT")) {
            if (!feignBool(mentoringAccessClient.facultyConsultantCanAccessStudent(currentUserId, studentId))) {
                return Result.error("权限不足：该学生不在您的学院管理范围内");
            }
        }
        com.alibaba.nacos.api.model.v2.Result result = sysOrgUnitService.getStudentById(studentId);
        if (result == null || result.getCode() != 200) {
            return Result.error("用户不存在或查询失败");
        }
        operationLogRecorder.recordQuiet(currentUserId,
                operationLogRecorder.resolveUsername(currentUserId),
                OperationLogActions.VIEW_ORG_STUDENT,
                "studentId=" + studentId);
        return Result.success("查询成功", result.getData());
    }

    private boolean hasRole(Authentication auth, String role) {
        if (auth == null) {
            return false;
        }
        return auth.getAuthorities().stream()
                .map(GrantedAuthority::getAuthority)
                .anyMatch(role::equals);
    }

    private boolean feignBool(com.bnbu.organizational.DTO.Result res) {
        return res != null && res.getCode() == 200 && Boolean.TRUE.equals(res.getData());
    }

    /**
     * 功能：Coordinator 通过用户 ID 查询 Mentor 或 Student，数据范围限定在自己的 Department
     * 描述：后端自动读取当前 Coordinator 的部门，校验目标用户是否在同一部门内，防止跨部门查询
     * GET /api/org/my-dept/member/{userId}
     */
    @org.springframework.security.access.prepost.PreAuthorize("hasAuthority('ROLE_COORDINATOR')")
    @GetMapping("/my-dept/member/{userId}")
    public Result searchMemberInMyDept(
            @PathVariable String userId,
            @RequestHeader(value = "X-User-Id", required = false) String coordinatorId) {
        if (coordinatorId == null || coordinatorId.isEmpty()) {
            return Result.error("未获取到当前登录的 Coordinator ID，请通过网关访问");
        }
        Object memberData = sysOrgUnitService.searchMemberInMyDept(coordinatorId, userId);
        if (memberData == null) {
            return Result.error("该用户不存在或不在您的部门管理范围内");
        }
        operationLogRecorder.recordQuiet(coordinatorId,
                operationLogRecorder.resolveUsername(coordinatorId),
                OperationLogActions.VIEW_ORG_STUDENT,
                "targetUserId=" + userId);
        return Result.success("查询成功", memberData);
    }

    /**
     * 功能：Coordinator 通过姓名或邮箱搜索自己所属部门内的所有 Mentor
     * 描述：后端自动推断 Coordinator 的部门，无需手动传 orgUnitId
     * GET /api/org/my-dept/mentors?keyword=xxx
     */
    @org.springframework.security.access.prepost.PreAuthorize("hasAuthority('ROLE_COORDINATOR')")
    @GetMapping("/my-dept/mentors")
    public Result searchMentorsInMyDept(
            @RequestParam(required = false) String keyword,
            @RequestHeader(value = "X-User-Id", required = false) String coordinatorId) {
        if (coordinatorId == null || coordinatorId.isEmpty()) {
            return Result.error("未获取到当前登录的 Coordinator ID，请通过网关访问");
        }
        List<com.bnbu.organizational.DTO.MentorVO> mentors = sysOrgUnitService.searchMentorsInMyDept(coordinatorId, keyword);
        return Result.success("获取成功", mentors);
    }

    /**
     * Coordinator 在本学院范围内搜索 Faculty Consultant
     * GET /api/org/my-faculty/consultants?keyword=
     * 根据当前 Coordinator 所在组织向上解析 FACULTY 节点，仅返回绑定在同一学院下的 FC
     */
    @org.springframework.security.access.prepost.PreAuthorize("hasAuthority('ROLE_COORDINATOR')")
    @GetMapping("/my-faculty/consultants")
    public Result searchFacultyConsultantsInMyFaculty(
            @RequestParam(required = false) String keyword,
            @RequestHeader(value = "X-User-Id", required = false) String coordinatorId) {
        if (coordinatorId == null || coordinatorId.isEmpty()) {
            return Result.error("未获取到当前登录的 Coordinator ID，请通过网关访问");
        }
        List<com.bnbu.organizational.DTO.FacultyConsultantVO> consultants =
                sysOrgUnitService.searchFacultyConsultantsInMyFaculty(coordinatorId, keyword);
        return Result.success("获取成功", consultants);
    }

    /**
     * Coordinator 统一搜索管辖范围内的 Mentor、Student、Faculty Consultant
     * GET /api/org/my-scope/search?keyword=&roleType=
     * roleType 可选：MENTOR / STUDENT / FACULTY_CONSULTANT（或 FC）；不传则三类一并返回
     */
    @org.springframework.security.access.prepost.PreAuthorize("hasAuthority('ROLE_COORDINATOR')")
    @GetMapping("/my-scope/search")
    public Result searchInMyScope(
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) String roleType,
            @RequestHeader(value = "X-User-Id", required = false) String coordinatorId) {
        if (coordinatorId == null || coordinatorId.isEmpty()) {
            return Result.error("未获取到当前登录的 Coordinator ID，请通过网关访问");
        }
        try {
            CoordinatorScopeSearchVO data =
                    sysOrgUnitService.searchInMyScope(coordinatorId, keyword, roleType);
            operationLogRecorder.recordQuiet(coordinatorId,
                    operationLogRecorder.resolveUsername(coordinatorId),
                    OperationLogActions.SEARCH_SCOPE_USERS,
                    "keyword=" + (keyword != null ? keyword : "")
                            + ", roleType=" + (roleType != null ? roleType : "")
                            + ", mentors=" + data.getMentors().size()
                            + ", students=" + data.getStudents().size()
                            + ", fcs=" + data.getFacultyConsultants().size());
            return Result.success("获取成功", data);
        } catch (IllegalArgumentException ex) {
            return Result.error(ex.getMessage());
        }
    }

    /**
     * Coordinator 在本系及子组织范围内搜索学生（无需 orgUnitId）
     * GET /api/org/my-dept/students?keyword=
     */
    @org.springframework.security.access.prepost.PreAuthorize("hasAuthority('ROLE_COORDINATOR')")
    @GetMapping("/my-dept/students")
    public Result searchStudentsInMyDept(
            @RequestParam(required = false) String keyword,
            @RequestHeader(value = "X-User-Id", required = false) String coordinatorId) {
        if (coordinatorId == null || coordinatorId.isEmpty()) {
            return Result.error("未获取到当前登录的 Coordinator ID，请通过网关访问");
        }
        List<com.bnbu.organizational.DTO.UserRemoteDTO> students =
                sysOrgUnitService.searchStudentsInMyDept(coordinatorId, keyword);
        return Result.success("获取成功", students);
    }

    /**
     * FC / Coordinator：按学号精确查询学生完整档案（含 email、phone、major、status 等）。
     * GET /api/org/student/{studentId}/profile
     */
    @org.springframework.security.access.prepost.PreAuthorize(
            "hasAuthority('ROLE_FACULTY_CONSULTANT') or hasAuthority('ROLE_COORDINATOR')")
    @GetMapping("/student/{studentId}/profile")
    public Result getStudentProfile(
            @PathVariable String studentId,
            @RequestHeader(value = "X-User-Id", required = false) String currentUserId) {
        if (currentUserId == null || currentUserId.isEmpty()) {
            return Result.error("未获取到当前登录用户ID，请通过网关访问");
        }
        try {
            Authentication auth = SecurityContextHolder.getContext().getAuthentication();
            boolean isFc = hasRole(auth, "ROLE_FACULTY_CONSULTANT");
            StudentProfileVO profile = sysOrgUnitService.getStudentProfileForCaller(
                    currentUserId, isFc, studentId);
            operationLogRecorder.recordQuiet(currentUserId,
                    operationLogRecorder.resolveUsername(currentUserId),
                    OperationLogActions.VIEW_ORG_STUDENT,
                    "studentId=" + studentId + ", profile=1");
            return Result.success("查询成功", profile);
        } catch (RuntimeException e) {
            return Result.error(e.getMessage());
        }
    }

    /**
     * FC / Coordinator：关键字搜索学生完整档案列表。
     * FC：学院范围内；Coordinator：本系及子组织范围内。
     * GET /api/org/students/profile?keyword=
     */
    @org.springframework.security.access.prepost.PreAuthorize(
            "hasAuthority('ROLE_FACULTY_CONSULTANT') or hasAuthority('ROLE_COORDINATOR')")
    @GetMapping("/students/profile")
    public Result searchStudentProfiles(
            @RequestParam(required = false) String keyword,
            @RequestHeader(value = "X-User-Id", required = false) String currentUserId) {
        if (currentUserId == null || currentUserId.isEmpty()) {
            return Result.error("未获取到当前登录用户ID，请通过网关访问");
        }
        try {
            Authentication auth = SecurityContextHolder.getContext().getAuthentication();
            boolean isFc = hasRole(auth, "ROLE_FACULTY_CONSULTANT");
            List<StudentProfileVO> profiles = sysOrgUnitService.searchStudentProfilesForCaller(
                    currentUserId, isFc, keyword);
            operationLogRecorder.recordQuiet(currentUserId,
                    operationLogRecorder.resolveUsername(currentUserId),
                    OperationLogActions.SEARCH_STUDENTS,
                    "keyword=" + (keyword != null ? keyword : "") + ", count=" + profiles.size());
            return Result.success("获取成功", profiles);
        } catch (RuntimeException e) {
            return Result.error(e.getMessage());
        }
    }

}