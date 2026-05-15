package com.bnbu.organizational.Controller;


import com.bnbu.organizational.DTO.MentorVO;
import com.bnbu.organizational.DTO.Result;
import com.bnbu.organizational.Entity.SysOrgUnit;
import com.bnbu.organizational.Service.SysOrgUnitService;
import lombok.RequiredArgsConstructor;
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
     * 功能：全局搜索导师信息 (供 Faculty Consultant 使用)
     * 描述：不限制部门，全校范围内根据关键字搜索导师
     */
    @org.springframework.security.access.prepost.PreAuthorize("hasAuthority('ROLE_FACULTY_CONSULTANT')")
    @GetMapping("/mentors/search")
    public Result searchAllMentors(@RequestParam(required = false) String keyword) {
        List<MentorVO> mentors = sysOrgUnitService.searchAllMentors(keyword);
        return Result.success("获取成功", mentors);
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
     * 功能：全局搜索学生信息 (供 Faculty Consultant / 系统管理员 使用)
     */
    @org.springframework.security.access.prepost.PreAuthorize("hasAuthority('ROLE_FACULTY_CONSULTANT') or hasAuthority('ROLE_ADMIN') or hasAuthority('ROLE_COORDINATOR')")
    @GetMapping("/students/search")
    public Result searchAllStudents(@RequestParam(required = false) String keyword) {
        List<com.bnbu.organizational.DTO.UserRemoteDTO> students = sysOrgUnitService.searchAllStudents(keyword);
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
     * 描述：管理员手动添加学院或部门
     */
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
    @org.springframework.security.access.prepost.PreAuthorize("hasAuthority('ROLE_MENTOR') or hasAuthority('ROLE_COORDINATOR')")
    @GetMapping("/student/{studentId}")
    public Result getStudentById(@PathVariable String studentId) {
        com.alibaba.nacos.api.model.v2.Result result = sysOrgUnitService.getStudentById(studentId);
        if (result == null || result.getCode() != 200) {
            return Result.error("用户不存在或查询失败");
        }
        return Result.success("查询成功", result.getData());
    }
}