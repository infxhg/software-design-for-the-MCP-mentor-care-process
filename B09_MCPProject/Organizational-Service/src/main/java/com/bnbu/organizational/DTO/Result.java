package com.bnbu.organizational.DTO;


import com.bnbu.organizational.Common.ResultCode;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@AllArgsConstructor
@NoArgsConstructor
@Data
public class Result {
    private int code;
    private String message;
    private Object data;

    public Result(Object data){
        this.code =200;
        this.message = "success";
        this.data = data;
    }

    public static Result success(String message, Object data){
        return new Result(ResultCode.SUCCESS.getCode(),message,data);
    }

    public static Result success(){
        return new Result(ResultCode.SUCCESS.getCode(),"success",null);
    }
    public static Result error(int code,String message){
        return new Result(code,message,null);
    }

    public static Result error(String message ){
        return new Result (ResultCode.FAIL.getCode(),message,null);
    }


}
