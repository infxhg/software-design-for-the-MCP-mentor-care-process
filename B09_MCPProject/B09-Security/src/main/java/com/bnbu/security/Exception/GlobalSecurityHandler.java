package com.bnbu.security.Exception;
import lombok.extern.slf4j.Slf4j;

import com.bnbu.security.Utils.CommonUtils.SecurityResult;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice
@Slf4j
public class GlobalSecurityHandler {



    @ExceptionHandler(AccessDeniedException.class)
    public SecurityResult handleAccessDeniedException(AccessDeniedException e){
        return SecurityResult.error(403,"you don't have the permission to access!");
    }

    @ExceptionHandler(Exception.class)
    public SecurityResult handleGlobalException(Exception e){
        log.error("【全局异常】", e);           // 重点：打印完整异常
        e.printStackTrace();                   // 再打印一遍
        return SecurityResult.error("something went wrong");
    }


}
