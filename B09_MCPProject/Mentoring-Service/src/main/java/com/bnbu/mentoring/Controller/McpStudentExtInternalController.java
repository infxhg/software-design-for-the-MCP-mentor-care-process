package com.bnbu.mentoring.Controller;

import com.bnbu.mentoring.DTO.Result;
import com.bnbu.mentoring.DTO.StudentExtRemoteView;
import com.bnbu.mentoring.Entity.McpStudentExt;
import com.bnbu.mentoring.Service.McpGroupService;
import com.bnbu.mentoring.Service.McpStudentExtService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/mentoring/internal/student-ext")
@RequiredArgsConstructor
public class McpStudentExtInternalController {

    private final McpStudentExtService mcpStudentExtService;
    private final McpGroupService mcpGroupService;

    @GetMapping("/{studentId}")
    @PreAuthorize("permitAll()")
    public Result getByStudentId(@PathVariable String studentId) {
        if (studentId == null || studentId.isBlank()) {
            return Result.error("studentId is required");
        }
        McpStudentExt ext = mcpStudentExtService.getById(studentId.trim());
        if (ext == null) {
            return Result.success("success", null);
        }
        return Result.success("success", toRemoteView(ext));
    }

    @PostMapping("/batch")
    @PreAuthorize("permitAll()")
    public Result batchGet(@RequestBody List<String> studentIds) {
        if (studentIds == null || studentIds.isEmpty()) {
            return Result.success("success", List.of());
        }
        List<StudentExtRemoteView> list = new ArrayList<>();
        Map<String, McpStudentExt> seen = new LinkedHashMap<>();
        for (String id : studentIds) {
            if (id == null || id.isBlank()) {
                continue;
            }
            String sid = id.trim();
            if (seen.containsKey(sid)) {
                continue;
            }
            McpStudentExt ext = mcpStudentExtService.getById(sid);
            if (ext != null) {
                seen.put(sid, ext);
            }
        }
        for (McpStudentExt ext : seen.values()) {
            list.add(toRemoteView(ext));
        }
        return Result.success("success", list);
    }

    private StudentExtRemoteView toRemoteView(McpStudentExt ext) {
        StudentExtRemoteView view = new StudentExtRemoteView();
        view.setStudentId(ext.getStudentId());
        view.setStatus(ext.getStatus());
        view.setGroupId(ext.getGroupId());
        view.setGroupKey(ext.getGroupKey());
        view.setMajorId(mcpGroupService.resolveMajorDisplayNameForStudent(ext));
        return view;
    }
}
