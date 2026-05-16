package com.bnbu.mentoring.Interceptor;

import feign.RequestInterceptor;
import feign.RequestTemplate;
import org.springframework.stereotype.Component;

/**
 * Feign 发出请求时自动添加内部调用标记头
 * B09-Security 的 CommonSecurityConfig / SecurityHeaderFilter 检测到
 * X-Internal-Call: true 后会直接放行，不做 JWT 鉴权
 */
@Component
public class FeignInternalHeaderInterceptor implements RequestInterceptor {

    @Override
    public void apply(RequestTemplate template) {
        template.header("X-Internal-Call", "true");
        template.header("X-From-Service", "mentoring-service");
    }
}
