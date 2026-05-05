package com.bnbu.user.Security;

import com.bnbu.user.Entity.User;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;
import com.fasterxml.jackson.annotation.JsonIgnore;

import java.util.Collection;
import java.util.List;
import java.util.stream.Collectors;

public class LoginUser implements UserDetails {

    // 真正的数据库用户实体
    private User user;

    // 用户的权限标识集合（如 "user:list", "appointment:create"）
    private List<String> permissions;

    // 用户的组织架构挂载点（用于数据权限过滤）
    private String orgPath;

    public LoginUser() {
    }

    public LoginUser(User user, List<String> permissions, String orgPath) {
        this.user = user;
        this.permissions = permissions;
        this.orgPath = orgPath;
    }

    // 将权限标识转换为 Spring Security 认识的 GrantedAuthority
    @Override
    @JsonIgnore // 防止序列化时报错或暴露过多细节
    public Collection<? extends GrantedAuthority> getAuthorities() {
        if (permissions == null || permissions.isEmpty()) {
            return null;
        }
        return permissions.stream()
                .map(SimpleGrantedAuthority::new)
                .collect(Collectors.toList());
    }

    @Override
    @JsonIgnore
    public String getPassword() {
        return user.getPasswordHash(); // 映射你的数据库字段
    }

    @Override
    public String getUsername() {
        return user.getUsername();
    }

    // 账号是否未过期
    @Override
    @JsonIgnore
    public boolean isAccountNonExpired() {
        return true;
    }

    // 账号是否未被锁定
    @Override
    @JsonIgnore
    public boolean isAccountNonLocked() {
        return user.getStatus() == 1; // 结合你的表设计：状态: 0禁用 1启用
    }

    // 密码是否未过期
    @Override
    @JsonIgnore
    public boolean isCredentialsNonExpired() {
        return true;
    }

    // 账号是否可用
    @Override
    @JsonIgnore
    public boolean isEnabled() {
        return user.getStatus() == 1 && user.getIsDeleted() == 0;
    }

    // Getter 暴露给业务层获取原始数据
    public User getUser() {
        return user;
    }

    public String getOrgPath() {
        return orgPath;
    }
}