package com.bnbu.gateway.Filters;

import com.bnbu.gateway.JwtUtils.JwtUtils;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletRequestWrapper;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.Collections;
import java.util.Enumeration;
import java.util.List;

@Component
public class AuthFilter extends OncePerRequestFilter {

    private final JwtUtils jwtUtils;

    // 构造器注入
    public AuthFilter(JwtUtils jwtUtils) {
        this.jwtUtils = jwtUtils;
    }

    // 白名单路径
    private static final List<String> WHITE_LIST = List.of(
            "/api/user/register",
            "/api/user/verify",
            "/api/user/login"
    );

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain) throws ServletException, IOException {

        String path = request.getRequestURI();

        // 1. 白名单直接放行
        if (WHITE_LIST.stream().anyMatch(path::startsWith)) {
            filterChain.doFilter(request, response);
            return;
        }

        // 2. 提取 Authorization Header
        String authHeader = request.getHeader("Authorization");
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            response.sendError(HttpStatus.UNAUTHORIZED.value(), "Missing or invalid Token");
            return;
        }

        String realToken = authHeader.substring(7);

        try {
            // 3. 校验并解析 Token
            String userId = jwtUtils.getUserIdFromToken(realToken);

            // 4. 使用 Wrapper 向下游传递 X-User-Id
            // 在 Servlet 模型中，Request 是只读的，必须通过包装器重写 getHeader 方法
            HttpServletRequest wrappedRequest = new HttpServletRequestWrapper(request) {
                @Override
                public String getHeader(String name) {
                    if ("X-User-Id".equalsIgnoreCase(name)) {
                        return userId;
                    }
                    return super.getHeader(name);
                }

                @Override
                public Enumeration<String> getHeaders(String name) {
                    if ("X-User-Id".equalsIgnoreCase(name)) {
                        return Collections.enumeration(Collections.singletonList(userId));
                    }
                    return super.getHeaders(name);
                }

                @Override
                public Enumeration<String> getHeaderNames() {
                    List<String> names = Collections.list(super.getHeaderNames());
                    if (!names.contains("X-User-Id")) {
                        names.add("X-User-Id");
                    }
                    return Collections.enumeration(names);
                }
            };

            // 5. 将包装后的请求传给后续的过滤器和下游微服务
            filterChain.doFilter(wrappedRequest, response);

        } catch (Exception e) {
            // 解析失败（过期或伪造）
            response.sendError(HttpStatus.UNAUTHORIZED.value(), "Invalid Token");
        }
    }
}
