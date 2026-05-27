package com.bnbu.mentoring.Client;

import com.bnbu.mentoring.DTO.BindUserOrgRequest;
import com.bnbu.mentoring.DTO.ChangeGroupMentorRequest;
import com.bnbu.mentoring.DTO.EnsureMcpGroupRequest;
import com.bnbu.mentoring.DTO.Result;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.*;

@FeignClient(name = "organizational-service", path = "/api/org/internal")
public interface OrgServiceClient {

    @PostMapping("/user-org/bind")
    Result bindUserOrg(@RequestBody BindUserOrgRequest request);

    @GetMapping("/coordinator/{coordinatorId}/can-access-user/{targetUserId}")
    Result coordinatorCanAccessUser(
            @PathVariable("coordinatorId") String coordinatorId,
            @PathVariable("targetUserId") String targetUserId);

    @GetMapping("/coordinator/{coordinatorId}/can-access-org/{orgUnitId}")
    Result coordinatorCanAccessOrg(
            @PathVariable("coordinatorId") String coordinatorId,
            @PathVariable("orgUnitId") String orgUnitId);

    @GetMapping("/faculty-consultant/{consultantId}/can-access-faculty/{facultyOrgId}")
    Result facultyConsultantCanAccessFaculty(
            @PathVariable("consultantId") String consultantId,
            @PathVariable("facultyOrgId") String facultyOrgId);

    @GetMapping("/groups/{groupId}")
    Result getGroup(@PathVariable("groupId") String groupId);

    @GetMapping("/groups/by-mentor/{mentorId}")
    Result listGroupsByMentor(@PathVariable("mentorId") String mentorId);

    @GetMapping("/groups/by-label")
    Result findGroupKeysByLabel(@RequestParam("label") String label);

    @GetMapping("/groups/by-label-and-major")
    Result findGroupKeysByLabelAndMajor(
            @RequestParam("label") String label,
            @RequestParam("majorId") String majorId);

    @GetMapping("/org-units/major-id")
    Result resolveMajorOrgId(@RequestParam("majorId") String majorId);

    @GetMapping("/org-units/major-display-name")
    Result resolveMajorDisplayName(@RequestParam("majorId") String majorId);

    @GetMapping("/groups/{groupId}/major-display-name")
    Result resolveMajorDisplayNameForGroup(@PathVariable("groupId") String groupId);

    @GetMapping("/org-units/major-subtree-ids")
    Result listMajorSubtreeOrgIds(@RequestParam("majorId") String majorId);

    @GetMapping("/org-units/subtree-by-name")
    Result resolveSubtreeByName(
            @RequestParam("name") String name,
            @RequestParam(value = "type", defaultValue = "DEPARTMENT") String type);

    @GetMapping("/faculty-consultant/{consultantId}/faculty-org-ids")
    Result listFacultyOrgIdsForConsultant(@PathVariable("consultantId") String consultantId);

    @PostMapping("/groups/ensure")
    Result ensureGroup(@RequestBody EnsureMcpGroupRequest request);

    @PutMapping("/groups/{groupId}/mentor")
    Result changeGroupMentor(
            @PathVariable("groupId") String groupId,
            @RequestBody ChangeGroupMentorRequest request);

    @PostMapping("/groups/{groupId}/members/{userId}/bind")
    Result bindGroupMember(@PathVariable("groupId") String groupId, @PathVariable("userId") String userId);

    @DeleteMapping("/groups/{groupId}/members/{userId}/bind")
    Result unbindGroupMember(@PathVariable("groupId") String groupId, @PathVariable("userId") String userId);

    @GetMapping("/groups/{groupId}/mentor/{mentorId}/is-owner")
    Result isMentorOfGroup(@PathVariable("groupId") String groupId, @PathVariable("mentorId") String mentorId);

    @GetMapping("/groups/{groupId}/faculty-org-id")
    Result getGroupFacultyOrgId(@PathVariable("groupId") String groupId);

    @GetMapping("/groups/{groupId}/student-member-ids")
    Result listGroupStudentMemberIds(@PathVariable("groupId") String groupId);
}
