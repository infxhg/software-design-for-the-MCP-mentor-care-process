package com.bnbu.organizational.DTO;



import lombok.Data;
import java.util.List;

/**
 * 用户搜索条件传输对象
 * 用于通过 Feign 调用用户服务时，传递过滤条件
 */
@Data
public class UserSearchInfoDTO {

    /**
     * 角色标识，用于限定查询用户的角色 (例如: "MENTOR")
     */
    private String roleCode;

    /**
     * 模糊搜索关键字，匹配用户的姓名或邮箱 (用于 Faculty Consultant 的全局搜索)
     */
    private String keyword;

    /**
     * 限制搜索范围的 ID 列表 (从组织服务的 sys_user_org 表中查出)
     */
    private List<String> userIds;
}