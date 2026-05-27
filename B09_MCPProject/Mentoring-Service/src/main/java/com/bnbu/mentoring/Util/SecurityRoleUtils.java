package com.bnbu.mentoring.Util;

import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;

import java.util.Set;
import java.util.stream.Collectors;

public final class SecurityRoleUtils {

    private static final String[] PRIORITY = {
            "MENTOR", "COORDINATOR", "FACULTY_CONSULTANT", "ADMIN", "STUDENT"
    };

    private SecurityRoleUtils() {
    }

    public static String primaryRoleCode() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null) {
            return "";
        }
        Set<String> roles = auth.getAuthorities().stream()
                .map(GrantedAuthority::getAuthority)
                .filter(a -> a.startsWith("ROLE_"))
                .map(a -> a.substring(5))
                .collect(Collectors.toSet());
        for (String code : PRIORITY) {
            if (roles.contains(code)) {
                return code;
            }
        }
        return roles.stream().findFirst().orElse("");
    }
}
