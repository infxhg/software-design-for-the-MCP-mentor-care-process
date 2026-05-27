package com.bnbu.organizational.Service;

import com.alibaba.nacos.api.model.v2.Result;
import com.bnbu.organizational.DTO.RecordOperationLogRequest;
import com.bnbu.organizational.OpenFeign.UserFeignClient;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.util.Map;

@Service
@RequiredArgsConstructor
public class OperationLogRecorder {

    private static final int MAX_DETAIL_LEN = 500;

    private final UserFeignClient userFeignClient;

    public void recordQuiet(String userId, String username, String action, String detail) {
        if (!StringUtils.hasText(userId) || !StringUtils.hasText(action)) {
            return;
        }
        RecordOperationLogRequest req = new RecordOperationLogRequest();
        req.setUserId(userId.trim());
        req.setUsername(StringUtils.hasText(username) ? username.trim() : userId.trim());
        req.setAction(action.trim());
        req.setDetail(truncate(detail));
        try {
            userFeignClient.recordOperationLog(req);
        } catch (Exception ignored) {
            // 日志失败不阻断业务
        }
    }

    public void recordQuiet(String userId, String action, String detail) {
        recordQuiet(userId, userId, action, detail);
    }

    public String resolveUsername(String userId) {
        if (!StringUtils.hasText(userId)) {
            return userId;
        }
        try {
            Result res = userFeignClient.getUserById(userId.trim());
            if (res != null && res.getCode() == 200 && res.getData() instanceof Map<?, ?> map) {
                Object username = map.get("username");
                if (username != null && StringUtils.hasText(String.valueOf(username))) {
                    return String.valueOf(username);
                }
                Object realName = map.get("realName");
                if (realName != null && StringUtils.hasText(String.valueOf(realName))) {
                    return String.valueOf(realName);
                }
            }
        } catch (Exception ignored) {
            // fall through
        }
        return userId.trim();
    }

    private static String truncate(String detail) {
        if (!StringUtils.hasText(detail)) {
            return "";
        }
        String text = detail.trim();
        return text.length() <= MAX_DETAIL_LEN ? text : text.substring(0, MAX_DETAIL_LEN);
    }
}
