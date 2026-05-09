package com.bnbu.security.Config;


import com.bnbu.security.Filter.SecurityHeaderFilter;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.ComponentScan;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

@Configuration
@EnableWebSecurity
//@EnableMethodSecurity
@ComponentScan("Filter")
public class CommonSecurityConfig {

    @Autowired
    private  SecurityHeaderFilter securityHeaderFilter;



    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http)throws Exception{
        http.csrf(csrf->csrf.disable())
                .sessionManagement(s->s.disable())
                .formLogin(f->f.disable())
                .httpBasic(basic->basic.disable())

                .authorizeHttpRequests(auth->auth.requestMatchers(
                                "/api/user/register",
                                "/api/user/verify",
                                "/api/user/login"
                        ).permitAll()
                        .anyRequest().authenticated())
                .addFilterBefore(securityHeaderFilter, UsernamePasswordAuthenticationFilter.class);
        return http.build();
    }

}
