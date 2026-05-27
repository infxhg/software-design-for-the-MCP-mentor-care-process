package com.bnbu.user.Service;

import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.bnbu.user.Common.OperationLogActions;
import com.bnbu.user.Common.RoleCodeEnum;
import com.bnbu.user.DTO.OperationLogVO;
import com.bnbu.user.Entity.SysOperationLog;
import com.bnbu.user.Entity.User;
import com.bnbu.user.Mapper.SysOperationLogMapper;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class OperationLogService extends ServiceImpl<SysOperationLogMapper, SysOperationLog> {

    private static final DateTimeFormatter FORMATTER = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");

    public void record(String userId, String username, String action, String detail) {
        SysOperationLog log = new SysOperationLog();
        log.setUserId(userId);
        log.setUsername(username);
        log.setAction(action);
        log.setDetail(OperationLogSupport.truncateDetail(detail));
        log.setCreateTime(LocalDateTime.now());
        this.save(log);
    }

    public void recordLogin(User user) {
        record(user.getId(), user.getUsername(), OperationLogActions.LOGIN, "User logged in successfully");
    }

    /**
     * 学生登出时写入操作日志（与 LOGIN 对称，便于 Supporting Staff / FC 审计学生活动）。
     */
    public void recordStudentLogout(User user) {
        record(user.getId(), user.getUsername(), OperationLogActions.LOGOUT, "Student logged out successfully");
    }

    public boolean hasStudentRole(java.util.List<String> roleCodes) {
        if (roleCodes == null || roleCodes.isEmpty()) {
            return false;
        }
        String studentCode = RoleCodeEnum.STUDENT.getCode();
        return roleCodes.stream().anyMatch(r -> studentCode.equalsIgnoreCase(r));
    }

    public List<OperationLogVO> search(String userId, String action, String startTime, String endTime) {
        return searchInternal(userId, action, startTime, endTime, null);
    }

    public List<OperationLogVO> searchForUserIds(List<String> userIds, String action, String startTime, String endTime) {
        return searchInternal(null, action, startTime, endTime, userIds);
    }

    private List<OperationLogVO> searchInternal(String userId, String action, String startTime, String endTime,
                                                List<String> userIds) {
        QueryWrapper<SysOperationLog> wrapper = new QueryWrapper<>();
        if (userId != null && !userId.isBlank()) {
            wrapper.eq("user_id", userId.trim());
        }
        if (userIds != null && !userIds.isEmpty()) {
            wrapper.in("user_id", userIds);
        }
        if (action != null && !action.isBlank()) {
            wrapper.like("action", action.trim());
        }
        LocalDateTime start = parseDateTime(startTime);
        LocalDateTime end = parseDateTime(endTime);
        if (start != null) {
            wrapper.ge("create_time", start);
        }
        if (end != null) {
            wrapper.le("create_time", end);
        }
        wrapper.orderByDesc("create_time");
        return this.list(wrapper).stream().map(this::toVO).collect(Collectors.toList());
    }

    private LocalDateTime parseDateTime(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        try {
            return LocalDateTime.parse(value.trim(), FORMATTER);
        } catch (DateTimeParseException e) {
            throw new RuntimeException("Invalid datetime format, expected yyyy-MM-dd HH:mm:ss");
        }
    }

    private OperationLogVO toVO(SysOperationLog log) {
        OperationLogVO vo = new OperationLogVO();
        vo.setId(log.getId());
        vo.setUserId(log.getUserId());
        vo.setUsername(log.getUsername());
        vo.setAction(log.getAction());
        vo.setDetail(log.getDetail());
        vo.setCreateTime(log.getCreateTime());
        return vo;
    }
}
