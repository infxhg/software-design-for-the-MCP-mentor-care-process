package com.bnbu.mentoring.Client;

import com.bnbu.mentoring.DTO.Result;
import com.bnbu.mentoring.DTO.UserSearchRequestDTO;
import org.springframework.cloud.openfeign.FeignClient;
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
}
