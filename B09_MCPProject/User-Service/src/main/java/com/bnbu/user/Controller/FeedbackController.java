package com.bnbu.user.Controller;

import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.bnbu.user.DTO.FeedbackSubmitRequest;
import com.bnbu.user.DTO.Result;
import com.bnbu.user.Entity.Feedback;
import com.bnbu.user.Mapper.FeedbackMapper;
import org.springframework.http.MediaType;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;

@RestController
@RequestMapping("/api/user/feedback")
public class FeedbackController extends ServiceImpl<FeedbackMapper, Feedback> {

    /**
     * 提交反馈（任意已登录角色，含 Faculty Consultant）
     * POST /api/user/feedback
     * Content-Type: application/json
     * Body: {"content":"反馈内容"}
     */
    @PostMapping(consumes = MediaType.APPLICATION_JSON_VALUE)
    public Result submitJson(
            @RequestHeader(value = "X-User-Id", required = false) String userId,
            @RequestBody(required = false) FeedbackSubmitRequest request) {
        return doSubmit(userId, request != null ? request.getContent() : null);
    }

    /**
     * 兼容 Postman / 表单：application/x-www-form-urlencoded 或 form-data 字段 content
     */
    @PostMapping(consumes = {MediaType.APPLICATION_FORM_URLENCODED_VALUE, MediaType.MULTIPART_FORM_DATA_VALUE})
    public Result submitForm(
            @RequestHeader(value = "X-User-Id", required = false) String userId,
            @RequestParam(value = "content", required = false) String content) {
        return doSubmit(userId, content);
    }

    private Result doSubmit(String userId, String content) {
        if (!StringUtils.hasText(userId)) {
            return Result.error("未获取到用户ID，请通过网关访问并携带 Authorization: Bearer {token}");
        }
        if (!StringUtils.hasText(content)) {
            return Result.error(
                    "Feedback content cannot be empty. Use JSON body: {\"content\":\"your message\"} "
                            + "or form field content=...");
        }
        Feedback feedback = new Feedback();
        feedback.setUserId(userId.trim());
        feedback.setContent(content.trim());
        feedback.setCreateTime(LocalDateTime.now());
        this.save(feedback);
        return Result.success("Feedback submitted successfully", feedback);
    }

    @GetMapping
    @PreAuthorize("hasAuthority('ROLE_ADMIN') or hasAuthority('ROLE_SUPPORT_STAFF')")
    public Result listAll() {
        List<Feedback> list = this.lambdaQuery().orderByDesc(Feedback::getCreateTime).list();
        return Result.success("success", list);
    }
}
