package com.bnbu.organizational.OpenFeign;


import com.alibaba.nacos.api.model.v2.Result;
import com.bnbu.organizational.DTO.RecordOperationLogRequest;
import com.bnbu.organizational.DTO.EnsureUserRequest;
import com.bnbu.organizational.DTO.UserSearchDTO;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;

// name 必须是 user-service 注册在 Nacos 中的微服务名称
@FeignClient(name = "user-service")
public interface UserFeignClient {

    /**
     * 对应接口路径: /api/user/search/by-conditions
     */
    @PostMapping("/api/user/search/by-conditions")
    Result searchUsersByConditions(@RequestBody UserSearchDTO searchDTO);

    /**
     * 根据学生 ID 精确查询单个学生信息
     */
    @GetMapping("/api/user/internal/student/{studentId}")
    Result getStudentById(@PathVariable("studentId") String studentId);

    @GetMapping("/api/user/internal/user/{userId}")
    Result getUserById(@PathVariable("userId") String userId);

    @PostMapping("/api/user/internal/operation-log")
    Result recordOperationLog(@RequestBody RecordOperationLogRequest request);

    @PostMapping("/api/user/internal/ensure-user")
    Result ensureUser(@RequestBody EnsureUserRequest request);
}