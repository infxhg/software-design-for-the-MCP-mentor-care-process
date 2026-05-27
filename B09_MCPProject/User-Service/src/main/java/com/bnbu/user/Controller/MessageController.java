package com.bnbu.user.Controller;


import com.bnbu.user.Common.OperationLogActions;
import com.bnbu.user.DTO.Result;
import com.bnbu.user.DTO.SendMessageDTO;
import com.bnbu.user.Entity.Message;

import com.bnbu.user.Service.MessageService;
import com.bnbu.user.Service.OperationLogService;
import com.bnbu.user.Service.UserServiceIterface;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardOpenOption;
import java.util.List;

@RestController
@RequestMapping("/api/message")
@PreAuthorize("hasAuthority('message:communicate') or hasAuthority('ROLE_ADMIN')")
public class MessageController {

    private static final String LOG_PATH = "/Users/houshuoran/IdeaProjects/B09/.cursor/debug-6b255a.log";

    @Autowired
    private MessageService messageService;

    @Autowired
    private OperationLogService operationLogService;

    @Autowired
    private UserServiceIterface userService;

    private static String jsonEscape(String s) {
        if (s == null) return "";
        return s.replace("\\", "\\\\").replace("\"", "\\\"").replace("\n", "\\n").replace("\r", "\\r");
    }

    private static void debugNdjson(String runId, String hypothesisId, String location, String message, String dataJson) {
        try {
            long ts = System.currentTimeMillis();
            String payload = "{\"sessionId\":\"6b255a\",\"runId\":\"" + jsonEscape(runId)
                    + "\",\"hypothesisId\":\"" + jsonEscape(hypothesisId)
                    + "\",\"location\":\"" + jsonEscape(location)
                    + "\",\"message\":\"" + jsonEscape(message)
                    + "\",\"data\":" + (dataJson == null ? "{}" : dataJson)
                    + ",\"timestamp\":" + ts + "}\n";
            Files.writeString(Path.of(LOG_PATH), payload, StandardCharsets.UTF_8,
                    StandardOpenOption.CREATE, StandardOpenOption.APPEND);
        } catch (IOException ignored) {
            // Never block main API flow due to debug logging failure.
        }
    }

    /**
     * 1. 发送消息 (支持单发/群发)
     * POST /api/message/send
     */
    @PostMapping("/send")
    public Result sendMessage(
            @RequestHeader("X-User-Id") String senderId, // 💡 完美享受网关透传的福利！
            @RequestBody SendMessageDTO dto) {

        try {

            if (dto == null) {
                return Result.error("请求体不能为空");
            }
            if (dto.getRecipientIds() == null || dto.getRecipientIds().isEmpty()) {
                return Result.error("收件人不能为空");
            }
            if (dto.getContent() == null || dto.getContent().trim().isEmpty()) {
                return Result.error("消息内容不能为空");
            }

            // #region debug log sendMessage
            debugNdjson(
                    "repro1",
                    "H1_endpoint_vs_permissions_sendMessage",
                    "MessageController.java:sendMessage",
                    "entered",
                    "{\"senderId\":\"" + jsonEscape(senderId)
                            + "\",\"recipientCount\":" + dto.getRecipientIds().size()
                            + ",\"firstRecipient\":\"" + jsonEscape(dto.getRecipientIds().get(0)) + "\"}"
            );
            // #endregion

            messageService.sendMessage(senderId, dto.getRecipientIds(), dto.getContent());
            String username = senderId;
            try {
                com.bnbu.user.Entity.User u = userService.getUserById(senderId);
                if (u != null && u.getUsername() != null && !u.getUsername().isBlank()) {
                    username = u.getUsername().trim();
                }
            } catch (Exception ignored) {
                // fall back to senderId
            }
            operationLogService.record(senderId, username, OperationLogActions.SEND_MESSAGE,
                    "recipientCount=" + dto.getRecipientIds().size()
                            + ", firstRecipient=" + dto.getRecipientIds().get(0)
                            + ", contentLen=" + dto.getContent().trim().length());

            // #region debug log sendMessage operation-log
            debugNdjson(
                    "repro1",
                    "H8_student_send_message_operation_log",
                    "MessageController.java:sendMessage",
                    "operationLogRecorded",
                    "{\"userId\":\"" + jsonEscape(senderId)
                            + "\",\"username\":\"" + jsonEscape(username)
                            + "\",\"action\":\"" + jsonEscape(OperationLogActions.SEND_MESSAGE)
                            + "\",\"recipientCount\":" + dto.getRecipientIds().size()
                            + "}"
            );
            // #endregion

            return Result.success("success",null);

        } catch (Exception e) {

            e.printStackTrace();
            return Result.error("发送消息失败: " + e.getMessage());
        }
    }

