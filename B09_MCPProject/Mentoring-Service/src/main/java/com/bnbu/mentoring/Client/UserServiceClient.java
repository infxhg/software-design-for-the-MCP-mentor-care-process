package com.bnbu.mentoring.Client;

import com.bnbu.mentoring.DTO.EnsureUserRequest;
import com.bnbu.mentoring.DTO.Result;
import com.bnbu.mentoring.DTO.UserSearchRequestDTO;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;

/**
 * Feign 客户端：调用 User-Service 的用户搜索接口
 */
@FeignClient(name = "user-service", path = "/api/user")
public interface UserServiceClient {

    /**
     * 在指定的 ID 范围内，根据角色和关键字模糊搜索用户
     */
    @PostMapping("/search/by-conditions")
    Result searchUsersByConditions(@RequestBody UserSearchRequestDTO searchDTO);

    @PostMapping("/internal/ensure-user")
    Result ensureUser(@RequestBody EnsureUserRequest request);

    @GetMapping("/internal/user/{userId}")
    Result getUserById(@PathVariable("userId") String userId);

    /** 校验学生存在且为 STUDENT 角色（供加组成员等内部流程） */
    @GetMapping("/internal/student/{studentId}")
    Result getStudentById(@PathVariable("studentId") String studentId);

    @PostMapping("/internal/notify-email")
    Result notifyEmail(@RequestBody com.bnbu.mentoring.DTO.NotifyEmailRequest request);

    @PostMapping("/internal/operation-log")
    Result recordOperationLog(@RequestBody com.bnbu.mentoring.DTO.RecordOperationLogRequest request);
}
