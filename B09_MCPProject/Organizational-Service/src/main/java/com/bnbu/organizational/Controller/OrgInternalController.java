package com.bnbu.organizational.Controller;

import com.bnbu.organizational.DTO.BindUserOrgRequest;
import com.bnbu.organizational.DTO.ChangeGroupMentorRequest;
import com.bnbu.organizational.DTO.EnsureMcpGroupRequest;
import com.bnbu.organizational.DTO.Result;
import com.bnbu.organizational.Service.McpGroupOrgService;
import com.bnbu.organizational.Service.SysUserOrgService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

/**
 * 供其它微服务（Feign + X-Internal-Call）调用的内部接口，不做业务鉴权。
 */
@RestController
@RequestMapping("/api/org/internal")
@RequiredArgsConstructor
public class OrgInternalController {

    private final SysUserOrgService sysUserOrgService;
    private final McpGroupOrgService mcpGroupOrgService;

    @PostMapping("/user-org/bind")
    @PreAuthorize("permitAll()")
    public Result bindUserOrg(@RequestBody BindUserOrgRequest request) {
        sysUserOrgService.bindUserToOrg(
                request.getUserId(),
                request.getOrgUnitIdOrName(),
                request.getPrimary() == null || request.getPrimary());
        return Result.success("bound", null);
    }

    @GetMapping("/coordinator/{coordinatorId}/can-access-user/{targetUserId}")
    @PreAuthorize("permitAll()")
    public Result coordinatorCanAccessUser(
            @PathVariable String coordinatorId,
            @PathVariable String targetUserId) {
        boolean ok = sysUserOrgService.isUserInOrgScope(coordinatorId, targetUserId);
        return Result.success("ok", ok);
    }

    @GetMapping("/coordinator/{coordinatorId}/can-access-org/{orgUnitId}")
    @PreAuthorize("permitAll()")
    public Result coordinatorCanAccessOrg(
            @PathVariable String coordinatorId,
            @PathVariable String orgUnitId) {
        boolean ok = sysUserOrgService.isOrgInUserScope(coordinatorId, orgUnitId);
        return Result.success("ok", ok);
    }

    @GetMapping("/faculty-consultant/{consultantId}/can-access-faculty/{facultyOrgId}")
    @PreAuthorize("permitAll()")
    public Result facultyConsultantCanAccessFaculty(
            @PathVariable String consultantId,
            @PathVariable String facultyOrgId) {
        boolean ok = sysUserOrgService.isGroupFacultyInConsultantScope(consultantId, facultyOrgId);
        return Result.success("ok", ok);
    }

    // ---------- MCP 小组（sys_org_unit + sys_user_org）----------

    @GetMapping("/groups/{groupId}")
    @PreAuthorize("permitAll()")
    public Result getGroup(@PathVariable String groupId) {
        return Result.success("success", mcpGroupOrgService.getGroup(groupId));
    }

    @GetMapping("/groups/by-mentor/{mentorId}")
    @PreAuthorize("permitAll()")
    public Result listGroupsByMentor(@PathVariable String mentorId) {
        return Result.success("success", mcpGroupOrgService.listByMentor(mentorId));
    }

    @GetMapping("/groups/by-label")
    @PreAuthorize("permitAll()")
    public Result findGroupKeysByLabel(@RequestParam String label) {
        return Result.success("success", mcpGroupOrgService.findGroupKeysByLabel(label));
    }

    @GetMapping("/groups/by-label-and-major")
    @PreAuthorize("permitAll()")
    public Result findGroupKeysByLabelAndMajor(
            @RequestParam String label,
            @RequestParam String majorId) {
        return Result.success("success", mcpGroupOrgService.findGroupKeysByLabelAndMajor(label, majorId));
    }

    @GetMapping("/org-units/major-id")
    @PreAuthorize("permitAll()")
    public Result resolveMajorOrgId(@RequestParam String majorId) {
        return Result.success("success", mcpGroupOrgService.resolveMajorOrgId(majorId));
    }

