package com.bnbu.organizational.Controller;

import com.bnbu.organizational.DTO.CreateOrgUnitRequest;
import com.bnbu.organizational.DTO.OrgUnitVO;
import com.bnbu.organizational.DTO.Result;
import com.bnbu.organizational.DTO.UpdateOrgUnitRequest;
import com.bnbu.organizational.Service.AdminOrgService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

/**
 * Administrator：学院/系/专业组织架构管理（RB-ADM-02 ~ RB-ADM-04 / F-07）
 */
@RestController
@RequestMapping("/api/org/admin/units")
@RequiredArgsConstructor
@PreAuthorize("hasAuthority('ROLE_ADMIN')")
public class AdminOrgController {

    private final AdminOrgService adminOrgService;

    @GetMapping
    public Result listAll() {
        List<OrgUnitVO> list = adminOrgService.listAll();
        return Result.success("Successfully fetched org units", list);
    }

    @GetMapping("/{id}")
    public Result getById(@PathVariable String id) {
        return Result.success("Successfully fetched org unit", adminOrgService.getById(id));
    }

    @PostMapping
    public Result create(@Valid @RequestBody CreateOrgUnitRequest request) {
        OrgUnitVO created = adminOrgService.create(request);
        return Result.success("Org unit created successfully", created);
    }

    @PutMapping("/{id}")
    public Result update(@PathVariable String id, @Valid @RequestBody UpdateOrgUnitRequest request) {
        OrgUnitVO updated = adminOrgService.update(id, request);
        return Result.success("Org unit updated successfully", updated);
    }

    @DeleteMapping("/{id}")
    public Result delete(@PathVariable String id) {
        adminOrgService.delete(id);
        return Result.success("Org unit deleted successfully", null);
    }

    @PostMapping("/import-excel")
    public Result importExcel(@RequestParam("file") MultipartFile file) {
        int count = adminOrgService.importFromExcel(file);
        return Result.success("Org structure imported successfully, processed rows: " + count, count);
    }
}
