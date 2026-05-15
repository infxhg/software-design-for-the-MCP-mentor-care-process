package com.bnbu.organizational.DTO;

import lombok.Data;

/**
 * 用于接收 User-Service 返回的用户基本信息
 */
@Data
public class UserRemoteDTO {
    private String id;        // 对齐用户服务：主键 ID
    private String username;  // 对齐用户服务：登录名
    private String realName;  // 对齐用户服务：真实姓名
    private String email;     // 对齐用户服务：邮箱
    private String phone;// 导师的办公室地址
}