    @GetMapping("/org-units/major-display-name")
    @PreAuthorize("permitAll()")
    public Result resolveMajorDisplayName(@RequestParam String majorId) {
        return Result.success("success", mcpGroupOrgService.resolveMajorDisplayName(majorId));
    }

    @GetMapping("/groups/{groupId}/major-display-name")
    @PreAuthorize("permitAll()")
    public Result resolveMajorDisplayNameForGroup(@PathVariable String groupId) {
        return Result.success("success", mcpGroupOrgService.resolveMajorDisplayNameForGroup(groupId));
    }

    @GetMapping("/org-units/major-subtree-ids")
    @PreAuthorize("permitAll()")
    public Result listMajorSubtreeOrgIds(@RequestParam String majorId) {
        return Result.success("success", mcpGroupOrgService.listMajorSubtreeOrgIds(majorId));
    }

    /**
     * 按 name 匹配组织单位（默认 type=DEPARTMENT），返回该节点及全部下属单位 id。
     */
    @GetMapping("/org-units/subtree-by-name")
    @PreAuthorize("permitAll()")
    public Result resolveSubtreeByName(
            @RequestParam String name,
            @RequestParam(required = false, defaultValue = "DEPARTMENT") String type) {
        return Result.success("success", mcpGroupOrgService.resolveSubtreeByName(name, type));
    }

    @GetMapping("/faculty-consultant/{consultantId}/faculty-org-ids")
    @PreAuthorize("permitAll()")
    public Result listFacultyOrgIdsForConsultant(@PathVariable String consultantId) {
        return Result.success("success", sysUserOrgService.listFacultyOrgIdsForUser(consultantId));
    }

    @PostMapping("/groups/ensure")
    @PreAuthorize("permitAll()")
    public Result ensureGroup(@RequestBody EnsureMcpGroupRequest request) {
        return Result.success("success", mcpGroupOrgService.ensureGroup(
                request.getGroupId(),
                request.getMentorId(),
                request.getParentOrgId(),
                request.getDisplayName()));
    }

    @PutMapping("/groups/{groupId}/mentor")
    @PreAuthorize("permitAll()")
    public Result changeGroupMentor(
            @PathVariable String groupId,
            @RequestBody ChangeGroupMentorRequest request) {
        return Result.success("success", mcpGroupOrgService.changeMentor(groupId, request.getMentorId()));
    }

    @PostMapping("/groups/{groupId}/members/{userId}/bind")
    @PreAuthorize("permitAll()")
    public Result bindGroupMember(@PathVariable String groupId, @PathVariable String userId) {
        mcpGroupOrgService.bindMember(groupId, userId);
        return Result.success("bound", null);
    }

    @DeleteMapping("/groups/{groupId}/members/{userId}/bind")
    @PreAuthorize("permitAll()")
    public Result unbindGroupMember(@PathVariable String groupId, @PathVariable String userId) {
        mcpGroupOrgService.unbindMember(groupId, userId);
        return Result.success("unbound", null);
    }

    @GetMapping("/groups/{groupId}/mentor/{mentorId}/is-owner")
    @PreAuthorize("permitAll()")
    public Result isMentorOfGroup(@PathVariable String groupId, @PathVariable String mentorId) {
        return Result.success("ok", mcpGroupOrgService.isMentorOfGroup(mentorId, groupId));
    }

    @GetMapping("/groups/{groupId}/faculty-org-id")
    @PreAuthorize("permitAll()")
    public Result getGroupFacultyOrgId(@PathVariable String groupId) {
        return Result.success("success", mcpGroupOrgService.resolveFacultyOrgId(groupId));
    }

    @GetMapping("/groups/{groupId}/student-member-ids")
    @PreAuthorize("permitAll()")
    public Result listGroupStudentMemberIds(@PathVariable String groupId) {
        return Result.success("success", mcpGroupOrgService.listStudentMemberIds(groupId));
    }
}
