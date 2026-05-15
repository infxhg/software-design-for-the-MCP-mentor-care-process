package com.bnbu.user.DTO;

import lombok.Data;
import java.util.List;

public class UserSearchDTO {
    // 角色标识，固定传 "MENTOR"
    private String roleCode;
    // 模糊搜索关键字（匹配姓名或邮箱），可为空
    private String keyword; 
    // 限制搜索范围的 ID 列表
    private List<String> userIds; 

    public String getRoleCode() { return roleCode; }
    public void setRoleCode(String roleCode) { this.roleCode = roleCode; }

    public String getKeyword() { return keyword; }
    public void setKeyword(String keyword) { this.keyword = keyword; }

    public List<String> getUserIds() { return userIds; }
    public void setUserIds(List<String> userIds) { this.userIds = userIds; }
}
