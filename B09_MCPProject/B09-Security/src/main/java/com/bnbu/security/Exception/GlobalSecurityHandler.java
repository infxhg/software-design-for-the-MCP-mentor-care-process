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
        log.error("【全局异常】", e);
        String detail = e.getMessage() != null ? e.getMessage() : e.getClass().getSimpleName();
        Throwable root = e;
        while (root.getCause() != null) {
            root = root.getCause();
        }
        if (root.getMessage() != null && !root.getMessage().equals(detail)) {
            detail = detail + " | " + root.getMessage();
        }
        return SecurityResult.error("something went wrong: " + detail);
    }


}
