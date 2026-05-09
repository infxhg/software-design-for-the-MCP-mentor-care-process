package com.bnbu.security.Filter;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.awt.*;
import java.io.IOException;

import java.util.Collections;
import java.util.Set;
import java.util.stream.Collectors;

@Component
public class SecurityHeaderFilter extends OncePerRequestFilter{

    @Autowired
    StringRedisTemplate redisTemplate;


    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain) throws ServletException, IOException {



        String userId = request.getHeader("X-User-Id");
        System.out.println("【安全过滤器启动】正在拦截请求: " + request.getRequestURI());
        System.out.println("【安全过滤器】提取到的 X-User-Id 是: " + userId);
        if(userId != null && !userId.isEmpty()){

            String reidsKey = "auth:perms:" + userId;
            Set<String> permissions = Collections.emptySet();

            try{
                permissions = redisTemplate.opsForSet().members(reidsKey);
            }catch(Exception e){
                logger.error("fail to get permissions");
            }

            java.util.List<SimpleGrantedAuthority> authorities =null;
            if(permissions != null && !permissions.isEmpty()){
                authorities = permissions.stream().map(SimpleGrantedAuthority::new).collect(Collectors.toList());
            }else{
                authorities = Collections.emptyList();
            }

            UsernamePasswordAuthenticationToken authenticationToken = new UsernamePasswordAuthenticationToken(userId,null,authorities);
            SecurityContextHolder.getContext().setAuthentication(authenticationToken);
            System.out.println("【权限比对监控】当前用户 ID: " + userId);
            System.out.println("【权限比对监控】内存中的权限列表: " +
                    SecurityContextHolder.getContext().getAuthentication().getAuthorities());

        }
        filterChain.doFilter(request,response);
    }



}