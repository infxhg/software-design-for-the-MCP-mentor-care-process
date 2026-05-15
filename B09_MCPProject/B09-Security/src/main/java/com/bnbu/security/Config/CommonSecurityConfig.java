package com.bnbu.security.Config;


import com.bnbu.security.Filter.SecurityHeaderFilter;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;

@Configuration
@EnableWebSecurity
@EnableMethodSecurity
public class CommonSecurityConfig {

    @Autowired
    private  SecurityHeaderFilter securityHeaderFilter;



    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http)throws Exception{
        http.csrf(csrf->csrf.disable())
                .sessionManagement(s->s.disable())
                .formLogin(f->f.disable())
                .httpBasic(basic->basic.disable())

                .authorizeHttpRequests(auth -> auth
                        // ====================== 重点修改 ======================
                        // 1. 允许内部服务调用（Feign 调用）
                        .requestMatchers(request ->
                                "true".equalsIgnoreCase(request.getHeader("X-Internal-Call"))
                        ).permitAll()

                        // 2. 登录、注册等公开接口
                        .requestMatchers(
                                "/api/user/register/**",
                                "/api/user/login"
                        ).permitAll()
                        .anyRequest().authenticated())
                .addFilterBefore(securityHeaderFilter, UsernamePasswordAuthenticationFilter.class);
        return http.build();
    }

}
