package com.bnbu.mentoring.DTO;

import lombok.Data;

@Data
public class Result {
    private Integer code;
    private String message;
    private Object data;

    public static Result success() {
        Result result = new Result();
        result.setCode(200);
        result.setMessage("success");
        return result;
    }

    public static Result success(String message, Object data) {
        Result result = new Result();
        result.setCode(200);
        result.setMessage(message);
        result.setData(data);
        return result;
    }

    public static Result error(String message) {
        return fail(500, message);
    }

    /** 业务错误（非 HTTP 500），前端 unwrap 时不应一律当作服务器故障 */
    public static Result fail(int code, String message) {
        Result result = new Result();
        result.setCode(code);
        result.setMessage(message);
        return result;
    }
}
