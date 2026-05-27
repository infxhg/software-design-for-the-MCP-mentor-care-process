package com.bnbu.user.Service;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.conditions.update.LambdaUpdateWrapper;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.bnbu.user.Entity.Message;
import com.bnbu.user.Entity.MessageRecipient;
import com.bnbu.user.Entity.User;
import com.bnbu.user.Mapper.MessageMapper;
import com.bnbu.user.Mapper.MessageRecipientMapper;
import com.bnbu.user.Utils.JavaMailUtils.MailService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.IOException;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardOpenOption;

@Slf4j
@Service
public class MessageService extends ServiceImpl<MessageMapper, Message> implements MessageServiceInterface {

    private static final String LOG_PATH = "/Users/houshuoran/IdeaProjects/B09/.cursor/debug-6b255a.log";

    @Autowired
    private MessageMapper messageMapper;

    @Autowired
    private MessageRecipientMapper messageRecipientMapper;

    @Autowired
    private UserServiceIterface userService;

    @Autowired
    private MailService mailService;

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

    @Override
    @Transactional(rollbackFor = Exception.class)
    public void sendMessage(String senderId, List<String> recipientIds, String content) {
        if (recipientIds == null || recipientIds.isEmpty()) {
            return;
        }

        // #region debug log sendMessage internals
        debugNdjson(
                "repro1",
                "H2_db_or_input_failure_sendMessage",
                "MessageService.java:sendMessage",
                "entered",
                "{\"senderId\":\"" + jsonEscape(senderId)
                        + "\",\"recipientCount\":" + recipientIds.size()
                        + ",\"contentLen\":" + (content == null ? 0 : content.length())
                        + "}"
        );
        // #endregion

        Message msg = new Message();
        msg.setSenderId(senderId);
        msg.setContent(content);
        msg.setCreateTime(LocalDateTime.now());

        messageMapper.insert(msg);
        Long generatedMessageId = msg.getId();

        // #region debug log sendMessage after message insert
        debugNdjson(
                "repro1",
                "H2_db_or_input_failure_sendMessage",
                "MessageService.java:sendMessage",
                "messageInserted",
                "{\"messageId\":" + (generatedMessageId == null ? "null" : generatedMessageId)
                        + ",\"senderId\":\"" + jsonEscape(senderId) + "\"}"
        );
        // #endregion

        int idx = 0;
        for (String receiverId : recipientIds) {
            MessageRecipient recipient = new MessageRecipient();
            recipient.setMessageId(generatedMessageId);
            recipient.setReceiverId(receiverId);
            recipient.setIsRead(0);
            try {
                if (idx == 0) {
                    debugNdjson(
                            "repro1",
                            "H4_recipientId_value_length",
                            "MessageService.java:sendMessage",
                            "recipientBeforeInsert",
                            "{\"receiverId\":\"" + jsonEscape(receiverId)
                                    + "\",\"receiverIdLen\":" + (receiverId == null ? 0 : receiverId.length()) + "}"
                    );
                }
                messageRecipientMapper.insert(recipient);
            } catch (Exception e) {
                debugNdjson(
                        "repro1",
                        "H2_db_or_input_failure_sendMessage",
                        "MessageService.java:sendMessage",
                        "recipientInsertException",
                        "{\"receiverId\":\"" + jsonEscape(receiverId)
                                + "\",\"error\":\"" + jsonEscape(e.getMessage()) + "\"}"
                );
                throw e;
            }

            // 站内消息写库后，同步发送邮件通知（失败不阻断主流程）
            sendEmailNotification(receiverId, content);
            idx++;
        }

        debugNdjson(
                "repro1",
                "H2_db_or_input_failure_sendMessage",
                "MessageService.java:sendMessage",
                "done",
                "{\"messageId\":" + (generatedMessageId == null ? "null" : generatedMessageId) + "}"
        );
    }

