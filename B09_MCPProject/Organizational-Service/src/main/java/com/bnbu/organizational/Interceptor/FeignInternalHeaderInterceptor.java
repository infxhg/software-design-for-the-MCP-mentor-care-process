package com.bnbu.organizational.Interceptor;

import feign.RequestInterceptor;
import feign.RequestTemplate;
import org.springframework.stereotype.Component;

@Component
public class FeignInternalHeaderInterceptor implements RequestInterceptor {

    @Override
    public void apply(RequestTemplate template) {
        template.header("X-Internal-Call", "true");           // 内部调用标记
        template.header("X-From-Service", "organizational-service");
    }
}