    /**
     * 2. 发送内部系统通知
     * POST /api/message/send-internal
     */
    @PostMapping("/send-internal")
    @PreAuthorize("hasAuthority('ROLE_MENTOR') or hasAuthority('ROLE_COORDINATOR') or hasAuthority('ROLE_ADMIN')")
    public Result sendInternalMessage(
            @RequestHeader("X-User-Id") String senderId,
            @RequestBody SendMessageDTO dto) {

        // #region debug log sendInternalMessage
        debugNdjson(
                "repro1",
                "H1_endpoint_vs_permissions_sendInternalMessage",
                "MessageController.java:sendInternalMessage",
                "entered",
                "{\"senderId\":\"" + jsonEscape(senderId)
                        + "\",\"recipientCount\":" + (dto != null && dto.getRecipientIds() != null ? dto.getRecipientIds().size() : 0)
                        + ",\"internalCaseId\":\"" + (dto != null ? jsonEscape(dto.getInternalCaseId()) : "") + "\"}"
        );
        // #endregion

        messageService.sendInternalMessage(senderId, dto.getRecipientIds(), dto.getInternalCaseId());
        operationLogService.record(senderId, senderId, OperationLogActions.SEND_INTERNAL_MESSAGE,
                "recipientCount=" + (dto.getRecipientIds() != null ? dto.getRecipientIds().size() : 0)
                        + ", caseId=" + (dto.getInternalCaseId() != null ? dto.getInternalCaseId() : ""));
        return Result.success();
    }

    /**
     * 3. 获取我的未读消息总数
     * GET /api/message/unread-count
     */
    @GetMapping("/unread-count")
    public Result getUnreadCount(
            @RequestHeader("X-User-Id") String userId) { // 依然是直接拿网关塞进来的 ID

        Integer count = messageService.getUnreadMessageNumber(userId);
        return Result.success("Success",count);
    }

    /**
     * 4. 获取我的消息列表 (带阅读状态)
     * GET /api/message/list
     */
    @GetMapping("/list")
    public Result getMessageList(
            @RequestHeader("X-User-Id") String userId) {

        // #region debug log message list
        debugNdjson(
                "repro1",
                "H3_retrieval_mismatch_inbox_list",
                "MessageController.java:getMessageList",
                "entered",
                "{\"userId\":\"" + jsonEscape(userId) + "\"}"
        );
        // #endregion

        List<Message> list = messageService.getAllUserMessage(userId);
        operationLogService.record(userId, userId, OperationLogActions.VIEW_MESSAGE_LIST,
                "count=" + (list != null ? list.size() : 0));
        return Result.success("success",list);
    }

    /**
     * 5. 查看单条消息详情 (同时标记为已读)
     * GET /api/message/{messageId}
     */
    @GetMapping("/{messageId}")
    public Result getMessageDetail(
            @PathVariable("messageId") Long messageId,
            @RequestHeader("X-User-Id") String userId) {

        try {
            Message message = messageService.getOneMessage(messageId, userId);
            operationLogService.record(userId, userId, OperationLogActions.VIEW_MESSAGE_DETAIL,
                    "messageId=" + messageId);
            return Result.success("success",message);
        } catch (RuntimeException e) {
            // 捕获我们在 Service 里写的防越权异常
            return Result.error(e.getMessage());
        }
    }
}