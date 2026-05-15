package com.bnbu.organizational;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.cloud.client.discovery.EnableDiscoveryClient;
import org.springframework.cloud.openfeign.EnableFeignClients;

/**
 * 组织服务启动类
 * 负责管理 Faculty, Department, Major 等组织架构及人员分配
 */
@SpringBootApplication(scanBasePackages = {"com.bnbu.organizational", "com.bnbu.security"})
@EnableDiscoveryClient // 开启 Nacos 服务注册与发现
@EnableFeignClients(basePackages = "com.bnbu.organizational.OpenFeign") // 扫描 Feign 接口包路径，根据你的实际情况修改
public class OrganizationApplication {

    public static void main(String[] args) {
        SpringApplication.run(OrganizationApplication.class, args);
    }
}