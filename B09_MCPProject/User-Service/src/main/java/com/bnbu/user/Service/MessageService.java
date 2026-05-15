package com.bnbu.user.Service;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.conditions.update.LambdaUpdateWrapper;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.bnbu.user.Entity.Message;
import com.bnbu.user.Entity.MessageRecipient;
import com.bnbu.user.Mapper.MessageMapper;
import com.bnbu.user.Mapper.MessageRecipientMapper;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Service

public class MessageService extends ServiceImpl<MessageMapper, Message> implements MessageServiceInterface {

    @Autowired
    private MessageMapper messageMapper;

    @Autowired
    private MessageRecipientMapper messageRecipientMapper;

    @Override
    @Transactional(rollbackFor = Exception.class)
    public void sendMessage(String senderId, List<String> recipientIds, String content) {
        if (recipientIds == null || recipientIds.isEmpty()) {
            return;
        }

        Message msg = new Message();
        msg.setSenderId(senderId);
        msg.setContent(content);
        msg.setCreateTime(LocalDateTime.now());

        messageMapper.insert(msg);
        Long generatedMessageId = msg.getId();

        for (String receiverId : recipientIds) {
            MessageRecipient recipient = new MessageRecipient();
            recipient.setMessageId(generatedMessageId);
            recipient.setReceiverId(receiverId);
            recipient.setIsRead(0);
            messageRecipientMapper.insert(recipient);
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
        // 假设你在 Mapper 里写的连表 SQL 返回的就是 List<Message>
        return messageMapper.selectUserMessages(userId);
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public Message getOneMessage(Long messageId, String userId) {

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

        return messageMapper.selectById(messageId);
    }
}