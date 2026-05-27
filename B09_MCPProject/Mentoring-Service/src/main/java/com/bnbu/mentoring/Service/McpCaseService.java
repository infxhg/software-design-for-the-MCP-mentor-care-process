package com.bnbu.mentoring.Service;

import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.bnbu.mentoring.Client.UserServiceClient;
import com.bnbu.mentoring.Common.CaseStatus;
import com.bnbu.mentoring.DTO.NotifyEmailRequest;
import com.bnbu.mentoring.DTO.Result;
import com.bnbu.mentoring.DTO.UserSearchRequestDTO;
import com.bnbu.mentoring.Entity.McpCase;
import com.bnbu.mentoring.Mapper.McpCaseMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class McpCaseService extends ServiceImpl<McpCaseMapper, McpCase> {

    private final MentoringAccessService mentoringAccessService;
    private final UserServiceClient userServiceClient;

    @Transactional
    public McpCase submitByMentor(String mentorId, String studentId, String description, String coordinatorId) {
        if (!StringUtils.hasText(description)) {
            throw new RuntimeException("Case description cannot be empty");
        }
        if (!StringUtils.hasText(coordinatorId)) {
            throw new RuntimeException("Coordinator is required");
        }
        mentoringAccessService.assertMentorOwnsStudent(mentorId, studentId);
        if (!userHasRole(coordinatorId, "COORDINATOR")) {
            throw new RuntimeException("Target user is not a valid MCP coordinator");
        }

        McpCase mcpCase = new McpCase();
        mcpCase.setStudentId(studentId);
        mcpCase.setSubmitterId(mentorId);
        mcpCase.setCoordinatorId(coordinatorId);
        mcpCase.setDescription(description.trim());
        mcpCase.setStatus(CaseStatus.AT_COORDINATOR);
        mcpCase.setCreateTime(LocalDateTime.now());
        mcpCase.setUpdateTime(LocalDateTime.now());
        this.save(mcpCase);

        notifyUser(coordinatorId, "[MCS] New case forwarded to you",
                "A mentor has forwarded a student case. Case ID: " + mcpCase.getCaseId());
        return mcpCase;
    }

    @Transactional
    public McpCase forwardToConsultant(String caseId, String coordinatorId, String consultantId) {
        if (!StringUtils.hasText(consultantId)) {
            throw new RuntimeException("Faculty consultant is required");
        }
        McpCase mcpCase = this.getById(caseId);
        if (mcpCase == null) {
            throw new RuntimeException("Case not found");
        }
        if (!coordinatorId.equals(mcpCase.getCoordinatorId())) {
            throw new RuntimeException("无权转发：您不是该案例的负责协调员");
        }
        if (!CaseStatus.AT_COORDINATOR.equals(mcpCase.getStatus())) {
            throw new RuntimeException("案例当前状态不允许转发至院级顾问: " + mcpCase.getStatus());
        }
        if (!userHasRole(consultantId, "FACULTY_CONSULTANT")) {
            throw new RuntimeException("Target user is not a valid faculty consultant");
        }

        mcpCase.setConsultantId(consultantId);
        mcpCase.setStatus(CaseStatus.AT_CONSULTANT);
        mcpCase.setUpdateTime(LocalDateTime.now());
        this.updateById(mcpCase);

        notifyUser(consultantId, "[MCS] Case forwarded to faculty consultant",
                "Coordinator forwarded case " + caseId + " for your review.");
        return mcpCase;
    }

    @Transactional
    public McpCase closeCase(String caseId, String operatorId, String role) {
        McpCase mcpCase = requireCaseForOperator(caseId, operatorId, role);
        if (CaseStatus.CLOSED.equals(mcpCase.getStatus()) || CaseStatus.REJECTED.equals(mcpCase.getStatus())) {
            throw new RuntimeException("案例已结束");
        }
        mcpCase.setStatus(CaseStatus.CLOSED);
        mcpCase.setUpdateTime(LocalDateTime.now());
        this.updateById(mcpCase);
        return mcpCase;
    }

    @Transactional
    public McpCase rejectCase(String caseId, String coordinatorId) {
        McpCase mcpCase = this.getById(caseId);
        if (mcpCase == null) {
            throw new RuntimeException("Case not found");
        }
        if (!coordinatorId.equals(mcpCase.getCoordinatorId())) {
            throw new RuntimeException("无权驳回：您不是该案例的负责协调员");
        }
        if (!CaseStatus.AT_COORDINATOR.equals(mcpCase.getStatus())) {
            throw new RuntimeException("仅待协调员处理的案例可驳回");
        }
        mcpCase.setStatus(CaseStatus.REJECTED);
        mcpCase.setUpdateTime(LocalDateTime.now());
        this.updateById(mcpCase);
        notifyUser(mcpCase.getSubmitterId(), "[MCS] Case rejected",
                "Your case " + caseId + " was rejected by the coordinator.");
        return mcpCase;
    }

    public List<McpCase> listForUser(String userId, String role) {
        if ("MENTOR".equals(role)) {
            return this.lambdaQuery().eq(McpCase::getSubmitterId, userId).orderByDesc(McpCase::getCreateTime).list();
        }
        if ("COORDINATOR".equals(role)) {
            return this.lambdaQuery().eq(McpCase::getCoordinatorId, userId).orderByDesc(McpCase::getCreateTime).list();
        }
        if ("FACULTY_CONSULTANT".equals(role)) {
            return this.lambdaQuery().eq(McpCase::getConsultantId, userId).orderByDesc(McpCase::getCreateTime).list();
        }
        return List.of();
    }

    private McpCase requireCaseForOperator(String caseId, String operatorId, String role) {
        McpCase mcpCase = this.getById(caseId);
        if (mcpCase == null) {
            throw new RuntimeException("Case not found");
        }
        if ("COORDINATOR".equals(role) && operatorId.equals(mcpCase.getCoordinatorId())) {
            return mcpCase;
        }
        if ("FACULTY_CONSULTANT".equals(role) && operatorId.equals(mcpCase.getConsultantId())) {
            return mcpCase;
        }
        throw new RuntimeException("无权操作该案例");
    }

    private boolean userHasRole(String userId, String roleCode) {
        UserSearchRequestDTO dto = new UserSearchRequestDTO();
        dto.setRoleCode(roleCode);
        dto.setUserIds(List.of(userId));
        try {
            Result res = userServiceClient.searchUsersByConditions(dto);
            if (res == null || res.getData() == null) {
                return false;
            }
            if (res.getData() instanceof List<?> list) {
                return !list.isEmpty();
            }
        } catch (Exception ignored) {
            // fall through
        }
        return false;
    }

    private void notifyUser(String userId, String subject, String body) {
        String email = resolveEmail(userId);
        if (!StringUtils.hasText(email)) {
            return;
        }
        NotifyEmailRequest req = new NotifyEmailRequest();
        req.setTo(email);
        req.setSubject(subject);
        req.setBody(body);
        try {
            userServiceClient.notifyEmail(req);
        } catch (Exception ignored) {
            // demo: 邮件失败不阻断主流程
        }
    }

    private String resolveEmail(String userId) {
        try {
            Result res = userServiceClient.getUserById(userId);
            if (res == null || res.getData() == null) {
                return null;
            }
            if (res.getData() instanceof Map<?, ?> map) {
                Object email = map.get("email");
                return email != null ? String.valueOf(email) : null;
            }
        } catch (Exception ignored) {
            // ignore
        }
        return null;
    }
}
