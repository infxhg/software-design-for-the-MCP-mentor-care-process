package com.bnbu.user.Controller;


import com.bnbu.user.DTO.Result;
import com.bnbu.user.DTO.SendMessageDTO;
import com.bnbu.user.Entity.Message;

import com.bnbu.user.Service.MessageService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/message")
public class MessageController {

    @Autowired
    private MessageService messageService;

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

            // 2. 调用 Service
            messageService.sendMessage(senderId, dto.getRecipientIds(), dto.getContent());

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
    public Result sendInternalMessage(
            @RequestHeader("X-User-Id") String senderId,
            @RequestBody SendMessageDTO dto) {

        messageService.sendInternalMessage(senderId, dto.getRecipientIds(), dto.getInternalCaseId());
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

        List<Message> list = messageService.getAllUserMessage(userId);
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
            return Result.success("success",message);
        } catch (RuntimeException e) {
            // 捕获我们在 Service 里写的防越权异常
            return Result.error(e.getMessage());
        }
    }
}