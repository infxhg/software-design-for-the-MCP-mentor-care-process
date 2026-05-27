package com.bnbu.user.Controller;

import com.bnbu.user.DTO.CreateFacultyConsultantRequest;
import com.bnbu.user.DTO.FacultyConsultantVO;
import com.bnbu.user.DTO.Result;
import com.bnbu.user.DTO.UpdateFacultyConsultantRequest;
import com.bnbu.user.Service.UserServiceIterface;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * Administrator：Faculty Consultant 增删改查
 */
@RestController
@RequestMapping("/api/user/admin/faculty-consultants")
@PreAuthorize("hasAuthority('ROLE_ADMIN')")
public class AdminFacultyConsultantController {

    @Autowired
    private UserServiceIterface userService;

    @GetMapping
    public Result listAll() {
        List<FacultyConsultantVO> list = userService.listAllFacultyConsultants();
        return Result.success("Successfully fetched faculty consultants", list);
    }

    @GetMapping("/{id}")
    public Result getById(@PathVariable String id) {
        FacultyConsultantVO vo = userService.getFacultyConsultantById(id);
        if (vo == null) {
            return Result.error("Faculty consultant not found");
        }
        return Result.success("Successfully fetched faculty consultant", vo);
    }

    @PostMapping
    public Result create(@Valid @RequestBody CreateFacultyConsultantRequest request) {
        FacultyConsultantVO created = userService.createFacultyConsultant(request);
        return Result.success("Faculty consultant created successfully", created);
    }

    @PutMapping("/{id}")
    public Result update(@PathVariable String id, @Valid @RequestBody UpdateFacultyConsultantRequest request) {
        FacultyConsultantVO updated = userService.updateFacultyConsultant(id, request);
        return Result.success("Faculty consultant updated successfully", updated);
    }

    @DeleteMapping("/{id}")
    public Result delete(@PathVariable String id) {
        userService.deleteFacultyConsultant(id);
        return Result.success("Faculty consultant deleted successfully", null);
    }
}