    /**
     * 向收件人发送邮件副本；查不到邮箱或发送失败均静默处理，不影响站内消息的正常写入。
     */
    private void sendEmailNotification(String receiverId, String messageContent) {
        try {
            User receiver = userService.getUserById(receiverId);
            if (receiver == null || receiver.getEmail() == null || receiver.getEmail().isBlank()) {
                return;
            }
            String subject = "[BNBU MCS] You have a new message";
            String body = "Dear " + (receiver.getRealName() != null ? receiver.getRealName() : receiver.getUsername()) + ",\n\n"
                    + "You have received a new message on the MCS system:\n\n"
                    + "──────────────────────────────\n"
                    + messageContent + "\n"
                    + "──────────────────────────────\n\n"
                    + "Please log in to the MCS system to view and reply.\n\n"
                    + "Best regards,\nBNBU MCS System";
            mailService.sendNotificationMail(receiver.getEmail(), subject, body);
        } catch (Exception e) {
            log.warn("Email notification failed for recipient {}: {}", receiverId, e.getMessage());
        }
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public void sendInternalMessage(String senderId, List<String> recipientIds, String internalCaseID) {
        String formattedContent = String.format("【系统通知】您有一个新的任务，Case ID: %s。请及时处理。", internalCaseID);
        this.sendMessage(senderId, recipientIds, formattedContent);
    }

    @Override
    public Integer getUnreadMessageNumber(String userId) {
        LambdaQueryWrapper<MessageRecipient> queryWrapper = new LambdaQueryWrapper<>();
        queryWrapper.eq(MessageRecipient::getReceiverId, userId)
                .eq(MessageRecipient::getIsRead, 0);
        return Math.toIntExact(messageRecipientMapper.selectCount(queryWrapper));
    }

    @Override
    public List<Message> getAllUserMessage(String userId) {
        Map<Long, Message> merged = new LinkedHashMap<>();

        List<Message> inbox = messageMapper.selectInboxMessages(userId);
        if (inbox != null) {
            for (Message msg : inbox) {
                enrichRecipients(msg);
                merged.put(msg.getId(), msg);
            }
        }

        List<Message> sent = messageMapper.selectSentMessages(userId);
        if (sent != null) {
            for (Message msg : sent) {
                enrichRecipients(msg);
                if (msg.getIsRead() == null) {
                    msg.setIsRead(1);
                }
                merged.putIfAbsent(msg.getId(), msg);
            }
        }

        List<Message> all = new ArrayList<>(merged.values());
        all.sort(Comparator.comparing(
                Message::getCreateTime,
                Comparator.nullsLast(Comparator.reverseOrder())));
        return all;
    }

    private void enrichRecipients(Message msg) {
        if (msg == null || msg.getId() == null) {
            return;
        }
        List<String> receiverIds = messageRecipientMapper.selectReceiverIdsByMessageId(msg.getId());
        if (receiverIds != null && !receiverIds.isEmpty()) {
            msg.setRecipientIds(receiverIds);
        }
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public Message getOneMessage(Long messageId, String userId) {

        Message message = messageMapper.selectById(messageId);
        if (message == null) {
            throw new RuntimeException("无权查看该消息或消息不存在！");
        }

        if (userId != null && userId.equals(message.getSenderId())) {
            enrichRecipients(message);
            return message;
        }

        LambdaQueryWrapper<MessageRecipient> queryWrapper = new LambdaQueryWrapper<>();
        queryWrapper.eq(MessageRecipient::getMessageId, messageId)
                .eq(MessageRecipient::getReceiverId, userId);
        MessageRecipient recipient = messageRecipientMapper.selectOne(queryWrapper);

        if (recipient == null) {
            throw new RuntimeException("无权查看该消息或消息不存在！");
        }

        if (recipient.getIsRead() == 0) {
            LambdaUpdateWrapper<MessageRecipient> updateWrapper = new LambdaUpdateWrapper<>();
            updateWrapper.eq(MessageRecipient::getId, recipient.getId())
                    .set(MessageRecipient::getIsRead, 1)
                    .set(MessageRecipient::getReadTime, LocalDateTime.now());
            messageRecipientMapper.update(null, updateWrapper);
        }

        enrichRecipients(message);
        return message;
    }
}