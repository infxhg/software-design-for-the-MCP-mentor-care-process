package com.bnbu.mentoring.Controller;

import com.bnbu.mentoring.DTO.Result;
import com.bnbu.mentoring.Service.MentoringAccessService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/mentoring/internal/access")
@RequiredArgsConstructor
public class MentoringAccessInternalController {

    private final MentoringAccessService mentoringAccessService;

    @GetMapping("/mentor/{mentorId}/student/{studentId}")
    @PreAuthorize("permitAll()")
    public Result mentorCanAccessStudent(
            @PathVariable String mentorId,
            @PathVariable String studentId) {
        boolean ok = mentoringAccessService.isStudentInMentorGroups(mentorId, studentId);
        return Result.success("ok", ok);
    }

    @GetMapping("/faculty-consultant/{consultantId}/student/{studentId}")
    @PreAuthorize("permitAll()")
    public Result facultyConsultantCanAccessStudent(
            @PathVariable String consultantId,
            @PathVariable String studentId) {
        try {
            mentoringAccessService.assertFacultyConsultantCanAccessStudent(consultantId, studentId);
            return Result.success("ok", true);
        } catch (RuntimeException e) {
            return Result.success("ok", false);
        }
    }
}
