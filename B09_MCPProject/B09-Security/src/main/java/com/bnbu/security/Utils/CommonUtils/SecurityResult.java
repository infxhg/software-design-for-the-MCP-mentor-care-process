package com.bnbu.security.Utils.CommonUtils;


import com.bnbu.security.Common.SecurityResultCode;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@AllArgsConstructor
@NoArgsConstructor
@Data
public class SecurityResult {
    private int code;
    private String message;
    private Object data;

    public SecurityResult(Object data){
        this.code =200;
        this.message = "success";
        this.data = data;
    }

    public static SecurityResult success(String message, Object data){
        return new SecurityResult(SecurityResultCode.SUCCESS.getCode(),message,data);
    }

    public static SecurityResult success(){
        return new SecurityResult(SecurityResultCode.SUCCESS.getCode(),"success",null);
    }
    public static SecurityResult error(int code, String message){
        return new SecurityResult(code,message,null);
    }

    public static SecurityResult error(String message ){
        return new SecurityResult(SecurityResultCode.FAIL.getCode(),message,null);
    }


}
