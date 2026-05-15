package com.bnbu.organizational.Common;

public enum ResultCode {
    SUCCESS(200,"success"),
    FAIL(500,"internal server error"),
    UNAUTHORIZED(401,"unauthorized"),
    NOT_FOUND(404,"not found"),
    INTERNAL_SERVER_ERROR(500,"internal server error");
    private int code;
    private String message;

    ResultCode(int code, String message) {
        this.code = code;
        this.message = message;
    }

    public int getCode() {
        return code;
    }

    public void setCode(int code) {
        this.code = code;
    }

    public String getMessage() {
        return message;
    }

    public void setMessage(String message) {
        this.message = message;
    }
}
