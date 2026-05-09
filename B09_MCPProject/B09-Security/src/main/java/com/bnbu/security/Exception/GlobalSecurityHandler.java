package com.bnbu.security.Exception;

import com.bnbu.security.Utils.CommonUtils.SecurityResult;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice

public class GlobalSecurityHandler {



    @ExceptionHandler(AccessDeniedException.class)
    public SecurityResult handleAccessDeniedException(AccessDeniedException e){
        return SecurityResult.error(403,"you don't have the permission to access!");
    }

    @ExceptionHandler(Exception.class)
    public SecurityResult handleGlobalException(Exception e){
        return SecurityResult.error(500,"something went wrong");
    }


}
