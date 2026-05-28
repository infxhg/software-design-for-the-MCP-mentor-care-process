package com.bnbu.user.client;

import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;

import java.util.List;
import java.util.Map;

@FeignClient(name = "mentoring-service", contextId = "mentoringInternalAccessUser")
public interface MentoringInternalAccessClient {

    @PostMapping("/api/mentoring/internal/access/faculty-consultant/{consultantId}/filter-student-ids")
    Map<String, Object> filterStudentIdsForFacultyConsultant(
            @PathVariable("consultantId") String consultantId,
            @RequestBody List<String> studentIds);
}
