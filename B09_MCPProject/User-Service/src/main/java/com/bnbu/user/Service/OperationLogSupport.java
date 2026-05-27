package com.bnbu.user.Service;

import org.springframework.util.StringUtils;

/**
 * 操作日志辅助：详情截断等。
 */
public final class OperationLogSupport {

    private static final int MAX_DETAIL_LEN = 500;

    private OperationLogSupport() {
    }

    public static String truncateDetail(String detail) {
        if (!StringUtils.hasText(detail)) {
            return "";
        }
        String text = detail.trim();
        return text.length() <= MAX_DETAIL_LEN ? text : text.substring(0, MAX_DETAIL_LEN);
    }
}
