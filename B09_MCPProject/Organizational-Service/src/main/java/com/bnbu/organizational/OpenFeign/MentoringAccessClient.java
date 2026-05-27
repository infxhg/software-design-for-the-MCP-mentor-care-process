package com.bnbu.organizational.OpenFeign;

import com.bnbu.organizational.DTO.Result;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;

import java.util.List;

@FeignClient(name = "mentoring-service", contextId = "mentoringServiceClient")
public interface MentoringAccessClient {

    @GetMapping("/api/mentoring/internal/access/mentor/{mentorId}/student/{studentId}")
    Result mentorCanAccessStudent(
            @PathVariable("mentorId") String mentorId,
            @PathVariable("studentId") String studentId);

    @GetMapping("/api/mentoring/internal/access/faculty-consultant/{consultantId}/student/{studentId}")
    Result facultyConsultantCanAccessStudent(
            @PathVariable("consultantId") String consultantId,
            @PathVariable("studentId") String studentId);

    @GetMapping("/api/mentoring/internal/student-ext/{studentId}")
    Result getStudentExt(@PathVariable("studentId") String studentId);

    @PostMapping("/api/mentoring/internal/student-ext/batch")
    Result batchGetStudentExt(@RequestBody List<String> studentIds);
}
