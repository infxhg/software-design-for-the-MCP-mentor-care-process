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
 * Administrator：Supporting Staff 增删改查（RB-ADM-08 / RB-ADM-09）
 */
@RestController
@RequestMapping("/api/user/admin/supporting-staff")
@PreAuthorize("hasAuthority('ROLE_ADMIN')")
public class AdminSupportingStaffController {

    @Autowired
    private UserServiceIterface userService;

    @GetMapping
    public Result listAll() {
        List<FacultyConsultantVO> list = userService.listAllSupportingStaff();
        return Result.success("Successfully fetched supporting staff", list);
    }

    @GetMapping("/{id}")
    public Result getById(@PathVariable String id) {
        FacultyConsultantVO vo = userService.getSupportingStaffById(id);
        return Result.success("Successfully fetched supporting staff", vo);
    }

    @PostMapping
    public Result create(@Valid @RequestBody CreateFacultyConsultantRequest request) {
        FacultyConsultantVO created = userService.createSupportingStaff(request);
        return Result.success("Supporting staff created successfully", created);
    }

    @PutMapping("/{id}")
    public Result update(@PathVariable String id, @Valid @RequestBody UpdateFacultyConsultantRequest request) {
        FacultyConsultantVO updated = userService.updateSupportingStaff(id, request);
        return Result.success("Supporting staff updated successfully", updated);
    }

    @DeleteMapping("/{id}")
    public Result delete(@PathVariable String id) {
        userService.deleteSupportingStaff(id);
        return Result.success("Supporting staff deleted successfully", null);
    }
}
