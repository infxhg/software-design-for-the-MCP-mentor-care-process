package com.bnbu.user.Interceptor;

import feign.RequestInterceptor;
import feign.RequestTemplate;
import org.springframework.stereotype.Component;

/**
 * User-Service 发起 Feign 内部调用时注入内部标记头，
 * 使下游服务的 SecurityHeaderFilter 按内部请求放行。
 */
@Component
public class FeignInternalHeaderInterceptor implements RequestInterceptor {

    @Override
    public void apply(RequestTemplate template) {
        template.header("X-Internal-Call", "true");
        template.header("X-From-Service", "user-service");
    }
}
